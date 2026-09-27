/**
 * PromptVault Universal Insert Engine
 * Inserts text into any input field on any webpage.
 * Supports: textarea, input, contenteditable
 * Compatible with: React, Vue, Gmail, Notion, LinkedIn, etc.
 */

// Idempotency guard: check window property (survives re-injection)
if (typeof window.PromptVaultUniversalInsert === 'undefined') {
  window.PromptVaultUniversalInsert = (() => {
  const TOAST_DURATION = 2500;

  /**
   * Get the currently active/focused element.
   * Handles Shadow DOM and nested active elements.
   */
  function getActiveElement() {
    let el = document.activeElement;
    if (!el) return null;

    // Traverse Shadow DOM
    while (el && el.shadowRoot && el.shadowRoot.activeElement) {
      el = el.shadowRoot.activeElement;
    }

    return el;
  }

  /**
   * Find any visible input element on the page (fallback).
   */
  function findVisibleInput() {
    const selectors = [
      'textarea:not([hidden]):not([style*="display: none"])',
      'input[type="text"]:not([hidden])',
      'input[type="search"]:not([hidden])',
      '[contenteditable="true"]:not([hidden])',
      '[role="textbox"]:not([hidden])',
      'iframe', // Gmail uses iframes
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (isVisible(el)) return el;
      }
    }

    return null;
  }

  /**
   * Check if an element is visible.
   */
  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  /**
   * Insert text into a contenteditable element.
   */
  function insertIntoContentEditable(element, text) {
    element.focus();

    // Try execCommand first (best compatibility)
    if (document.execCommand) {
      // Clear existing content if user wants to replace
      // (keep existing behavior: append at cursor)
      document.execCommand('insertText', false, text);
      return;
    }

    // Fallback: Selection API
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  /**
   * Insert text into a textarea or input element.
   * Handles React/Vue controlled components by dispatching proper events.
   */
  function insertIntoInput(element, text) {
    element.focus();

    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value || '';

    // Insert text at cursor position
    const newValue = value.substring(0, start) + text + value.substring(end);

    // For React/Vue: use native setter to bypass controlled component issues
    const nativeSetter = Object.getOwnPropertyDescriptor(
      element.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeSetter) {
      nativeSetter.call(element, newValue);
    } else {
      element.value = newValue;
    }

    // Move cursor to end of inserted text
    const newCursorPos = start + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos);

    // Dispatch events to trigger React/Vue state updates
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Insert text into an iframe (e.g., Gmail compose).
   * Note: only works for same-origin iframes.
   */
  function insertIntoIframe(iframe, text) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (!doc) return false;

      const activeEl = doc.activeElement;
      if (activeEl && (activeEl.isContentEditable || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
        if (activeEl.isContentEditable) {
          insertIntoContentEditable(activeEl, text);
        } else {
          insertIntoInput(activeEl, text);
        }
        return true;
      }

      // Try to find an input in the iframe
      const inputs = doc.querySelectorAll('textarea, [contenteditable="true"], input[type="text"]');
      for (const input of inputs) {
        if (isVisible(input)) {
          if (input.isContentEditable) {
            insertIntoContentEditable(input, text);
          } else {
            insertIntoInput(input, text);
          }
          return true;
        }
      }
    } catch (e) {
      // Cross-origin iframe, cannot access
      console.warn('[PromptVault] Cannot access iframe:', e.message);
    }
    return false;
  }

  /**
   * Main entry point: insert text into the currently active element.
   * @returns {boolean} success
   */
  function insertText(text) {
    if (!text) return false;

    const activeEl = getActiveElement();

    if (!activeEl) {
      showToast(i18n.t('toast_no_input'), 'error');
      return false;
    }

    try {
      if (activeEl.tagName === 'IFRAME') {
        if (insertIntoIframe(activeEl, text)) {
          recordUsage(text);
          showToast(i18n.t('toast_inserted'));
          maybeAutoSend();
          return true;
        }
      }

      if (activeEl.isContentEditable) {
        insertIntoContentEditable(activeEl, text);
      } else if (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT') {
        insertIntoInput(activeEl, text);
      } else {
        // Element is not an input — try to find one
        const fallback = findVisibleInput();
        if (fallback) {
          if (fallback.isContentEditable) {
            insertIntoContentEditable(fallback, text);
          } else if (fallback.tagName === 'IFRAME') {
            insertIntoIframe(fallback, text);
          } else {
            insertIntoInput(fallback, text);
          }
        } else {
          showToast(i18n.t('toast_insert_failed'), 'error');
          return false;
        }
      }

      recordUsage(text);
      showToast(i18n.t('toast_inserted'));
      maybeAutoSend();
      return true;
    } catch (err) {
      console.error('[PromptVault] Insert failed:', err);
      showToast(i18n.t('toast_insert_failed'), 'error');
      return false;
    }
  }

  /**
   * Record prompt usage to Chrome storage.
   */
  function recordUsage(promptContent) {
    try {
      const usage = {
        content: promptContent.substring(0, 100),
        timestamp: Date.now(),
      };

      chrome.storage.local.get('promptvault_data', (data) => {
        const store = data.promptvault_data || {};
        if (!store.recentUsage) store.recentUsage = [];
        store.recentUsage.unshift(usage);
        store.recentUsage = store.recentUsage.slice(0, 20); // Keep last 20
        chrome.storage.local.set({ promptvault_data: store });
      });
    } catch (e) {
      console.warn('[PromptVault] Failed to record usage:', e);
    }
  }

  /**
   * ------------------------------------------------------------------
   * ChatGPT auto-send (opt-in)
   * ------------------------------------------------------------------
   * After a successful insert on chatgpt.com, click the composer's send
   * button. Disabled by default; enabled via settings.autoSendAfterInsert.
   */
  const CHATGPT_HOSTS = ['chatgpt.com', 'chat.openai.com'];

  function isChatGPTPage() {
    const host = location.hostname;
    return CHATGPT_HOSTS.some((h) => host === h || host.endsWith('.' + h));
  }

  // Ordered from most to least specific; the last one covers the current
  // composer button markup (class "size-token-button-composer").
  const SEND_BUTTON_SELECTORS = [
    '#composer-submit-button',
    'button[data-testid="send-button"]',
    'button[aria-label="Send message"]',
    'button[aria-label="发送消息"]',
    'form button[type="submit"]',
    // Current ChatGPT composer markup uses this utility class on the button.
    // Keep the `button` prefix so a wrapping div cannot be matched by accident.
    'button[class*="size-token-button-composer"]',
  ];

  function isButtonUsable(el) {
    if (!el || !isVisible(el)) return false;
    if (el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    return true;
  }

  function findSendButton() {
    for (const selector of SEND_BUTTON_SELECTORS) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch (e) {
        continue;
      }
      for (const el of nodes) {
        if (isButtonUsable(el)) return el;
      }
    }
    return null;
  }

  /**
   * Poll for the send button, then click it. React re-enables the button a
   * tick after the editor state updates, so a single synchronous lookup is
   * not enough. Gives up quietly after `timeout` ms.
   */
  function clickSendButtonWhenReady(timeout = 1500, interval = 100) {
    const startedAt = Date.now();

    const attempt = () => {
      const button = findSendButton();
      if (button) {
        button.click();
        return;
      }
      if (Date.now() - startedAt >= timeout) return;
      setTimeout(attempt, interval);
    };

    attempt();
  }

  /**
   * Read the opt-in flag and trigger the auto-send. Never throws: a failed
   * auto-send must not break the insert that already succeeded.
   */
  function maybeAutoSend() {
    if (!isChatGPTPage()) return;

    let hasAccess = false;
    try {
      hasAccess = Boolean(
        typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.local
      );
    } catch (e) {
      hasAccess = false;
    }
    if (!hasAccess) return;

    try {
      chrome.storage.local.get('promptvault_data', (data) => {
        if (chrome.runtime.lastError) return;
        const settings = data && data.promptvault_data && data.promptvault_data.settings;
        if (!settings || settings.autoSendAfterInsert !== true) return;
        clickSendButtonWhenReady();
      });
    } catch (e) {
      console.warn('[PromptVault] Auto-send skipped:', e);
    }
  }

  /**
   * Show a toast notification on the page.
   */
  function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.getElementById('pv-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'pv-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : '#10b981'};
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      animation: pv-toast-in 0.3s ease;
      pointer-events: none;
    `;

    // Add animation keyframes (once)
    if (!document.getElementById('pv-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'pv-toast-styles';
      style.textContent = `
        @keyframes pv-toast-in {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION);
  }

  /**
   * Copy text to clipboard (fallback for when insert fails).
   */
  function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => {
      showToast(i18n.t('toast_copied'));
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      showToast('已复制到剪贴板');
    });
  }

  // Public API
  return {
    insertText,
    getActiveElement,
    findVisibleInput,
    copyToClipboard,
    showToast,
  };
})();
} // end idempotency guard

// Ensure `UniversalInsert` is available as a global variable in the isolated world
// Using `var` so it survives re-injection and is accessible to other scripts
var UniversalInsert = window.PromptVaultUniversalInsert;
