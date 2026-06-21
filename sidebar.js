/**
 * PromptVault Sidebar - Injected into AI websites
 * Supports: ChatGPT, Claude, Gemini, Grok
 */

(function () {
  'use strict';

  // ========== Config ==========
  const SIDEBAR_WIDTH = 360;
  const TOAST_DURATION = 2000;

  // ========== Helpers ==========
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ========== State ==========
  let prompts = [];
  let folders = [];
  let tags = [];
  let recentUsage = [];
  let currentTab = 'all'; // 'all' | 'recent' | 'favorites'
  let searchQuery = '';
  let isDarkMode = false;
  let sidebarVisible = true;

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
  function insertPrompt(text, promptId) {
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

      // Record usage
      if (promptId) {
        recordUsage(promptId);
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

      chrome.storage.local.get('promptvault_data', (data) => {
        const store = data.promptvault_data || {};
        if (!store.recentUsage) store.recentUsage = [];
        store.recentUsage = recentUsage;
        chrome.storage.local.set({ promptvault_data: store });
      });
    } catch (e) {
      console.warn('[PromptVault] Failed to record usage:', e);
    }
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
    chrome.storage.local.get('promptvault_data', (data) => {
      const store = data.promptvault_data || {};
      prompts = store.prompts || [];
      folders = store.folders || [];
      tags = store.tags || [];
      recentUsage = (store.recentUsage || []).slice(0, 20);
      isDarkMode = store.settings?.darkMode || false;

      if (callback) callback();
    });
  }

  // ========== Render Sidebar ==========
  function renderSidebar() {
    const container = document.getElementById('pv-sidebar');
    if (!container) return;

    const listEl = container.querySelector('.pv-list');
    if (!listEl) return;

    let filteredPrompts = getFilteredPrompts();

    if (filteredPrompts.length === 0) {
      listEl.innerHTML = renderEmptyState();
      return;
    }

    // Calculate usage stats for each prompt
    const usageStats = {};
    recentUsage.forEach(usage => {
      if (!usageStats[usage.promptId]) {
        usageStats[usage.promptId] = { count: 0, lastUsed: 0 };
      }
      usageStats[usage.promptId].count++;
      if (usage.timestamp > usageStats[usage.promptId].lastUsed) {
        usageStats[usage.promptId].lastUsed = usage.timestamp;
      }
    });

    listEl.innerHTML = filteredPrompts
      .map(
        (prompt) => {
          const stats = usageStats[prompt.id] || { count: 0, lastUsed: 0 };
          const lastUsedText = stats.lastUsed > 0 ? formatTimeAgo(stats.lastUsed) : '';
          const usageText = stats.count > 0
            ? (i18n.getLocale() === 'zh'
              ? `使用 ${stats.count} 次${lastUsedText ? ' · ' + lastUsedText : ''}`
              : `Used ${stats.count} time${stats.count > 1 ? 's' : ''}${lastUsedText ? ' · ' + lastUsedText : ''}`)
            : '';

          // Check if batch mode is active
          const isBatchMode = document.getElementById('pv-sidebar')?.classList.contains('pv-batch-mode');

          return `
      <div class="pv-card" data-prompt-id="${prompt.id}">
        ${isBatchMode ? `<input type="checkbox" class="pv-batch-checkbox" data-prompt-id="${prompt.id}">` : ''}
        <div class="pv-card-title">
          <span>${escapeHtml(prompt.title)}</span>
          ${isBatchMode ? '' : `<div class="pv-card-actions">
            <button class="pv-card-action-btn pv-copy-btn" data-prompt-id="${prompt.id}" title="${i18n.t('btn_copy')}">📋</button>
            <button class="pv-card-action-btn pv-edit-btn" data-prompt-id="${prompt.id}" title="${i18n.t('btn_edit')}">✏️</button>
            <button class="pv-card-action-btn pv-fav-btn ${prompt.favorite ? 'pv-favorited' : ''}" data-prompt-id="${prompt.id}" title="${i18n.t('btn_favorite')}">⭐</button>
            <button class="pv-card-action-btn pv-del-btn" data-prompt-id="${prompt.id}" title="${i18n.t('btn_delete')}">🗑️</button>
          </div>`}
        </div>
        ${
          prompt.tags && prompt.tags.length > 0
            ? `<div class="pv-card-tags">${prompt.tags.map((t) => `<span class="pv-card-tag">${escapeHtml(t)}</span>`).join('')}</div>`
            : ''
        }
        <div class="pv-card-content">${escapeHtml(prompt.content)}</div>
        <div class="pv-card-meta">
          ${prompt.folder ? `<span class="pv-card-folder">${escapeHtml(prompt.folder)}</span>` : ''}
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
        const promptId = card.dataset.promptId;
        const prompt = prompts.find((p) => p.id === promptId);
        if (prompt) {
          insertPrompt(prompt.content, prompt.id);
        }
      });
    });

    listEl.querySelectorAll('.pv-copy-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        const prompt = prompts.find((p) => p.id === promptId);
        if (prompt) {
          navigator.clipboard.writeText(prompt.content);
          showToast(i18n.t('sidebar_copied'));
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

    listEl.querySelectorAll('.pv-fav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        toggleFavorite(promptId);
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
  }

  // ========== New Prompt Form ==========
  function showNewPromptForm() {
    const listEl = document.querySelector('#pv-sidebar .pv-list');
    if (!listEl) return;

    // Insert form at top of list
    const formEl = document.createElement('div');
    formEl.className = 'pv-card pv-editing';
    formEl.id = 'pv-new-prompt-form';
    formEl.innerHTML = `
      <div class="pv-edit-form">
        <div class="pv-edit-row">
          <input type="text" class="pv-edit-title" value="" placeholder="${i18n.t('placeholder_title')}">
        </div>
        <div class="pv-edit-row">
          <textarea class="pv-edit-content" placeholder="${i18n.t('placeholder_content')}"></textarea>
        </div>
        <div class="pv-edit-actions">
          <button class="pv-edit-cancel-btn">${i18n.t('btn_cancel')}</button>
          <button class="pv-edit-save-btn">${i18n.t('btn_save')}</button>
        </div>
      </div>
    `;

    listEl.insertBefore(formEl, listEl.firstChild);

    // Cancel
    formEl.querySelector('.pv-edit-cancel-btn').addEventListener('click', () => {
      formEl.remove();
    });

    // Save
    formEl.querySelector('.pv-edit-save-btn').addEventListener('click', () => {
      const title = formEl.querySelector('.pv-edit-title').value.trim();
      const content = formEl.querySelector('.pv-edit-content').value.trim();
      if (!title) { showToast(i18n.t('placeholder_title') + ' ' + i18n.t('toast_error_folder_name'), 'error'); return; }
      if (!content) { showToast(i18n.t('placeholder_content') + ' ' + i18n.t('toast_error_folder_name'), 'error'); return; }

      chrome.storage.local.get('promptvault_data', (data) => {
        const store = data.promptvault_data || {};
        if (!store.prompts) store.prompts = [];
        store.prompts.push({
          id: generateId(),
          title,
          content,
          tags: [],
          favorite: false,
          folder: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        chrome.storage.local.set({ promptvault_data: store }, () => {
          formEl.remove();
          loadData(() => renderSidebar());
          showToast(i18n.t('toast_created') || '已创建');
        });
      });
    });
  }

  // ========== Edit Form ==========
  function showEditForm(promptId) {
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return;

    const card = document.querySelector(`.pv-card[data-prompt-id="${promptId}"]`);
    if (!card) return;

    const tagsHtml = (prompt.tags || [])
      .map((t) => `<span class="pv-edit-tag">${escapeHtml(t)}<span class="pv-edit-tag-remove" data-tag="${escapeHtml(t)}">&times;</span></span>`)
      .join('');

    card.classList.add('pv-editing');
    card.innerHTML = `
      <div class="pv-edit-form">
        <div class="pv-edit-row">
          <input type="text" class="pv-edit-title" value="${escapeHtml(prompt.title)}" placeholder="${i18n.t('placeholder_title')}">
        </div>
        <div class="pv-edit-row">
          <textarea class="pv-edit-content" placeholder="${i18n.t('placeholder_content')}">${escapeHtml(prompt.content)}</textarea>
        </div>
        <div class="pv-edit-row pv-edit-tags-row">
          <div class="pv-edit-tags">${tagsHtml}</div>
          <div class="pv-edit-tag-add">
            <input type="text" class="pv-edit-tag-input" placeholder="${i18n.t('placeholder_tag')}">
            <button class="pv-edit-tag-add-btn">+</button>
          </div>
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

    // Remove tag
    card.querySelectorAll('.pv-edit-tag-remove').forEach((span) => {
      span.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagToRemove = span.dataset.tag;
        const tagsContainer = card.querySelector('.pv-edit-tags');
        const tagSpans = tagsContainer.querySelectorAll('.pv-edit-tag');
        tagSpans.forEach((ts) => {
          if (ts.querySelector('.pv-edit-tag-remove').dataset.tag === tagToRemove) {
            ts.remove();
          }
        });
      });
    });

    // Add tag
    const tagInput = card.querySelector('.pv-edit-tag-input');
    const addTagBtn = card.querySelector('.pv-edit-tag-add-btn');
    const addTag = () => {
      const val = tagInput.value.trim();
      if (!val) return;
      const tagsContainer = card.querySelector('.pv-edit-tags');
      // Check duplicate
      const existing = [...tagsContainer.querySelectorAll('.pv-edit-tag')].some(
        (el) => el.querySelector('.pv-edit-tag-remove').dataset.tag === val
      );
      if (existing) return;
      const tagEl = document.createElement('span');
      tagEl.className = 'pv-edit-tag';
      tagEl.innerHTML = `${escapeHtml(val)}<span class="pv-edit-tag-remove" data-tag="${escapeHtml(val)}">&times;</span>`;
      tagEl.querySelector('.pv-edit-tag-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        tagEl.remove();
      });
      tagsContainer.appendChild(tagEl);
      tagInput.value = '';
    };
    addTagBtn.addEventListener('click', addTag);
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    });
  }

  function saveEdit(promptId) {
    const card = document.querySelector(`.pv-card[data-prompt-id="${promptId}"]`);
    if (!card) return;

    const title = card.querySelector('.pv-edit-title').value.trim();
    const content = card.querySelector('.pv-edit-content').value.trim();
    if (!title) { showToast(i18n.t('placeholder_title') + ' ' + i18n.t('toast_error_folder_name'), 'error'); return; }

    const tags = [...card.querySelectorAll('.pv-edit-tag')].map(
      (el) => el.querySelector('.pv-edit-tag-remove').dataset.tag
    );

    chrome.storage.local.get('promptvault_data', (data) => {
      const store = data.promptvault_data || {};
      const prompt = store.prompts?.find((p) => p.id === promptId);
      if (prompt) {
        prompt.title = title;
        prompt.content = content;
        prompt.tags = tags;
        prompt.updatedAt = Date.now();
        chrome.storage.local.set({ promptvault_data: store }, () => {
          loadData(() => renderSidebar());
          showToast(i18n.t('toast_updated'));
        });
      }
    });
  }

  // ========== Delete Prompt ==========
  function deletePrompt(promptId) {
    chrome.storage.local.get('promptvault_data', (data) => {
      const store = data.promptvault_data || {};
      if (!store.prompts) return;
      store.prompts = store.prompts.filter((p) => p.id !== promptId);
      chrome.storage.local.set({ promptvault_data: store }, () => {
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
    if (currentTab === 'favorites') {
      result = result.filter((p) => p.favorite);
    } else if (currentTab === 'recent') {
      const recentIds = [...new Set(recentUsage.map((u) => u.promptId))];
      result = result.filter((p) => recentIds.includes(p.id));
      result.sort((a, b) => {
        const aIdx = recentIds.indexOf(a.id);
        const bIdx = recentIds.indexOf(b.id);
        return aIdx - bIdx;
      });
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    return result;
  }

  function renderEmptyState() {
    const messages = {
      all: { title: '暂无提示词', hint: '在扩展中创建你的第一个提示词' },
      recent: { title: '暂无最近使用', hint: '使用提示词后会显示在这里' },
      favorites: { title: '暂无收藏', hint: '收藏常用提示词方便快速访问' },
    };

    const msg = messages[currentTab] || messages.all;

    return `
      <div class="pv-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <p>${msg.title}</p>
        <p class="pv-empty-hint">${msg.hint}</p>
      </div>
    `;
  }

  // ========== Toggle Favorite ==========
  function toggleFavorite(promptId) {
    chrome.storage.local.get('promptvault_data', (data) => {
      const store = data.promptvault_data || {};
      const prompt = store.prompts?.find((p) => p.id === promptId);
      if (prompt) {
        prompt.favorite = !prompt.favorite;
        chrome.storage.local.set({ promptvault_data: store }, () => {
          loadData(() => renderSidebar());
        });
      }
    });
  }

  // ========== Toast ==========
  function showToast(message, type = 'success') {
    const existing = document.querySelector('.pv-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'pv-toast';
    toast.textContent = message;
    if (type === 'error') toast.style.background = '#ef4444';
    document.body.appendChild(toast);

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
          <button class="pv-icon-btn" id="pv-theme-toggle" title="切换主题">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button class="pv-icon-btn" id="pv-close-sidebar" title="关闭">
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
          <button class="pv-tab" data-tab="favorites">${i18n.t('sidebar_favorites')}</button>
        </div>
        <div class="pv-tabs-actions">
          <button class="pv-action-btn pv-batch-btn" id="pv-batch-btn">${i18n.t('btn_batch') || '批量'}</button>
          <button class="pv-action-btn pv-add-btn" id="pv-add-btn">+ ${i18n.t('btn_new_prompt')}</button>
        </div>
      </div>

      <div class="pv-list">
        <div class="pv-loading">
          <div class="pv-spinner"></div>
          加载中...
        </div>
      </div>
    `;

    document.body.appendChild(sidebar);

    // Apply dark mode
    if (isDarkMode) sidebar.classList.add('pv-dark');

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
        sidebar.classList.toggle('pv-dark');
        chrome.storage.local.get('promptvault_data', (data) => {
          const store = data.promptvault_data || {};
          if (!store.settings) store.settings = {};
          store.settings.darkMode = isDarkMode;
          chrome.storage.local.set({ promptvault_data: store });
        });
      });
    }

    // Close sidebar
    const closeBtn = document.getElementById('pv-close-sidebar');
    if (closeBtn) {
      closeBtn.addEventListener('click', toggleSidebar);
    }

    // Batch mode toggle
    const batchBtn = document.getElementById('pv-batch-btn');
    if (batchBtn) {
      batchBtn.addEventListener('click', () => {
        const list = document.getElementById('pv-sidebar');
        if (!list) return;
        const isBatch = list.classList.toggle('pv-batch-mode');
        batchBtn.classList.toggle('pv-active', isBatch);
        renderSidebar();
      });
    }

    // Add new prompt
    const addBtn = document.getElementById('pv-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        showNewPromptForm();
      });
    }
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('pv-sidebar');
    const toggle = document.getElementById('pv-sidebar-toggle');
    if (!sidebar || !toggle) return;

    sidebarVisible = !sidebarVisible;
    sidebar.classList.toggle('pv-hidden');

    // Update toggle button visibility
    toggle.style.display = sidebarVisible ? 'none' : 'flex';
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

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('sidebar.css');
    document.head.appendChild(link);

    // Create sidebar (starts hidden)
    createSidebar();

    // Load data and render
    loadData(() => {
      renderSidebar();
      // Don't auto-show on generic websites; wait for user action
      if (WEBSITE !== 'generic') {
        setTimeout(() => {
          const sidebar = document.getElementById('pv-sidebar');
          if (sidebar) sidebar.classList.remove('pv-hidden');
        }, 300);
      }
    });

    // Listen for storage changes
    setupStorageListener();
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
      const sidebar = document.getElementById('pv-sidebar');
      const toggle = document.getElementById('pv-sidebar-toggle');
      if (sidebar) {
        sidebar.classList.remove('pv-hidden');
        sidebarVisible = true;
      }
      if (toggle) toggle.style.display = 'none';
    },
    hideSidebar: () => {
      const sidebar = document.getElementById('pv-sidebar');
      const toggle = document.getElementById('pv-sidebar-toggle');
      if (sidebar) {
        sidebar.classList.add('pv-hidden');
        sidebarVisible = false;
      }
      if (toggle) toggle.style.display = 'flex';
    },
  };
})();
