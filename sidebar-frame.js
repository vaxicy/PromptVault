/**
 * PromptVault Sidebar Frame Logic
 * Runs INSIDE an <iframe> (chrome-extension:// context).
 * Has full access to chrome.storage API; isolated from host page React/CSP.
 * Communicates with parent (host page) via postMessage for insert operations.
 */

(function () {
  'use strict';

  // ========== Config ==========
  const SIDEBAR_WIDTH = 360;
  const TOAST_DURATION = 2000;
  const ICONS = {
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    insert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="3" x2="12" y2="15"></line><polyline points="6 10 12 16 18 10"></polyline><line x1="5" y1="20" x2="19" y2="20"></line></svg>',
  };

  // ========== State ==========
  let prompts = [];
  let folders = [];
  let recentUsage = [];
  let currentTab = 'all';
  let searchQuery = '';
  let isDarkMode = false;
  let sidebarVisible = false;
  let draggedPromptId = null;
  let isDraggingSort = false;
  let suppressCardClickUntil = 0;
  let sidebarCloseOnOutside = true;
  let sidebarCardClickAction = 'copy';
  let togglePosition = null;

  // ========== DOM Helpers (direct — no Shadow DOM) ==========
  function $(id) { return document.getElementById(id); }
  function $q(sel) { return document.querySelector(sel); }
  function $qa(sel) { return document.querySelectorAll(sel); }

  // ========== PostMessage to Parent (for insert) ==========
  function postToParent(type, data) {
    try {
      window.parent.postMessage({ source: 'promptvault-sidebar', type, ...data }, '*');
    } catch (e) {
      console.warn('[PromptVault Sidebar] postMessage failed:', e);
      showFrameToast(i18n.t('sidebar_insert_failed') || 'Insert failed', 'error');
    }
  }

  // ========== Receive Messages from Parent ==========
  window.addEventListener('message', (event) => {
    if (event.data?.source !== 'promptvault-content') return;
    switch (event.data.type) {
      case 'toggle':
        toggleSidebar();
        break;
      case 'theme-changed':
        if (typeof event.data.darkMode === 'boolean' && event.data.darkMode !== isDarkMode) {
          isDarkMode = event.data.darkMode;
          syncThemeClass();
        }
        break;
    }
  });

  // ========== i18n Apply to Static Text ==========
  function applyStaticI18n() {
    // Header
    const logo = $q('.pv-logo');
    if (logo) logo.textContent = 'PromptVault'; // brand name stays as-is

    // Theme button title
    const themeBtn = $('pv-theme-toggle');
    if (themeBtn) themeBtn.title = i18n.t('toggle_theme');

    // Close button title
    const closeBtn = $('pv-close-sidebar');
    if (closeBtn) closeBtn.title = i18n.t('btn_close');

    // Search placeholder
    const searchInput = $q('.pv-search-input');
    if (searchInput) searchInput.placeholder = i18n.t('sidebar_search_placeholder');

    // Tabs
    $qa('.pv-tab[data-tab="all"]')[0]?.textContent && ($qa('.pv-tab[data-tab="all"]')[0].textContent = i18n.t('sidebar_all'));
    $qa('.pv-tab[data-tab="recent"]')[0]?.textContent && ($qa('.pv-tab[data-tab="recent"]')[0].textContent = i18n.t('sidebar_recent'));
    const pinnedTab = $qa('.pv-tab[data-tab="pinned"]')[0];
    if (pinnedTab) {
      const iconSpan = pinnedTab.querySelector('.pv-tab-icon');
      if (iconSpan) iconSpan.innerHTML = ICONS.pin;
      pinnedTab.innerHTML = `<span class="pv-tab-icon">${ICONS.pin}</span>${i18n.t('tab_pinned')}`;
    }

    // Footer shortcut
    const footerHint = $q('.pv-footer-hint');
    if (footerHint) footerHint.textContent = i18n.getLocale() === 'zh' ? '\u5feb\u6377\u952e\u6253\u5f00' : 'Shortcut';

    const copyShortcutBtn = $('pv-copy-shortcut');
    if (copyShortcutBtn) copyShortcutBtn.title = i18n.t('shortcut_copy') || 'Copy';

    updatePlatformShortcutText();

    // Loading text
    const loadingText = $q('.pv-loading');
    if (loadingText) {
      const spinner = loadingText.querySelector('.pv-spinner');
      loadingText.textContent = '';
      if (spinner) loadingText.appendChild(spinner);
      loadingText.appendChild(document.createTextNode(i18n.t('sidebar_loading')));
    }

    // Re-render list if already loaded (for dynamic content)
    if (prompts.length > 0 || currentTab !== 'all') renderSidebar();
  }

  function updatePlatformShortcutText() {
    const kbd = $('pv-footer-kbd');
    if (kbd) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      kbd.textContent = isMac ? '\u2318 + Shift + P' : 'Ctrl + Shift + P';
    }
  }

  // ========== Theme ==========
  function syncThemeClass() {
    const sidebar = $('pv-sidebar');
    const toggle = $('pv-sidebar-toggle');
    if (sidebar) sidebar.classList.toggle('pv-dark', isDarkMode);
    if (toggle) toggle.classList.toggle('pv-dark', isDarkMode);
  }

  // ========== Toggle Position Persistence ==========
  async function saveTogglePosition(pos, mode) {
    try {
      const store = await Storage.getAll();
      if (!store.settings) store.settings = {};
      store.settings.togglePosition = { x: pos.x, y: pos.y, mode: mode || 'dock' };
      await Storage.set({ promptvault_data: store });
    } catch (e) {
      console.warn('[PromptVault] Failed to save toggle position:', e);
    }
  }

  async function loadTogglePosition() {
    try {
      const store = await Storage.getAll();
      const pos = store.settings?.togglePosition;
      if (pos && typeof pos === 'object' && 'x' in pos && 'y' in pos) return pos;
      return null;
    } catch (e) {
      console.warn('[PromptVault] Failed to load toggle position:', e);
      return null;
    }
  }

  // ========== Toggle Drag ==========
  const SNAP_THRESHOLD = 80;

  function updateToggleShape(toggle, mode) {
    toggle.classList.remove('pv-toggle-float', 'pv-docked-left', 'pv-docked-right');
    if (mode === 'float') toggle.classList.add('pv-toggle-float');
    else if (mode === 'dock-left') toggle.classList.add('pv-docked-left');
    else toggle.classList.add('pv-docked-right');
  }

  function initToggleDrag() {
    const toggle = $('pv-sidebar-toggle');
    if (!toggle) return;

    let isDragging = false;
    let hasMoved = false;
    let startX, startY, origX, origY;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = toggle.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      toggle.style.transition = 'none';
      toggle.style.cursor = 'grabbing';
      toggle.classList.add('pv-toggle-float');
      toggle.classList.remove('pv-docked-left', 'pv-docked-right');
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!hasMoved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      hasMoved = true;

      let newX = origX + dx;
      let newY = origY + dy;
      const maxX = window.innerWidth - toggle.offsetWidth;
      const maxY = window.innerHeight - toggle.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      toggle.style.left = newX + 'px';
      toggle.style.top = newY + 'px';
      toggle.style.right = 'auto';
      toggle.style.transform = 'none';
    };

    const onMouseUp = async () => {
      if (!isDragging) return;
      isDragging = false;
      toggle.style.transition = '';
      toggle.style.cursor = 'grab';
      if (!hasMoved) return;

      const rect = toggle.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const distLeft = cx;
      const distRight = window.innerWidth - cx;
      let mode;
      let finalX = rect.left;

      if (distLeft < SNAP_THRESHOLD || distRight < SNAP_THRESHOLD) {
        mode = distLeft <= distRight ? 'dock-left' : 'dock-right';
        toggle.style.transition = 'left 0.2s ease, right 0.2s ease, border-radius 0.2s ease, width 0.2s ease, height 0.2s ease';
        updateToggleShape(toggle, mode);
        if (mode === 'dock-left') { toggle.style.left = '0px'; toggle.style.right = 'auto'; finalX = 0; }
        else { toggle.style.left = 'auto'; toggle.style.right = '0px'; finalX = window.innerWidth - rect.width; }
      } else {
        mode = 'float';
        updateToggleShape(toggle, 'float');
        finalX = rect.left;
      }

      togglePosition = { x: finalX, y: rect.top };
      await saveTogglePosition(togglePosition, mode);
    };

    const onClick = (e) => {
      if (hasMoved) { e.preventDefault(); e.stopPropagation(); hasMoved = false; }
    };

    toggle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    toggle.addEventListener('click', onClick, true);
  }

  // ========== Insert Prompt (via postMessage to content script) ==========
  async function insertPrompt(text, promptId) {
    postToParent('insert', { text, promptId });
    // Record usage locally too
    if (promptId) {
      recordUsage(promptId);
      const settings = await getSettings();
      if (settings.autoTopAfterUse !== false) renderSidebar();
    }
    showFrameToast(i18n.t('sidebar_inserted'));
  }

  // ========== Copy Prompt ==========
  async function copyPrompt(prompt, card) {
    try {
      await navigator.clipboard.writeText(prompt.content);
      if (card) {
        card.classList.add('pv-copied');
        const badge = document.createElement('div');
        badge.className = 'pv-copied-badge';
        badge.textContent = i18n.t('toast_copied') || 'Copied';
        card.style.position = 'relative';
        card.appendChild(badge);
        if (prompt.id) {
          recordUsage(prompt.id);
          const settings = await getSettings();
          if (settings.autoTopAfterUse !== false) renderSidebar();
        }
        setTimeout(() => { card.classList.remove('pv-copied'); if (badge.parentNode) badge.remove(); }, 900);
      } else if (prompt.id) {
        recordUsage(prompt.id);
      }
      showFrameToast(i18n.t('sidebar_copied'));
    } catch (e) {
      console.warn('[PromptVault] Copy failed:', e);
    }
  }

  // ========== Recent Usage ==========
  function recordUsage(promptId) {
    const usage = { promptId, timestamp: Date.now() };
    recentUsage.unshift(usage);
    recentUsage = recentUsage.slice(0, 20);

    if (typeof Storage !== 'undefined' && Storage.addRecentUsage) {
      Storage.addRecentUsage(promptId).catch(() => {});
    } else {
      Storage.getAll().then((store) => {
        if (!store.recentUsage) store.recentUsage = [];
        store.recentUsage = recentUsage;
        const prompt = store.prompts?.find(p => p.id === promptId);
        if (prompt) { prompt.usageCount = (prompt.usageCount || 0) + 1; prompt.lastUsedAt = Date.now(); }
        Storage.set({ promptvault_data: store }).catch(() => {});
      }).catch(() => {});
    }
  }

  function getSettings() {
    return Storage.getAll().then(store => store.settings || {});
  }

  // ========== Format Time Ago ==========
  function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return days + (i18n.getLocale() === 'zh' ? '\u5929\u524d' : 'd ago');
    if (hours > 0) return hours + (i18n.getLocale() === 'zh' ? '\u5c0f\u65f6\u524d' : 'h ago');
    if (minutes > 0) return minutes + (i18n.getLocale() === 'zh' ? '\u5206\u949f\u524d' : 'm ago');
    return i18n.getLocale() === 'zh' ? '\u521a\u521a' : 'just now';
  }

  // ========== Escape HTML ==========
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== Load Data ==========
  function loadData(callback) {
    const applyStore = (store) => {
      prompts = store.prompts || [];
      folders = store.folders || [];
      recentUsage = (store.recentUsage || []).slice(0, 20);
      isDarkMode = store.settings?.darkMode || false;
      sidebarCloseOnOutside = store.settings?.sidebarCloseOnOutside !== false;
      sidebarCardClickAction = store.settings?.sidebarCardClickAction || 'copy';
      syncThemeClass();
      if (callback) callback();
    };

    if (typeof Storage !== 'undefined' && Storage.getAll) {
      Storage.getAll().then(applyStore).catch(() => applyStore({}));
    } else {
      applyStore({});
    }
  }

  // ========== Smart Sort ==========
  function getPromptUsageStats(prompt) {
    const stats = { count: prompt.usageCount || 0, lastUsed: prompt.lastUsedAt || 0 };
    recentUsage.forEach(u => {
      if (u.promptId !== prompt.id) return;
      if (!prompt.usageCount) stats.count += 1;
      if ((u.timestamp || 0) > stats.lastUsed) stats.lastUsed = u.timestamp;
    });
    return stats;
  }

  function compareSmartPrompts(a, b, options = {}) {
    const pinnedFirst = options.pinnedFirst !== false;
    const customOrderFirst = options.customOrderFirst === true;
    if (pinnedFirst && Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    if (customOrderFirst) {
      const aHas = Number.isFinite(a.sortOrder), bHas = Number.isFinite(b.sortOrder);
      if (aHas && bHas && a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      if (aHas !== bHas) return aHas ? -1 : 1;
    }
    const aS = getPromptUsageStats(a), bS = getPromptUsageStats(b);
    return (bS.lastUsed || 0) - (aS.lastUsed || 0)
      || (bS.count || 0) - (aS.count || 0)
      || (b.updatedAt || 0) - (a.updatedAt || 0)
      || (b.createdAt || 0) - (a.createdAt || 0)
      || String(a.title || '').localeCompare(String(b.title || ''), i18n.getLocale());
  }

  // ========== Get Filtered Prompts ==========
  function getFilteredPrompts() {
    let result = [...prompts];

    if (currentTab === 'pinned') result = result.filter(p => p.pinned);
    else if (currentTab === 'recent') {
      const recentIds = [...new Set(recentUsage.map(u => u.promptId))];
      result = result.filter(p => recentIds.includes(p.id) || (p.lastUsedAt || 0) > 0);
    }

    if (searchQuery) {
      if (typeof Storage.filterAndRankPrompts === 'function') {
        result = Storage.filterAndRankPrompts(result, searchQuery, { folders });
      } else {
        const q = searchQuery.toLowerCase();
        result = result.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
      }
    }

    result.sort((a, b) => compareSmartPrompts(a, b, {
      pinnedFirst: currentTab === 'all',
      customOrderFirst: currentTab === 'all' && !searchQuery.trim(),
    }));

    return result;
  }

  // ========== Empty State ==========
  function renderEmptyState() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? '\u2318 + Shift + P' : 'Ctrl + Shift + P';
    const _t = (key, fallback) => { const t = i18n.t(key); return (t && t !== key) ? t : fallback; };

    const messages = {
      all: { title: _t('empty_no_prompts', 'No prompts'), hint: _t('empty_prompts_hint', 'Create your first prompt in the extension'), showShortcut: true },
      recent: { title: _t('sidebar_no_recent', 'No recent usage'), hint: _t('sidebar_no_recent_hint', 'Used prompts will appear here'), showShortcut: false },
      pinned: { title: _t('empty_no_pinned', 'No pinned prompts'), hint: _t('empty_pinned_hint', 'Pin prompts for quick access'), showShortcut: false },
    };
    const msg = messages[currentTab] || messages.all;

    return `
      <div class="pv-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <p>${msg.title}</p>
        ${msg.showShortcut ? `
        <div class="pv-empty-shortcut">
          <p class="pv-empty-hint">${msg.hint}</p>
          <div class="pv-empty-tip">
            <span>\uD83D\uDCA1 ${i18n.getLocale() === 'zh' ? '\u5c0f\u6280\u5de7' : 'Tip'}:</span>
            <span>${i18n.getLocale() === 'zh' ? '\u5728\u4efb\u4f55\u7f51\u9875\u6309' : 'Press on any page'}:</span>
            <code>${shortcut}</code>
            <span>${i18n.getLocale() === 'zh' ? '\u5373\u53ef\u5feb\u901f\u6253\u5f00' : 'to open PromptVault'}</span>
          </div>
        </div>` : `<p class="pv-empty-hint">${msg.hint}</p>`}
      </div>`;
  }

  // ========== Toast ==========
  function showFrameToast(message, type = 'success') {
    $qa('.pv-toast').forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = 'pv-toast' + (type === 'error' ? ' pv-error' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), TOAST_DURATION);
  }

  // ========== Confirm Dialog ==========
  function showConfirmDialog(title, message, onConfirm) {
    const existing = $q('.pv-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'pv-confirm-overlay';
    overlay.innerHTML = `
      <div class="pv-confirm-dialog">
        <div class="pv-confirm-title">${escapeHtml(title)}</div>
        <div class="pv-confirm-message">${escapeHtml(message)}</div>
        <div class="pv-confirm-actions">
          <button class="pv-confirm-cancel">${i18n.t('btn_cancel')}</button>
          <button class="pv-confirm-ok">${i18n.t('btn_delete')}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('.pv-confirm-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.pv-confirm-ok').addEventListener('click', () => { overlay.remove(); onConfirm(); });
  }

  // ========== Pin Toggle ==========
  async function togglePin(promptId) {
    const store = await Storage.getAll();
    const prompt = store.prompts?.find(p => p.id === promptId);
    if (prompt) {
      prompt.pinned = !prompt.pinned;
      await Storage.set({ promptvault_data: store });
      loadData(() => renderSidebar());
    }
  }

  // ========== Delete Prompt ==========
  async function deletePrompt(promptId) {
    const store = await Storage.getAll();
    if (!store.prompts) return;
    store.prompts = store.prompts.filter(p => p.id !== promptId);
    await Storage.set({ promptvault_data: store });
    loadData(() => renderSidebar());
    showFrameToast(i18n.t('toast_deleted'));
  }

  // ========== Edit Form ==========
  function showEditForm(promptId) {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;
    const card = $q(`.pv-card[data-prompt-id="${promptId}"]`);
    if (!card) return;

    card.classList.add('pv-editing');
    card.innerHTML = `
      <div class="pv-edit-form">
        <div class="pv-edit-row"><input type="text" class="pv-edit-title" value="${escapeHtml(prompt.title)}" placeholder="${i18n.t('placeholder_title')}"></div>
        <div class="pv-edit-row"><textarea class="pv-edit-content" placeholder="${i18n.t('placeholder_content')}">${escapeHtml(prompt.content)}</textarea></div>
        <div class="pv-edit-actions">
          <button class="pv-edit-cancel-btn">${i18n.t('btn_cancel')}</button>
          <button class="pv-edit-save-btn">${i18n.t('btn_save')}</button>
        </div>
      </div>`;

    card.querySelector('.pv-edit-cancel-btn').addEventListener('click', () => renderSidebar());
    card.querySelector('.pv-edit-save-btn').addEventListener('click', () => saveEdit(promptId));
  }

  async function saveEdit(promptId) {
    const card = $q(`.pv-card[data-prompt-id="${promptId}"]`);
    if (!card) return;
    const title = card.querySelector('.pv-edit-title').value.trim();
    const content = card.querySelector('.pv-edit-content').value.trim();
    if (!title) { showFrameToast(i18n.t('placeholder_title') + ' ' + i18n.t('toast_error_folder_name'), 'error'); return; }

    const store = await Storage.getAll();
    const prompt = store.prompts?.find(p => p.id === promptId);
    if (prompt) {
      prompt.title = title; prompt.content = content; prompt.updatedAt = Date.now();
      await Storage.set({ promptvault_data: store });
      loadData(() => renderSidebar());
      showFrameToast(i18n.t('toast_updated'));
    }
  }

  // ========== Drag Sort ==========
  function bindDragSort(listEl) {
    listEl.querySelectorAll('.pv-draggable-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        draggedPromptId = card.dataset.promptId;
        isDraggingSort = true;
        suppressCardClickUntil = Date.now() + 500;
        card.classList.add('pv-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedPromptId);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('pv-dragging');
        listEl.querySelectorAll('.pv-drag-over-top, .pv-drag-over-bottom').forEach(el =>
          el.classList.remove('pv-drag-over-top', 'pv-drag-over-bottom'));
        draggedPromptId = null;
        suppressCardClickUntil = Date.now() + 300;
        setTimeout(() => { isDraggingSort = false; }, 300);
      });

      card.addEventListener('dragover', e => {
        e.preventDefault();
        if (!draggedPromptId || card.dataset.promptId === draggedPromptId) return;
        const rect = card.getBoundingClientRect();
        const isAfter = e.clientY > rect.top + rect.height / 2;
        card.classList.toggle('pv-drag-over-top', !isAfter);
        card.classList.toggle('pv-drag-over-bottom', isAfter);
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('pv-drag-over-top', 'pv-drag-over-bottom');
      });

      card.addEventListener('drop', async e => {
        e.preventDefault();
        const sourceId = draggedPromptId || e.dataTransfer.getData('text/plain');
        const targetId = card.dataset.promptId;
        if (!sourceId || !targetId || sourceId === targetId) return;
        const rect = card.getBoundingClientRect();
        const dropAfter = e.clientY > rect.top + rect.height / 2;
        await reorderPrompts(sourceId, targetId, dropAfter);
      });
    });
  }

  async function reorderPrompts(sourceId, targetId, dropAfter) {
    const orderedIds = [...$qa('#pv-sidebar .pv-list .pv-card')]
      .map(card => card.dataset.promptId).filter(Boolean);
    const fromIdx = orderedIds.indexOf(sourceId), targetIdx = orderedIds.indexOf(targetId);
    if (fromIdx === -1 || targetIdx === -1) return;

    orderedIds.splice(fromIdx, 1);
    const adjustedIdx = orderedIds.indexOf(targetId);
    orderedIds.splice(dropAfter ? adjustedIdx + 1 : adjustedIdx, 0, sourceId);

    if (Storage.reorderPrompts) {
      await Storage.reorderPrompts(orderedIds);
    } else {
      const store = await Storage.getAll();
      orderedIds.forEach((id, idx) => { const p = store.prompts?.find(pr => pr.id === id); if (p) p.sortOrder = idx; });
      await Storage.set({ promptvault_data: store });
    }
    loadData(() => renderSidebar());
  }

  // ========== Render ==========
  function renderSidebar() {
    const container = $('pv-sidebar');
    if (!container) return;
    const listEl = container.querySelector('.pv-list');
    if (!listEl) return;

    let filtered = getFilteredPrompts();
    const canDragSort = currentTab === 'all' && !searchQuery.trim();

    if (filtered.length === 0) { listEl.innerHTML = renderEmptyState(); return; }

    listEl.innerHTML = filtered.map(prompt => {
      const stats = getPromptUsageStats(prompt);
      const lastUsedText = stats.lastUsed > 0 ? formatTimeAgo(stats.lastUsed) : '';
      const usageText = stats.count > 0
        ? (i18n.getLocale() === 'zh'
          ? `\u4f7f\u7528 ${stats.count} \u6b21${lastUsedText ? ' \u00b7 ' + lastUsedText : ''}`
          : `Used ${stats.count} time${stats.count > 1 ? 's' : ''}${lastUsedText ? ' \u00b7 ' + lastUsedText : ''}`)
        : '';

      let folderDisplay = '';
      if (prompt.folder) {
        const matchedFolder = folders.find(f => f.id === prompt.folder);
        folderDisplay = (matchedFolder && matchedFolder.id !== 'default')
          ? escapeHtml(matchedFolder.name)
          : i18n.t('folder_uncategorized');
      }

      return `
    <div class="pv-card ${canDragSort ? 'pv-draggable-card' : ''}" data-prompt-id="${prompt.id}" draggable="${canDragSort ? 'true' : 'false'}">
      <div class="pv-card-title">
        <span>${escapeHtml(prompt.title)}</span>
        <div class="pv-card-actions">
          <button class="pv-card-action-btn pv-insert-btn" data-prompt-id="${prompt.id}" title="${i18n.t('btn_insert')}">${ICONS.insert}</button>
          <button class="pv-card-action-btn pv-edit-btn" data-prompt-id="${prompt.id}" title="${i18n.t('btn_edit')}">${ICONS.edit}</button>
          <button class="pv-card-action-btn pv-pin-btn ${prompt.pinned ? 'pv-pinned' : ''}" data-prompt-id="${prompt.id}" title="${i18n.t('btn_pin')}">${ICONS.pin}</button>
          <button class="pv-card-action-btn pv-del-btn" data-prompt-id="${prompt.id}" title="${i18n.t('btn_delete')}">${ICONS.trash}</button>
        </div>
      </div>
      <div class="pv-card-content">${escapeHtml(prompt.content)}</div>
      <div class="pv-card-meta">
        ${folderDisplay ? `<span class="pv-card-folder">${folderDisplay}</span>` : ''}
        ${usageText ? `<span class="pv-card-usage">${usageText}</span>` : ''}
      </div>
    </div>`;
    }).join('');

    // Bind events
    listEl.querySelectorAll('.pv-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.pv-card-actions')) return;
        if (card.querySelector('.pv-edit-form')) return;
        if (isDraggingSort || Date.now() < suppressCardClickUntil) return;
        const pid = card.dataset.promptId;
        const prompt = prompts.find(p => p.id === pid);
        if (prompt) {
          if (sidebarCardClickAction === 'insert') insertPrompt(prompt.content, pid);
          else copyPrompt(prompt, card);
        }
      });
    });

    listEl.querySelectorAll('.pv-insert-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const pid = btn.dataset.promptId;
        const p = prompts.find(pr => pr.id === pid);
        if (p) insertPrompt(p.content, pid);
      });
    });

    listEl.querySelectorAll('.pv-edit-btn').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); showEditForm(btn.dataset.promptId); });
    });

    listEl.querySelectorAll('.pv-pin-btn').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); togglePin(btn.dataset.promptId); });
    });

    listEl.querySelectorAll('.pv-del-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showConfirmDialog(i18n.t('confirm_delete_prompt'), i18n.t('confirm_delete_prompt_msg'),
          () => deletePrompt(btn.dataset.promptId));
      });
    });

    if (canDragSort) bindDragSort(listEl);
  }

  // ========== Visibility ==========
  function setSidebarVisible(visible) {
    const sidebar = $('pv-sidebar');
    const toggle = $('pv-sidebar-toggle');
    const overlay = $('pv-sidebar-overlay');
    if (!sidebar || !toggle) return;

    sidebarVisible = visible;
    sidebar.classList.toggle('pv-hidden', !visible);
    if (overlay) overlay.classList.toggle('pv-hidden', !visible || !sidebarCloseOnOutside);
    toggle.style.display = visible ? 'none' : 'flex';
  }

  function toggleSidebar() { setSidebarVisible(!sidebarVisible); }

  // ========== Event Binding ==========
  function bindEvents() {
    const sidebar = $('pv-sidebar');
    if (!sidebar) return;

    // Toggle click
    const toggle = $('pv-sidebar-toggle');
    if (toggle) toggle.addEventListener('click', toggleSidebar);

    // Overlay click
    const overlay = $('pv-sidebar-overlay');
    if (overlay) overlay.addEventListener('click', () => { if (sidebarCloseOnOutside) setSidebarVisible(false); });

    // Search
    const searchInput = $q('.pv-search-input');
    if (searchInput) searchInput.addEventListener('input', e => { searchQuery = e.target.value; renderSidebar(); });

    // Tabs
    sidebar.querySelectorAll('.pv-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        sidebar.querySelectorAll('.pv-tab').forEach(t => t.classList.remove('pv-active'));
        tab.classList.add('pv-active');
        currentTab = tab.dataset.tab;
        renderSidebar();
      });
    });

    // Theme toggle
    const themeBtn = $('pv-theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', async () => {
      isDarkMode = !isDarkMode;
      syncThemeClass();
      const store = await Storage.getAll();
      if (!store.settings) store.settings = {};
      store.settings.darkMode = isDarkMode;
      await Storage.set({ promptvault_data: store });
    });

    // Close
    const closeBtn = $('pv-close-sidebar');
    if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);

    // Esc to close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && sidebarVisible && !$q('.pv-confirm-overlay')) setSidebarVisible(false);
    });

    // Footer shortcut copy
    const copyBtn = $('pv-copy-shortcut');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const kbd = $('pv-footer-kbd');
      if (kbd) {
        navigator.clipboard.writeText(kbd.textContent).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = ICONS.check;
          setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 1500);
        });
      }
    });

    updatePlatformShortcutText();

    // Init drag
    initToggleDrag();
  }

  // ========== Storage Listener ==========
  function setupStorageListener() {
    chrome.storage.onChanged.addListener(changes => {
      if (changes.promptvault_data) loadData(() => renderSidebar());
    });
  }

  // ========== Init ==========
  async function init() {
    // Wait for Storage and i18n modules to be available (loaded by script tags in HTML)
    if (typeof i18n !== 'undefined') await i18n.loadLocale();

    // Check enableSidebar setting
    try {
      const data = await Storage.getAll();
      const settings = data.settings || {};
      if (settings.enableSidebar === false) {
        console.log('[PromptVault Sidebar] Disabled by setting');
        // Tell parent we're disabled so it can remove the iframe
        postToParent('disabled', {});
        return;
      }
    } catch (err) {
      console.warn('[PromptVault Sidebar] Failed to load settings:', err);
    }

    // Restore toggle position
    const savedPos = await loadTogglePosition();
    const t = $('pv-sidebar-toggle');
    if (savedPos && t) {
      togglePosition = { x: savedPos.x, y: savedPos.y };
      const mode = savedPos.mode || 'dock-right';
      updateToggleShape(t, mode);
      if (mode === 'dock-left') { t.style.left = '0px'; t.style.right = 'auto'; t.style.top = savedPos.y + 'px'; t.style.transform = 'none'; }
      else if (mode === 'dock-right') { t.style.right = '0px'; t.style.left = 'auto'; t.style.top = savedPos.y + 'px'; t.style.transform = 'none'; }
      else { t.style.left = savedPos.x + 'px'; t.style.top = savedPos.y + 'px'; t.style.right = 'auto'; t.style.transform = 'none'; }
    }

    // Bind all events
    bindEvents();

    // Apply i18n
    applyStaticI18n();

    // Load data & render
    loadData(() => renderSidebar());

    // Listen for storage changes
    setupStorageListener();

    // Notify parent that we're ready
    postToParent('ready', {});

    console.log('[PromptVault Sidebar] Iframe initialized successfully');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
