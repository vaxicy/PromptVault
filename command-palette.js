/**
 * PromptVault Command Palette
 * Quick prompt access via Ctrl+Shift+P (like VSCode/Raycast)
 * Works on all web pages.
 */

(function () {
  'use strict';

  const PALETTE_ID = 'pv-command-palette';
  let isOpen = false;
  let allPrompts = [];
  let allFolders = [];
  let filteredPrompts = [];
  let selectedIndex = 0;
  let paletteColors = null;

  // ========== Inject Styles ==========
  function injectStyles() {
    if (document.getElementById('pv-cmd-toast-style')) return;
    const style = document.createElement('style');
    style.id = 'pv-cmd-toast-style';
    style.textContent = `
      .pv-cmd-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #1a1a2e;
        color: #e0e0e0;
        padding: 12px 20px;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 2147483647;
        opacity: 0;
        transition: all 0.25s ease;
        pointer-events: none;
      }
      .pv-cmd-toast-show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .pv-cmd-toast-icon {
        font-size: 18px;
      }
      .pv-cmd-toast-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .pv-cmd-toast-title {
        font-weight: 600;
        color: #ffffff;
      }
      .pv-cmd-toast-text {
        font-size: 12px;
        color: #a0a0a0;
      }
      .pv-cmd-toast-text code {
        background: rgba(255,255,255,0.12);
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  // ========== Theme Detection ==========
  function getThemeColors() {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      return {
        overlayBg: 'rgba(0, 0, 0, 0.5)',
        containerBg: '#1e1e2e',
        borderColor: '#313244',
        textColor: '#cdd6f4',
        textMuted: '#6c7086',
        accentColor: '#89b4fa',
        selectedBg: '#313244',
        pinColor: '#f9e2af',
      };
    } else {
      return {
        overlayBg: 'rgba(0, 0, 0, 0.3)',
        containerBg: '#ffffff',
        borderColor: '#e5e7eb',
        textColor: '#1a1a1a',
        textMuted: '#6e6e73',
        accentColor: '#4A90E2',
        selectedBg: '#f0f0f5',
        pinColor: '#f59e0b',
      };
    }
  }

  // ========== Load Prompts ==========
  function loadPrompts(callback) {
    if (typeof Storage !== 'undefined') {
      Storage.getAll().then((data) => {
        allPrompts = data.prompts || [];
        allFolders = data.folders || [];
        if (callback) callback();
      });
    } else {
      chrome.storage.local.get('promptvault_data', (data) => {
        const store = data.promptvault_data || {};
        allPrompts = store.prompts || [];
        allFolders = store.folders || [];
        if (callback) callback();
      });
    }
  }

  // ========== Create Palette DOM ==========
  function createPalette() {
    if (document.getElementById(PALETTE_ID)) return;

    paletteColors = getThemeColors();

    const overlay = document.createElement('div');
    overlay.id = PALETTE_ID;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: ${paletteColors.overlayBg};
      z-index: 2147483647;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;

    const c = paletteColors;
    overlay.innerHTML = `
      <div class="pv-palette-container" style="
        width: 600px;
        max-width: 90vw;
        background: ${c.containerBg};
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        transform: translateY(-20px);
        transition: transform 0.15s ease;
      ">
        <div class="pv-palette-search" style="
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid ${c.borderColor};
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c.textMuted}" stroke-width="2" style="flex-shrink: 0;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="pv-palette-input" placeholder="${i18n.t('cmd_search_placeholder') || '搜索提示词...'}"
            style="
              flex: 1;
              background: none;
              border: none;
              outline: none;
              color: ${c.textColor};
              font-size: 16px;
              margin-left: 12px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
        </div>
        <div class="pv-palette-tabs" style="
          display: flex;
          padding: 0 16px;
          border-bottom: 1px solid ${c.borderColor};
          gap: 4px;
        ">
          <button class="pv-palette-tab active" data-tab="all" style="
            padding: 8px 12px;
            background: none;
            border: none;
            color: ${c.textColor};
            font-size: 13px;
            cursor: pointer;
            border-bottom: 2px solid ${c.accentColor};
            outline: none;
          ">${i18n.t('cmd_all') || '所有'}</button>
          <button class="pv-palette-tab" data-tab="pinned" style="
            padding: 8px 12px;
            background: none;
            border: none;
            color: ${c.textMuted};
            font-size: 13px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            outline: none;
          ">📌 ${i18n.t('tab_pinned') || 'Pinned'}</button>
          <button class="pv-palette-tab" data-tab="recent" style="
            padding: 8px 12px;
            background: none;
            border: none;
            color: ${c.textMuted};
            font-size: 13px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            outline: none;
          ">${i18n.t('cmd_recent') || '最近'}</button>
        </div>
        <div class="pv-palette-list" style="
          max-height: 360px;
          overflow-y: auto;
        "></div>
        <div class="pv-palette-footer" style="
          padding: 8px 16px;
          border-top: 1px solid ${c.borderColor};
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: ${c.textMuted};
        ">
          <span>↑↓ ${i18n.t('cmd_nav') || '导航'}</span>
          <span>Enter ${i18n.t('cmd_insert') || '插入'}</span>
          <span>Esc ${i18n.t('cmd_close') || '关闭'}</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Click overlay to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePalette();
    });

    // Bind events
    bindPaletteEvents(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.querySelector('.pv-palette-container').style.transform = 'translateY(0)';
    });
  }

  // ========== Bind Palette Events ==========
  function bindPaletteEvents(overlay) {
    const input = overlay.querySelector('.pv-palette-input');
    const list = overlay.querySelector('.pv-palette-list');
    const c = paletteColors;
    let currentTab = 'all';

    // Search input
    input.addEventListener('input', () => {
      filterPrompts(currentTab, input.value);
      renderList(list);
      selectedIndex = 0;
      updateSelection(list);
    });

    // Tabs
    overlay.querySelectorAll('.pv-palette-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.pv-palette-tab').forEach((t) => {
          t.classList.remove('active');
          t.style.color = c.textMuted;
          t.style.borderBottomColor = 'transparent';
        });
        tab.classList.add('active');
        tab.style.color = c.textColor;
        tab.style.borderBottomColor = c.accentColor;
        currentTab = tab.dataset.tab;
        filterPrompts(currentTab, input.value);
        renderList(list);
        selectedIndex = 0;
        updateSelection(list);
      });
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('.pv-palette-item');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(list);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(list);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          const promptId = items[selectedIndex].dataset.id;
          insertPromptById(promptId);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
      }
    });

    // Focus input
    setTimeout(() => input.focus(), 50);
  }

  // ========== Filter Prompts ==========
  function filterPrompts(tab, query) {
    let result = [...allPrompts];

    // Filter by tab
    if (tab === 'pinned') {
      result = result.filter((p) => p.pinned);
    } else if (tab === 'recent') {
      // Sort by updatedAt
      result = result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    // Filter by search query
    if (query) {
      if (typeof Storage !== 'undefined' && Storage.filterAndRankPrompts) {
        result = Storage.filterAndRankPrompts(result, query, { folders: allFolders });
      } else {
        const q = query.toLowerCase();
        result = result.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.content.toLowerCase().includes(q) ||
            (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
        );
        result = sortPromptsSmart(result);
      }
    }

    filteredPrompts = result;
  }

  // ========== Smart Sort ==========
  function sortPromptsSmart(prompts) {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;

    return prompts.sort((a, b) => {
      // 1. Pinned first
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      // 2. Recently used (within 7 days)
      const aRecent = (a.lastUsedAt || 0) > weekAgo ? 1 : 0;
      const bRecent = (b.lastUsedAt || 0) > weekAgo ? 1 : 0;
      if (aRecent !== bRecent) return bRecent - aRecent;
      // 3. Most used
      if ((b.usageCount || 0) !== (a.usageCount || 0)) return (b.usageCount || 0) - (a.usageCount || 0);
      // 4. Most recently updated
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  // ========== Render List ==========
  function renderList(listEl) {
    const c = paletteColors;

    if (filteredPrompts.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 24px; text-align: center; color: ${c.textMuted}; font-size: 14px;">
          ${i18n.t('cmd_no_prompts') || '暂无提示词'}
        </div>
      `;
      return;
    }

    listEl.innerHTML = filteredPrompts
      .map(
        (prompt, idx) => `
      <div class="pv-palette-item ${idx === selectedIndex ? 'selected' : ''}" data-id="${prompt.id}" style="
        padding: 10px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: ${idx === selectedIndex ? c.selectedBg : 'transparent'};
        border-left: 3px solid ${idx === selectedIndex ? c.accentColor : 'transparent'};
      ">
        <div style="flex: 1; min-width: 0;">
          <div style="color: ${c.textColor}; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(prompt.title)}
          </div>
          <div style="color: ${c.textMuted}; font-size: 12px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(prompt.content.substring(0, 80))}${prompt.content.length > 80 ? '...' : ''}
          </div>
        </div>
        <div style="display: flex; gap: 4px; margin-left: 8px;">
          ${prompt.pinned ? '<span style="color: ' + c.pinColor + '; font-size: 14px;">📌</span>' : ''}
        </div>
      </div>
    `
      )
      .join('');

    // Click to insert
    listEl.querySelectorAll('.pv-palette-item').forEach((item) => {
      item.addEventListener('click', () => {
        insertPromptById(item.dataset.id);
      });

      item.addEventListener('mouseenter', () => {
        selectedIndex = [...listEl.querySelectorAll('.pv-palette-item')].indexOf(item);
        updateSelection(listEl);
      });
    });
  }

  // ========== Update Selection ==========
  function updateSelection(listEl) {
    const c = paletteColors;
    listEl.querySelectorAll('.pv-palette-item').forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.style.background = c.selectedBg;
        item.style.borderLeftColor = c.accentColor;
      } else {
        item.style.background = 'transparent';
        item.style.borderLeftColor = 'transparent';
      }
    });

    // Scroll into view
    const selected = listEl.querySelectorAll('.pv-palette-item')[selectedIndex];
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }

  // ========== Insert Prompt ==========
  function insertPromptById(promptId) {
    const prompt = allPrompts.find((p) => p.id === promptId);
    if (!prompt) return;

    // Use UniversalInsert if available
    if (window.UniversalInsert) {
      UniversalInsert.insertText(prompt.content);
    } else {
      // Fallback: send message to content script
      chrome.runtime.sendMessage({ action: 'insertPrompt', text: prompt.content });
    }

    // Record usage
    if (typeof Storage !== 'undefined') {
      Storage.addRecentUsage(prompt.id);
    }

    closePalette();
  }

  // ========== Open/Close ==========
  function openPalette() {
    if (isOpen) {
      closePalette();
      return;
    }

    isOpen = true;
    loadPrompts(() => {
      createPalette();
      filterPrompts('all', '');
      const list = document.querySelector(`#${PALETTE_ID} .pv-palette-list`);
      if (list) renderList(list);
    });

    // Show shortcut toast on first open
    const hasSeenToast = localStorage.getItem('pv_cmd_palette_toast_seen');
    if (!hasSeenToast) {
      setTimeout(() => {
        showShortcutToast();
        localStorage.setItem('pv_cmd_palette_toast_seen', 'true');
      }, 500);
    }
  }

  // ========== Show Shortcut Toast ==========
  function showShortcutToast() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? '⌘ + Shift + P' : 'Ctrl + Shift + P';

    const toast = document.createElement('div');
    toast.className = 'pv-cmd-toast';
    toast.innerHTML = `
      <div class="pv-cmd-toast-icon">🎉</div>
      <div class="pv-cmd-toast-body">
        <div class="pv-cmd-toast-title">${i18n.t('shortcut_toast_title') || '快捷键已启用'}</div>
        <div class="pv-cmd-toast-text">${(i18n.t('shortcut_toast_body') || '以后在任何网页按：')}<code>${shortcut}</code></div>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('pv-cmd-toast-show'), 10);
    setTimeout(() => {
      toast.classList.remove('pv-cmd-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function closePalette() {
    const overlay = document.getElementById(PALETTE_ID);
    if (!overlay) return;

    overlay.style.opacity = '0';
    overlay.querySelector('.pv-palette-container').style.transform = 'translateY(-20px)';
    setTimeout(() => {
      overlay.remove();
      isOpen = false;
    }, 150);
  }

  // ========== Utilities ==========
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== Listen for Messages ==========
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openCommandPalette') {
      openPalette();
      sendResponse({ success: true });
    }
  });

  // ========== Global Keyboard Shortcut ==========
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + P
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      openPalette();
    }
  });

  // Inject Toast styles
  injectStyles();

  // Expose global API
  window.PromptVaultCommandPalette = {
    open: openPalette,
    close: closePalette,
  };
})();
