/**
 * PromptVault Sidebar - Injected into AI websites
 * Supports: ChatGPT, Claude, Gemini, Grok
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
    insert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 5v14"></path><path d="M4 12h12"></path><path d="m9 7-5 5 5 5"></path></svg>',
  };

  // ========== Helpers ==========
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Extension context safety check
  let _contextInvalidWarned = false;
  function isExtContextValid() {
    try {
      return typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.storage?.local;
    } catch { return false; }
  }

  function warnExtInvalid(err) {
    if (_contextInvalidWarned) return;
    _contextInvalidWarned = true;
    console.warn('[PromptVault] Extension context lost. Please refresh the page to restore full functionality.', err);
  }

  // Safe storage get (returns default on error)
  function safeStorageGet(key, fallback) {
    return new Promise((resolve) => {
      if (!isExtContextValid()) { resolve(fallback); warnExtInvalid('context invalid'); return; }
      try {
        chrome.storage.local.get(key, (data) => {
          if (chrome.runtime.lastError) {
            warnExtInvalid(chrome.runtime.lastError);
            resolve(fallback);
          } else {
            resolve(data[key] || fallback);
          }
        });
      } catch (e) {
        warnExtInvalid(e); resolve(fallback);
      }
    });
  }

  // Safe storage set (silent fail on error)
  function safeStorageSet(data) {
    return new Promise((resolve) => {
      if (!isExtContextValid()) { resolve(false); warnExtInvalid('context invalid'); return; }
      try {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) warnExtInvalid(chrome.runtime.lastError);
          resolve(!chrome.runtime.lastError);
        });
      } catch (e) {
        warnExtInvalid(e); resolve(false);
      }
    });
  }

  // ========== State ==========
  let prompts = [];
  let folders = [];
  let recentUsage = [];
  let currentTab = 'all'; // 'all' | 'recent' | 'pinned'
  let searchQuery = '';
  let isDarkMode = false;
  let sidebarVisible = false;
  let draggedPromptId = null;
  let isDraggingSort = false;
  let suppressCardClickUntil = 0;
  let sidebarCloseOnOutside = true;
  let sidebarCardClickAction = 'copy';
  let togglePosition = null; // { x, y } or null (null = default right-middle)

  // ========== Website Detection ==========
  const WEBSITE = detectWebsite();

  function detectWebsite() {
    const host = window.location.hostname;
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return 'chatgpt';
    if (host.includes('claude.ai')) return 'claude';
    if (host.includes('gemini.google.com')) return 'gemini';
    if (host.includes('grok.x.ai') || host.includes('x.com')) return 'grok';
    return 'generic'; // Changed from 'unknown' to load on all sites
  }

  // ========== Input Box Detection ==========
  function findInputBox() {
    const selectors = {
      chatgpt: [
        'div#prompt-textarea',
        'div[contenteditable="true"][data-id]',
        'textarea#prompt-textarea',
      ],
      claude: [
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][data-virtualkeyboard]',
        'textarea',
      ],
      gemini: [
        'div[contenteditable="true"][aria-label*="prompt"]',
        'div[contenteditable="true"][aria-label*="message"]',
        'textarea',
      ],
      grok: [
        'textarea',
        'div[contenteditable="true"]',
      ],
    };

    const siteSelectors = selectors[WEBSITE] || selectors.grok;

    for (const selector of siteSelectors) {
      const el = document.querySelector(selector);
      if (el && isVisible(el)) return el;
    }

    // Fallback: find any visible contenteditable or textarea
    const fallbacks = [
      ...document.querySelectorAll('[contenteditable="true"]'),
      ...document.querySelectorAll('textarea'),
    ];

    for (const el of fallbacks) {
      if (isVisible(el)) return el;
    }

    return null;
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  // ========== Insert Prompt ==========
  async function insertPrompt(text, promptId) {
    const input = findInputBox();

    if (!input) {
      showToast(i18n.t('sidebar_no_input'), 'error');
      return false;
    }

    try {
      input.focus();

      if (input.isContentEditable) {
        insertIntoContentEditable(input, text);
      } else {
        insertIntoInput(input, text);
      }

      // Record usage (updates lastUsedAt so smart sort can put it on top)
      if (promptId) {
        recordUsage(promptId);
        // Re-render if autoTopAfterUse is enabled
        const settings = await getSettings();
        if (settings.autoTopAfterUse !== false) {
          renderSidebar();
        }
      }

      showToast(i18n.t('sidebar_inserted'));
      return true;
    } catch (err) {
      console.error('[PromptVault] Insert failed:', err);
      showToast(i18n.t('sidebar_insert_failed'), 'error');
      return false;
    }
  }

  function insertIntoContentEditable(element, text) {
    // Clear existing content
    element.textContent = '';

    // Insert text
    const textNode = document.createTextNode(text);
    element.appendChild(textNode);

    // Trigger input events
    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Move cursor to end
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function insertIntoInput(element, text) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, text);
    } else {
      element.value = text;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ========== Recent Usage ==========
  function recordUsage(promptId) {
    try {
      const usage = {
        promptId: promptId,
        timestamp: Date.now(),
      };

      recentUsage.unshift(usage);
      recentUsage = recentUsage.slice(0, 20); // Keep last 20

      // Update storage (recentUsage + usageCount + lastUsedAt)
      if (typeof Storage !== 'undefined' && Storage.addRecentUsage) {
        Storage.addRecentUsage(promptId).catch((error) => {
          console.warn('[PromptVault] Failed to record usage:', error);
        });
      } else {
        // Fallback: direct storage write (with context safety)
        safeStorageGet('promptvault_data', {}).then((store) => {
          if (!store.recentUsage) store.recentUsage = [];
          store.recentUsage = recentUsage;
          // Update prompt usageCount
          const prompt = store.prompts?.find(p => p.id === promptId);
          if (prompt) {
            prompt.usageCount = (prompt.usageCount || 0) + 1;
            prompt.lastUsedAt = Date.now();
          }
          safeStorageSet({ promptvault_data: store });
        });
      }
    } catch (e) {
      console.warn('[PromptVault] Failed to record usage:', e);
    }
  }

  // ========== Get Settings ==========
  function getSettings() {
    return safeStorageGet('promptvault_data', {}).then((store) => store.settings || {});
  }

  // ========== Toggle Position Persistence ==========
  async function saveTogglePosition(pos, mode) {
    try {
      const store = await safeStorageGet('promptvault_data', {});
      if (!store.settings) store.settings = {};
      store.settings.togglePosition = { x: pos.x, y: pos.y, mode: mode || 'dock' };
      return safeStorageSet({ promptvault_data: store });
    } catch (e) {
      warnExtInvalid(e);
      return false;
    }
  }

  async function loadTogglePosition() {
    try {
      const store = await safeStorageGet('promptvault_data', {});
      const pos = store.settings?.togglePosition;
      if (pos && typeof pos === 'object' && 'x' in pos && 'y' in pos) {
        return pos; // { x, y, mode? }
      }
      return null;
    } catch (e) {
      warnExtInvalid(e);
      return null;
    }
  }

  function syncSidebarThemeClass() {
    const sidebar = document.getElementById('pv-sidebar');
    const toggle = document.getElementById('pv-sidebar-toggle');
    if (sidebar) sidebar.classList.toggle('pv-dark', isDarkMode);
    if (toggle) toggle.classList.toggle('pv-dark', isDarkMode);
  }

  // ========== Toggle Drag ==========
  const SNAP_THRESHOLD = 80; // px from edge to trigger snap

  function updateToggleShape(toggle, mode) {
    // Remove all shape classes first
    toggle.classList.remove('pv-toggle-float', 'pv-docked-left', 'pv-docked-right');
    if (mode === 'float') {
      toggle.classList.add('pv-toggle-float');
    } else if (mode === 'dock-left') {
      toggle.classList.add('pv-docked-left');
    } else {
      // dock-right (default)
      toggle.classList.add('pv-docked-right');
    }
  }

  function initToggleDrag() {
    const toggle = document.getElementById('pv-sidebar-toggle');
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
      // Immediately switch to floating ball shape while dragging
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

      // Clamp to viewport
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
      const cx = rect.left + rect.width / 2; // center x

      // Decide snap: closer to left edge → dock left, closer to right → dock right
      const distLeft = cx;
      const distRight = window.innerWidth - cx;
      let mode;
      let finalX = rect.left;

      if (distLeft < SNAP_THRESHOLD || distRight < SNAP_THRESHOLD) {
        // Snap to nearest edge
        mode = distLeft <= distRight ? 'dock-left' : 'dock-right';
        // Animate shape + position
        toggle.style.transition = 'left 0.2s ease, right 0.2s ease, border-radius 0.2s ease, width 0.2s ease, height 0.2s ease';
        updateToggleShape(toggle, mode);
        if (mode === 'dock-left') {
          toggle.style.left = '0px';
          toggle.style.right = 'auto';
          finalX = 0;
        } else {
          toggle.style.left = 'auto';
          toggle.style.right = '0px';
          // Compute x for storage (right edge snapped)
          finalX = window.innerWidth - rect.width;
        }
      } else {
        mode = 'float';
        updateToggleShape(toggle, 'float');
        finalX = rect.left;
      }

      togglePosition = { x: finalX, y: rect.top };
      await saveTogglePosition(togglePosition, mode);
    };

    // Block click if it was a drag
    const onClick = (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false; // reset after blocking
      }
    };

    toggle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    toggle.addEventListener('click', onClick, true); // capture phase
  }

  function copyPrompt(prompt, card) {
    navigator.clipboard.writeText(prompt.content).then(async () => {
      if (card) {
        card.classList.add('pv-copied');
        // Show "copied" badge on the card
        const badge = document.createElement('div');
        badge.className = 'pv-copied-badge';
        badge.textContent = i18n.t('toast_copied') || '已复制';
        card.style.position = 'relative';
        card.appendChild(badge);
        // Record usage (updates lastUsedAt so smart sort can put it on top)
        if (prompt.id) {
          recordUsage(prompt.id);
          // Re-render if autoTopAfterUse is enabled
          const settings = await getSettings();
          if (settings.autoTopAfterUse !== false) {
            renderSidebar();
          }
        }
        // Remove visual feedback after 900ms
        setTimeout(() => {
          card.classList.remove('pv-copied');
          if (badge.parentNode) badge.remove();
        }, 900);
      } else if (prompt.id) {
        recordUsage(prompt.id);
      }
      showToast(i18n.t('sidebar_copied'));
    });
  }

  // ========== Format Time Ago ==========
  function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return days + (i18n.getLocale() === 'zh' ? '天前' : 'd ago');
    if (hours > 0) return hours + (i18n.getLocale() === 'zh' ? '小时前' : 'h ago');
    if (minutes > 0) return minutes + (i18n.getLocale() === 'zh' ? '分钟前' : 'm ago');
    return i18n.getLocale() === 'zh' ? '刚刚' : 'just now';
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
      syncSidebarThemeClass();

      if (document.getElementById('pv-sidebar') && sidebarVisible) {
        setSidebarVisible(true);
      }

      if (callback) callback();
    };

    if (typeof Storage !== 'undefined' && Storage.getAll) {
      Storage.getAll()
        .then(applyStore)
        .catch((error) => {
          console.warn('[PromptVault] Failed to load sidebar data:', error);
          applyStore({});
        });
      return;
    }

    try {
      safeStorageGet('promptvault_data', {}).then((store) => {
        applyStore(store);
      });
    } catch (error) {
      console.warn('[PromptVault] Failed to load sidebar data:', error);
      applyStore({});
    }
  }

  function getPromptUsageStats(prompt) {
    const stats = {
      count: prompt.usageCount || 0,
      lastUsed: prompt.lastUsedAt || 0,
    };

    recentUsage.forEach((usage) => {
      if (usage.promptId !== prompt.id) return;
      if (!prompt.usageCount) stats.count += 1;
      if ((usage.timestamp || 0) > stats.lastUsed) {
        stats.lastUsed = usage.timestamp;
      }
    });

    return stats;
  }

  function compareSmartPrompts(a, b, options = {}) {
    const pinnedFirst = options.pinnedFirst !== false;
    const customOrderFirst = options.customOrderFirst === true;

    if (pinnedFirst && Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }

    if (customOrderFirst) {
      const aHasOrder = Number.isFinite(a.sortOrder);
      const bHasOrder = Number.isFinite(b.sortOrder);
      if (aHasOrder && bHasOrder && a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
    }

    const aStats = getPromptUsageStats(a);
    const bStats = getPromptUsageStats(b);

    return (
      (bStats.lastUsed || 0) - (aStats.lastUsed || 0) ||
      (bStats.count || 0) - (aStats.count || 0) ||
      (b.updatedAt || 0) - (a.updatedAt || 0) ||
      (b.createdAt || 0) - (a.createdAt || 0) ||
      String(a.title || '').localeCompare(String(b.title || ''), i18n.getLocale())
    );
  }

  // ========== Render Sidebar ==========
  function renderSidebar() {
    const container = document.getElementById('pv-sidebar');
    if (!container) return;

    const listEl = container.querySelector('.pv-list');
    if (!listEl) return;

    let filteredPrompts = getFilteredPrompts();
    const canDragSort = currentTab === 'all' && !searchQuery.trim();

    if (filteredPrompts.length === 0) {
      listEl.innerHTML = renderEmptyState();
      return;
    }

    listEl.innerHTML = filteredPrompts
      .map(
        (prompt) => {
          const stats = getPromptUsageStats(prompt);
          const lastUsedText = stats.lastUsed > 0 ? formatTimeAgo(stats.lastUsed) : '';
          const usageText = stats.count > 0
            ? (i18n.getLocale() === 'zh'
              ? `使用 ${stats.count} 次${lastUsedText ? ' · ' + lastUsedText : ''}`
              : `Used ${stats.count} time${stats.count > 1 ? 's' : ''}${lastUsedText ? ' · ' + lastUsedText : ''}`)
            : '';

          // Resolve & translate folder name
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
      </div>
    `;
        }
      )
      .join('');

    // Bind events
    listEl.querySelectorAll('.pv-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.pv-card-actions')) return;
        if (card.querySelector('.pv-edit-form')) return; // skip if in edit mode
        if (isDraggingSort || Date.now() < suppressCardClickUntil) return;
        const promptId = card.dataset.promptId;
        const prompt = prompts.find((p) => p.id === promptId);
        if (prompt) {
          if (sidebarCardClickAction === 'insert') {
            insertPrompt(prompt.content, prompt.id);
          } else {
            copyPrompt(prompt, card);
          }
        }
      });
    });

    listEl.querySelectorAll('.pv-insert-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        const prompt = prompts.find((p) => p.id === promptId);
        if (prompt) {
          insertPrompt(prompt.content, prompt.id);
        }
      });
    });

    listEl.querySelectorAll('.pv-edit-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        showEditForm(promptId);
      });
    });

    listEl.querySelectorAll('.pv-pin-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        togglePin(promptId);
      });
    });

    listEl.querySelectorAll('.pv-del-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        showConfirmDialog(
          i18n.t('confirm_delete_prompt'),
          i18n.t('confirm_delete_prompt_msg'),
          () => deletePrompt(promptId)
        );
      });
    });

    if (canDragSort) {
      bindDragSort(listEl);
    }
  }

  function bindDragSort(listEl) {
    listEl.querySelectorAll('.pv-draggable-card').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        draggedPromptId = card.dataset.promptId;
        isDraggingSort = true;
        suppressCardClickUntil = Date.now() + 500;
        card.classList.add('pv-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedPromptId);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('pv-dragging');
        listEl.querySelectorAll('.pv-drag-over-top, .pv-drag-over-bottom').forEach((el) => {
          el.classList.remove('pv-drag-over-top', 'pv-drag-over-bottom');
        });
        draggedPromptId = null;
        suppressCardClickUntil = Date.now() + 300;
        setTimeout(() => {
          isDraggingSort = false;
        }, 300);
      });

      card.addEventListener('dragover', (e) => {
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

      card.addEventListener('drop', async (e) => {
        e.preventDefault();
        const sourceId = draggedPromptId || e.dataTransfer.getData('text/plain');
        const targetId = card.dataset.promptId;
        if (!sourceId || !targetId || sourceId === targetId) return;

        const rect = card.getBoundingClientRect();
        const dropAfter = e.clientY > rect.top + rect.height / 2;
        await reorderSidebarPrompts(sourceId, targetId, dropAfter);
      });
    });
  }

  async function reorderSidebarPrompts(sourceId, targetId, dropAfter) {
    const orderedIds = [...document.querySelectorAll('#pv-sidebar .pv-list .pv-card')]
      .map((card) => card.dataset.promptId)
      .filter(Boolean);
    const fromIndex = orderedIds.indexOf(sourceId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (fromIndex === -1 || targetIndex === -1) return;

    orderedIds.splice(fromIndex, 1);
    const adjustedTargetIndex = orderedIds.indexOf(targetId);
    orderedIds.splice(dropAfter ? adjustedTargetIndex + 1 : adjustedTargetIndex, 0, sourceId);

    try {
      if (typeof Storage !== 'undefined' && Storage.reorderPrompts) {
        await Storage.reorderPrompts(orderedIds);
      } else {
        const store = await safeStorageGet('promptvault_data', {});
        orderedIds.forEach((id, index) => {
          const prompt = store.prompts?.find((p) => p.id === id);
          if (prompt) prompt.sortOrder = index;
        });
        await safeStorageSet({ promptvault_data: store });
      }
    } catch (error) {
      console.warn('[PromptVault] Failed to reorder prompts:', error);
    }

    loadData(() => renderSidebar());
  }

  // ========== New Prompt Form ==========
  // ========== Edit Form ==========
  function showEditForm(promptId) {
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return;

    const card = document.querySelector(`.pv-card[data-prompt-id="${promptId}"]`);
    if (!card) return;

    card.classList.add('pv-editing');
    card.innerHTML = `
      <div class="pv-edit-form">
        <div class="pv-edit-row">
          <input type="text" class="pv-edit-title" value="${escapeHtml(prompt.title)}" placeholder="${i18n.t('placeholder_title')}">
        </div>
        <div class="pv-edit-row">
          <textarea class="pv-edit-content" placeholder="${i18n.t('placeholder_content')}">${escapeHtml(prompt.content)}</textarea>
        </div>
        <div class="pv-edit-actions">
          <button class="pv-edit-cancel-btn">${i18n.t('btn_cancel')}</button>
          <button class="pv-edit-save-btn">${i18n.t('btn_save')}</button>
        </div>
      </div>
    `;

    // Cancel
    card.querySelector('.pv-edit-cancel-btn').addEventListener('click', () => {
      renderSidebar();
    });

    // Save
    card.querySelector('.pv-edit-save-btn').addEventListener('click', () => {
      saveEdit(promptId);
    });
  }

  function saveEdit(promptId) {
    const card = document.querySelector(`.pv-card[data-prompt-id="${promptId}"]`);
    if (!card) return;

    const title = card.querySelector('.pv-edit-title').value.trim();
    const content = card.querySelector('.pv-edit-content').value.trim();
    if (!title) { showToast(i18n.t('placeholder_title') + ' ' + i18n.t('toast_error_folder_name'), 'error'); return; }

    safeStorageGet('promptvault_data', {}).then((store) => {
      const prompt = store.prompts?.find((p) => p.id === promptId);
      if (prompt) {
        prompt.title = title;
        prompt.content = content;
        prompt.updatedAt = Date.now();
        safeStorageSet({ promptvault_data: store }).then(() => {
          loadData(() => renderSidebar());
          showToast(i18n.t('toast_updated'));
        });
      }
    });
  }

  // ========== Delete Prompt ==========
  function deletePrompt(promptId) {
    safeStorageGet('promptvault_data', {}).then((store) => {
      if (!store.prompts) return;
      store.prompts = store.prompts.filter((p) => p.id !== promptId);
      safeStorageSet({ promptvault_data: store }).then(() => {
        loadData(() => renderSidebar());
        showToast(i18n.t('toast_deleted'));
      });
    });
  }

  // ========== Confirm Dialog ==========
  function showConfirmDialog(title, message, onConfirm) {
    // Remove existing dialog
    const existing = document.querySelector('.pv-confirm-overlay');
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
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.pv-confirm-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.pv-confirm-ok').addEventListener('click', () => {
      overlay.remove();
      onConfirm();
    });
  }

  function getFilteredPrompts() {
    let result = [...prompts];

    // Filter by tab
    if (currentTab === 'pinned') {
      result = result.filter((p) => p.pinned);
    } else if (currentTab === 'recent') {
      const recentIds = [...new Set(recentUsage.map((u) => u.promptId))];
      result = result.filter((p) => recentIds.includes(p.id) || (p.lastUsedAt || 0) > 0);
    }

    // Filter by search
    if (searchQuery) {
      if (typeof Storage !== 'undefined' && Storage.filterAndRankPrompts) {
        result = Storage.filterAndRankPrompts(result, searchQuery, { folders });
      } else {
        const q = searchQuery.toLowerCase();
        result = result.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.content.toLowerCase().includes(q)
        );
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
    const shortcut = isMac ? '⌘ + Shift + P' : 'Ctrl + Shift + P';

    // Helper: safe translate with fallback
    const _t = (key, fallback) => {
      const text = i18n.t(key);
      return (text && text !== key) ? text : fallback;
    };

    const messages = {
      all: {
        title: _t('empty_no_prompts', '暂无提示词'),
        hint: _t('empty_prompts_hint', '在扩展中创建你的第一个提示词'),
        showShortcut: true,
      },
      recent: {
        title: _t('sidebar_no_recent', '暂无最近使用'),
        hint: _t('sidebar_no_recent_hint', '使用提示词后会显示在这里'),
        showShortcut: false,
      },
      pinned: {
        title: _t('empty_no_pinned', '暂无置顶'),
        hint: _t('empty_pinned_hint', '将提示词置顶方便快速访问'),
        showShortcut: false,
      },
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
            <span>💡 ${i18n.getLocale() === 'zh' ? '小技巧' : 'Tip'}：</span>
            <span>${i18n.getLocale() === 'zh' ? '在任何网页按' : 'Press on any page'}：</span>
            <code>${shortcut}</code>
            <span>${i18n.getLocale() === 'zh' ? '即可快速打开' : 'to open PromptVault'}</span>
          </div>
        </div>` : `<p class="pv-empty-hint">${msg.hint}</p>`}
      </div>
    `;
  }

  // ========== Toggle Pin ==========
  function togglePin(promptId) {
    safeStorageGet('promptvault_data', {}).then((store) => {
      const prompt = store.prompts?.find((p) => p.id === promptId);
      if (prompt) {
        prompt.pinned = !prompt.pinned;
        safeStorageSet({ promptvault_data: store }).then(() => {
          loadData(() => renderSidebar());
        });
      }
    });
  }

  // ========== Toast ==========
  function showToast(message, type = 'success') {
    const existing = document.querySelectorAll('.pv-toast');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'pv-toast' + (type === 'error' ? ' pv-error' : '');
    toast.textContent = message;

    // Append to sidebar if visible, otherwise to body
    const sidebar = document.getElementById('pv-sidebar');
    if (sidebar && !sidebar.classList.contains('pv-hidden')) {
      sidebar.appendChild(toast);
    } else {
      document.body.appendChild(toast);
    }

    setTimeout(() => toast.remove(), TOAST_DURATION);
  }

  // ========== Build Sidebar DOM ==========
  function createSidebar() {
    // Toggle button
    const toggle = document.createElement('button');
    toggle.id = 'pv-sidebar-toggle';
    toggle.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
      </svg>
    `;
    toggle.addEventListener('click', toggleSidebar);
    document.body.appendChild(toggle);
    syncSidebarThemeClass();

    // Init toggle drag after append
    initToggleDrag();

    const overlay = document.createElement('div');
    overlay.id = 'pv-sidebar-overlay';
    overlay.className = 'pv-hidden';
    overlay.addEventListener('click', () => {
      if (sidebarCloseOnOutside) setSidebarVisible(false);
    });
    document.body.appendChild(overlay);

    // Sidebar container
    const sidebar = document.createElement('div');
    sidebar.id = 'pv-sidebar';
    sidebar.className = 'pv-hidden';
    sidebar.innerHTML = `
      <div class="pv-header">
        <div class="pv-header-left">
          <span class="pv-logo">PromptVault</span>
        </div>
        <div class="pv-header-actions">
          <button class="pv-icon-btn" id="pv-theme-toggle" title="${i18n.t('toggle_theme')}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button class="pv-icon-btn" id="pv-close-sidebar" title="${i18n.t('btn_close')}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="pv-search">
        <div class="pv-search-wrapper">
          <svg class="pv-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="pv-search-input" placeholder="${i18n.t('sidebar_search_placeholder')}">
        </div>
      </div>

      <div class="pv-tabs">
        <div class="pv-tabs-left">
          <button class="pv-tab pv-active" data-tab="all">${i18n.t('sidebar_all')}</button>
          <button class="pv-tab" data-tab="recent">${i18n.t('sidebar_recent')}</button>
          <button class="pv-tab" data-tab="pinned"><span class="pv-tab-icon">${ICONS.pin}</span>${i18n.t('tab_pinned') || '置顶'}</button>
        </div>
      </div>

      <div class="pv-list">
        <div class="pv-loading">
          <div class="pv-spinner"></div>
          ${i18n.t('sidebar_loading')}
        </div>
      </div>

      <div class="pv-sidebar-footer">
        <div class="pv-footer-shortcut" id="pv-footer-shortcut">
          <span class="pv-footer-hint">${i18n.getLocale() === 'zh' ? '快捷键打开' : 'Shortcut'}</span>
          <code class="pv-footer-kbd" id="pv-footer-kbd">Ctrl + Shift + P</code>
          <button class="pv-footer-copy" id="pv-copy-shortcut" title="${i18n.t('shortcut_copy') || 'Copy'}">${ICONS.copy}</button>
        </div>
      </div>
    `;

    document.body.appendChild(sidebar);

    // Apply dark mode
    syncSidebarThemeClass();

    // Bind events
    bindSidebarEvents();
  }

  // ========== Event Binding ==========
  function bindSidebarEvents() {
    const sidebar = document.getElementById('pv-sidebar');
    if (!sidebar) return;

    // Search
    const searchInput = sidebar.querySelector('.pv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderSidebar();
      });
    }

    // Tabs
    sidebar.querySelectorAll('.pv-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        sidebar.querySelectorAll('.pv-tab').forEach((t) => t.classList.remove('pv-active'));
        tab.classList.add('pv-active');
        currentTab = tab.dataset.tab;
        renderSidebar();
      });
    });

    // Theme toggle
    const themeBtn = document.getElementById('pv-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        syncSidebarThemeClass();
        safeStorageGet('promptvault_data', {}).then((store) => {
          if (!store.settings) store.settings = {};
          store.settings.darkMode = isDarkMode;
          safeStorageSet({ promptvault_data: store });
        });
      });
    }

    // Close sidebar
    const closeBtn = document.getElementById('pv-close-sidebar');
    if (closeBtn) {
      closeBtn.addEventListener('click', toggleSidebar);
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('keydown', handleSidebarKeydown);

    // Footer shortcut copy
    const copyBtn = document.getElementById('pv-copy-shortcut');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const kbd = document.getElementById('pv-footer-kbd');
        if (kbd) {
          navigator.clipboard.writeText(kbd.textContent).then(() => {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = ICONS.check;
            setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 1500);
          });
        }
      });
    }

    // Update shortcut text based on platform
    const footerKbd = document.getElementById('pv-footer-kbd');
    if (footerKbd) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      footerKbd.textContent = isMac ? '⌘ + Shift + P' : 'Ctrl + Shift + P';
    }
  }

  function setSidebarVisible(visible) {
    const sidebar = document.getElementById('pv-sidebar');
    const toggle = document.getElementById('pv-sidebar-toggle');
    const overlay = document.getElementById('pv-sidebar-overlay');
    if (!sidebar || !toggle) return;

    sidebarVisible = visible;
    sidebar.classList.toggle('pv-hidden', !visible);
    if (overlay) overlay.classList.toggle('pv-hidden', !visible || !sidebarCloseOnOutside);

    // Update toggle button visibility
    toggle.style.display = visible ? 'none' : 'flex';
  }

  function toggleSidebar() {
    setSidebarVisible(!sidebarVisible);
  }

  function handleSidebarKeydown(e) {
    if (e.key !== 'Escape' || !sidebarVisible) return;
    if (document.querySelector('.pv-confirm-overlay')) return;
    setSidebarVisible(false);
  }

  function handleOutsidePointerDown(e) {
    if (!sidebarVisible || !sidebarCloseOnOutside) return;

    const sidebar = document.getElementById('pv-sidebar');
    const toggle = document.getElementById('pv-sidebar-toggle');
    if (!sidebar) return;

    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    const clickedInsideSidebar = path.length ? path.includes(sidebar) : sidebar.contains(e.target);
    const clickedToggle = toggle && (path.length ? path.includes(toggle) : toggle.contains(e.target));
    const clickedConfirm = path.some?.((node) => node?.classList?.contains('pv-confirm-overlay'));

    if (clickedInsideSidebar || clickedToggle || clickedConfirm) return;

    e.preventDefault();
    e.stopPropagation();
    setSidebarVisible(false);
  }

  // ========== Utilities ==========
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== Storage Listener ==========
  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.promptvault_data) {
        loadData(() => renderSidebar());
      }
    });
  }

  // ========== Init ==========
  async function init() {
    // Load on all websites (generic or known AI sites)
    console.log(`[PromptVault] Injecting sidebar for ${WEBSITE}`);

    // Load i18n
    if (typeof i18n !== 'undefined') {
      await i18n.loadLocale();
    }

    // Check enableSidebar setting
    let settings = {};
    try {
      const data = typeof Storage !== 'undefined' && Storage.getAll
        ? await Storage.getAll()
        : await safeStorageGet('promptvault_data', {});
      settings = data.settings || {};
    } catch (error) {
      console.warn('[PromptVault] Failed to load sidebar settings:', error);
    }
    if (settings.enableSidebar === false) {
      console.log('[PromptVault] Sidebar disabled by setting');
      return;
    }

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('sidebar.css');
    document.head.appendChild(link);

    // Create sidebar (starts hidden)
    createSidebar();

    // Load saved toggle position
    const savedPos = await loadTogglePosition();
    const t = document.getElementById('pv-sidebar-toggle');
    if (savedPos && t) {
      togglePosition = { x: savedPos.x, y: savedPos.y };
      const mode = savedPos.mode || 'dock-right'; // default for backward compat
      updateToggleShape(t, mode);
      if (mode === 'dock-left') {
        t.style.left = '0px';
        t.style.right = 'auto';
        t.style.top = savedPos.y + 'px';
        t.style.transform = 'none';
      } else if (mode === 'dock-right') {
        t.style.right = '0px';
        t.style.left = 'auto';
        t.style.top = savedPos.y + 'px';
        t.style.transform = 'none';
      } else {
        // float mode
        t.style.left = savedPos.x + 'px';
        t.style.top = savedPos.y + 'px';
        t.style.right = 'auto';
        t.style.transform = 'none';
      }
    }

    // Load data and render
    loadData(() => {
      renderSidebar();
      // Sidebar defaults to hidden; user clicks toggle button to show
    });

    // Listen for storage changes (e.g., enableSidebar toggled)
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.promptvault_data) {
        const newSettings = (changes.promptvault_data.newValue || {}).settings || {};
        const oldSettings = (changes.promptvault_data.oldValue || {}).settings || {};
        if (newSettings.enableSidebar !== oldSettings.enableSidebar) {
          // Reload page to apply sidebar setting change
          if (newSettings.enableSidebar === false) {
            const sidebar = document.getElementById('pv-sidebar');
            const toggle = document.getElementById('pv-sidebar-toggle');
            const overlay = document.getElementById('pv-sidebar-overlay');
            if (sidebar) sidebar.remove();
            if (toggle) toggle.remove();
            if (overlay) overlay.remove();
          }
        }
        loadData(() => renderSidebar());
      }
    });
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global API for floating button / command palette
  window.PromptVault = {
    toggleSidebar,
    insertPrompt,
    showSidebar: () => {
      setSidebarVisible(true);
    },
    hideSidebar: () => {
      setSidebarVisible(false);
    },
  };
})();
