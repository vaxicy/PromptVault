/**
 * PromptVault Sidebar — Content Script (iframe bridge)
 *
 * On ALL websites, this script injects a single <iframe> pointing to
 * sidebar-frame.html (an extension page running in its own origin).
 * The iframe is completely isolated from the host page's DOM / React /
 * CSP / Trusted Types, so it works reliably on ChatGPT, Claude, etc.
 *
 * Communication protocol:
 *   iframe → parent:  { source:'promptvault-sidebar', type, ...data }
 *   parent → iframe:  { source:'promptvault-content', type, ...data }
 */

(function () {
  'use strict';

  // ========== Config ==========
  const FRAME_ID = 'pv-sidebar-iframe';
  let frameEl = null;

  // ========== Website Detection ==========
  function detectWebsite() {
    const host = window.location.hostname;
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return 'chatgpt';
    if (host.includes('claude.ai')) return 'claude';
    if (host.includes('gemini.google.com')) return 'gemini';
    if (host.includes('grok.x.ai') || host.includes('x.com')) return 'grok';
    return 'generic';
  }

  const WEBSITE = detectWebsite();

  // Skip injection entirely on React SSR sites (ChatGPT, etc.)
  // These sites take over <html>/<body> via React hydration; ANY DOM node we
  // append triggers #418 hydration mismatch and/or gets removed by reconciliation.
  // On these sites, users rely on popup's "Insert" button instead.
  const REACT_SSR_HOSTS = ['chatgpt', 'claude']; // extend if needed
  const isReactSSR = REACT_SSR_HOSTS.some(h => WEBSITE === h || WEBSITE.includes(h));
  if (isReactSSR) {
    console.log(`[PromptVault] Skipping sidebar injection on ${WEBSITE} (React SSR site)`);
    // Exit early — don't create iframe, don't listen for messages, nothing.
    return;
  }

  // ========== Safe Storage (for settings check only) ==========
  let _contextInvalidWarned = false;
  function isExtContextValid() {
    try { return typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.storage?.local; }
    catch { return false; }
  }
  function safeStorageGet(key, fallback) {
    return new Promise(resolve => {
      if (!isExtContextValid()) { resolve(fallback); return; }
      try {
        chrome.storage.local.get(key, data => {
          if (chrome.runtime.lastError) resolve(fallback);
          else resolve(data[key] || fallback);
        });
      } catch (e) { resolve(fallback); }
    });
  }

  // ========== Create Iframe ==========
  function createSidebarIframe() {
    // Remove any existing iframe
    cleanup();

    frameEl = document.createElement('iframe');
    frameEl.id = FRAME_ID;
    frameEl.src = chrome.runtime.getURL('sidebar-frame.html');
    frameEl.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 0',
      'height: 0',
      'border: none',
      'z-index: 2147483647',
      'pointer-events: auto',
      // Allow iframe to expand beyond its 0×0 base via internal position:fixed
      'overflow: visible',
      // Transparent background so it doesn't block the page
      'background: transparent',
    ].join(';');

    document.documentElement.appendChild(frameEl);

    console.log(`[PromptVault] Injected sidebar iframe for ${WEBSITE}`);
  }

  function cleanup() {
    if (frameEl && frameEl.parentNode) {
      frameEl.remove();
    }
    frameEl = null;
  }

  // ========== Handle Messages from iframe ==========
  window.addEventListener('message', (event) => {
    // Only accept messages from our own iframe
    if (!frameEl || event.source !== frameEl.contentWindow) return;
    if (event.data?.source !== 'promptvault-sidebar') return;

    switch (event.data.type) {
      case 'insert': {
        handleInsert(event.data.text, event.data.promptId);
        break;
      }
      case 'ready': {
        console.log('[PromptVault] Sidebar iframe ready');
        break;
      }
      case 'disabled': {
        console.log('[PromptVault] Sidebar disabled by setting, removing iframe');
        cleanup();
        break;
      }
    }
  });

  // ========== Insert into Host Page ==========
  async function handleInsert(text, promptId) {
    // Use UniversalInsert if available (loaded before us in manifest order)
    if (typeof UniversalInsert !== 'undefined') {
      try {
        await UniversalInsert.insertText(text);
        return;
      } catch (e) {
        console.warn('[PromptVault] UniversalInsert failed, trying fallback:', e);
      }
    }

    // Fallback: find input box directly
    const input = findInputBox();
    if (!input) {
      sendToIframe('insert-result', { ok: false, error: 'No input found' });
      return;
    }

    try {
      input.focus();
      if (input.isContentEditable) {
        input.textContent = '';
        input.appendChild(document.createTextNode(text));
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;
        if (setter) setter.call(input, text);
        else input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sendToIframe('insert-result', { ok: true });
    } catch (err) {
      console.error('[PromptVault] Insert fallback failed:', err);
      sendToIframe('insert-result', { ok: false, error: err.message });
    }
  }

  // ========== Input Box Detection ==========
  function findInputBox() {
    const selectors = {
      chatgpt: ['div#prompt-textarea', 'div[contenteditable="true"][data-id]', 'textarea#prompt-textarea'],
      claude: ['div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"][data-virtualkeyboard]', 'textarea'],
      gemini: ['div[contenteditable="true"][aria-label*="prompt"]', 'div[contenteditable="true"][aria-label*="message"]', 'textarea'],
      grok: ['textarea', 'div[contenteditable="true"]'],
    };
    const siteSelectors = selectors[WEBSITE] || selectors.grok;
    for (const sel of siteSelectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }

    const fallbacks = [...document.querySelectorAll('[contenteditable="true"]'), ...document.querySelectorAll('textarea')];
    for (const el of fallbacks) {
      if (isVisible(el)) return el;
    }
    return null;
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }

  // ========== Send Message to iframe ==========
  function sendToIframe(type, data) {
    if (frameEl?.contentWindow) {
      try {
        frameEl.contentWindow.postMessage({ source: 'promptvault-content', type, ...data }, '*');
      } catch (e) {
        console.warn('[PromptVault] Failed to send message to iframe:', e);
      }
    }
  }

  // ========== Init ==========
  async function init() {
    console.log(`[PromptVault] Initializing sidebar iframe for ${WEBSITE}`);

    // Check enableSidebar setting
    try {
      const store = await safeStorageGet('promptvault_data', {});
      if ((store.settings || {}).enableSidebar === false) {
        console.log('[PromptVault] Sidebar disabled by setting');
        return;
      }
    } catch (error) {
      console.warn('[PromptVault] Failed to load sidebar settings:', error);
    }

    createSidebarIframe();

    // Listen for storage changes (if user toggles enableSidebar)
    chrome.storage.onChanged.addListener(changes => {
      if (changes.promptvault_data) {
        const newSettings = (changes.promptvault_data.newValue || {}).settings || {};
        const oldSettings = (changes.promptvault_data.oldValue || {}).settings || {};
        if (newSettings.enableSidebar === false && oldSettings.enableSidebar !== false) {
          cleanup();
        } else if (newSettings.enableSidebar !== false && oldSettings.enableSidebar === false) {
          createSidebarIframe();
        }
      }
    });
  }

  // Run init
  init();

})();
