/**
 * PromptVault Popup - Main UI Logic (i18n supported)
 * Product positioning: AI Prompt Manager (simple, lightweight)
 */
(async function () {
  'use strict';

  // State
  let currentTab = 'prompts';
  let editingPromptId = null;
  let editingFolderId = null;
  let currentFolderFilter = null;
  let currentTagFilter = null;
  let isBatchMode = false;
  let selectedPromptIds = new Set();

  // Settings snapshot (for Apply/Cancel)
  let settingsSnapshot = null;
  function snapshotSettings() {
    return {
      language: document.getElementById('setting-language').value,
      enableSidebar: document.getElementById('setting-enable-sidebar').checked,
      showBadge: document.getElementById('setting-show-badge').checked,
      defaultFolder: document.getElementById('setting-default-folder').value,
    };
  }

  // Initialize
  await i18n.loadLocale();
  applyTranslations();
  await Storage.init();
  await loadSettings();
  await renderAll();

  // Event Listeners
  initEventListeners();

  /**
   * Apply all translations to static DOM elements
   */
  function applyTranslations() {
    // Header
    document.querySelector('.logo').textContent = i18n.t('app_title');

    // Search placeholder
    document.getElementById('search-input').placeholder = i18n.t('search_placeholder');

    // Tab buttons
    const tabLabels = {
      'prompts': i18n.t('tab_prompts'),
      'folders': i18n.t('tab_folders'),
      'tags': i18n.t('tab_tags'),
      'pinned': i18n.t('tab_pinned'),
    };
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const key = tab.dataset.tab;
      const svg = tab.querySelector('svg');
      tab.innerHTML = '';
      if (svg) tab.appendChild(svg);
      tab.appendChild(document.createTextNode(' ' + tabLabels[key]));
    });

    // Buttons
    document.getElementById('btn-new-prompt').innerHTML =
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg> ` + i18n.t('btn_new_prompt');
    document.getElementById('btn-new-folder').innerHTML =
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg> ` + i18n.t('btn_new_folder');
    document.getElementById('btn-new-tag').innerHTML =
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg> ` + i18n.t('btn_new_tag');

    // Settings modal labels
    const defaultFolderLabel = document.querySelector('[for="setting-default-folder"]');
    if (defaultFolderLabel) defaultFolderLabel.textContent = i18n.t('label_default_folder');
    const languageLabel = document.querySelector('[for="setting-language"]');
    if (languageLabel) languageLabel.textContent = i18n.t('label_language');

    document.getElementById('btn-clear-data').textContent = i18n.t('btn_clear_data');

    // Settings modal title
    const settingsTitle = document.querySelector('#settings-modal .modal-header h2');
    if (settingsTitle) settingsTitle.textContent = i18n.t('modal_settings');

    // Settings modal - data management section
    const dataMgmtHeading = document.querySelector('[data-i18n="data_management"]');
    if (dataMgmtHeading) dataMgmtHeading.textContent = i18n.t('data_management');
    const importBtnText = document.querySelector('#btn-import span[data-i18n]');
    if (importBtnText) importBtnText.textContent = i18n.t('btn_import');
    const exportBtnText = document.querySelector('#btn-export span[data-i18n]');
    if (exportBtnText) exportBtnText.textContent = i18n.t('btn_export');

    // Confirm dialog defaults
    document.getElementById('confirm-ok').textContent = i18n.t('btn_confirm');

    // Language selector options
    const langSelect = document.getElementById('setting-language');
    if (langSelect) {
      langSelect.querySelector('[value="zh"]').textContent = i18n.t('lang_zh');
      langSelect.querySelector('[value="en"]').textContent = i18n.t('lang_en');
      langSelect.value = i18n.getLocale();
    }

    // Default folder option
    const defaultOpt = document.querySelector('#prompt-folder option[value="default"]');
    if (defaultOpt) defaultOpt.textContent = i18n.t('folder_uncategorized');
    const settingDefaultOpt = document.querySelector('#setting-default-folder option[value="default"]');
    if (settingDefaultOpt) settingDefaultOpt.textContent = i18n.t('folder_uncategorized');

    // Tab headings
    const h2Prompts = document.querySelector('#tab-prompts .tab-header h2');
    if (h2Prompts) h2Prompts.textContent = i18n.t('heading_all_prompts');
    const h2Folders = document.querySelector('#tab-folders .tab-header h2');
    if (h2Folders) h2Folders.textContent = i18n.t('heading_folders');
    const h2Tags = document.querySelector('#tab-tags .tab-header h2');
    if (h2Tags) h2Tags.textContent = i18n.t('heading_tags');
    const h2Pinned = document.getElementById('heading-pinned');
    if (h2Pinned) h2Pinned.textContent = i18n.t('heading_pinned_prompts');

    // Button tooltips
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) btnSettings.title = i18n.t('settings_title');
    const btnTheme = document.getElementById('btn-theme');
    if (btnTheme) btnTheme.title = i18n.t('toggle_theme');

    // Settings modal close button
    const settingsCloseBtn = document.querySelector('#settings-modal .modal-cancel');
    if (settingsCloseBtn) settingsCloseBtn.textContent = i18n.t('btn_close');

    // Batch manage button
    const btnBatchManage = document.getElementById('btn-batch-manage');
    if (btnBatchManage) {
      btnBatchManage.title = i18n.t('btn_batch_manage');
      btnBatchManage.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
        ${i18n.t('btn_batch')}
      `;
    }

    // Batch actions bar
    document.getElementById('batch-selected-count').textContent =
      i18n.t('batch_selected_count', 0);
    const batchMoveOpt = document.querySelector('#batch-folder-select option[value=""]');
    if (batchMoveOpt) batchMoveOpt.textContent = i18n.t('batch_move_to_folder');
    const btnBatchMove = document.getElementById('btn-batch-move');
    if (btnBatchMove) btnBatchMove.textContent = i18n.t('btn_batch_move');
    const btnBatchCancel = document.getElementById('btn-batch-cancel');
    if (btnBatchCancel) btnBatchCancel.textContent = i18n.t('btn_batch_cancel');

    // Prompt/Folder/Tag modals - static labels
    document.getElementById('prompt-modal-title').textContent = i18n.t('modal_new_prompt');
    document.querySelector('[for="prompt-title"]').textContent = i18n.t('label_title');
    document.getElementById('prompt-title').placeholder = i18n.t('placeholder_title');
    document.querySelector('[for="prompt-content"]').textContent = i18n.t('label_content');
    document.getElementById('prompt-content').placeholder = i18n.t('placeholder_content');
    document.querySelector('[for="prompt-folder"]').textContent = i18n.t('label_folder');
    const promptTagsLabel = document.querySelectorAll('#prompt-modal label')[3];
    if (promptTagsLabel) promptTagsLabel.textContent = i18n.t('label_tags');
    document.getElementById('prompt-tag-input').placeholder = i18n.t('placeholder_tag');
    document.querySelector('#prompt-modal .modal-cancel').textContent = i18n.t('btn_cancel');
    document.getElementById('btn-save-prompt').textContent = i18n.t('btn_save');

    document.getElementById('folder-modal-title').textContent = i18n.t('modal_new_folder');
    document.querySelector('[for="folder-name"]').textContent = i18n.t('label_name');
    document.getElementById('folder-name').placeholder = i18n.t('placeholder_folder_name');
    document.querySelector('[for="folder-color"]').textContent = i18n.t('label_color');
    document.querySelector('#folder-modal .modal-cancel').textContent = i18n.t('btn_cancel');
    document.getElementById('btn-save-folder').textContent = i18n.t('btn_save') + ' ' + i18n.t('heading_folders');

    document.getElementById('tag-modal-title').textContent = i18n.t('modal_new_tag');
    document.getElementById('tag-input-label').textContent = i18n.t('label_tags') + ' ' + i18n.t('label_name');
    document.getElementById('tag-input').placeholder = i18n.t('placeholder_new_tag');
    document.querySelector('#tag-modal .modal-cancel').textContent = i18n.t('btn_cancel');
    document.getElementById('btn-save-tag').textContent = i18n.t('btn_confirm');

    // Confirm dialog
    document.getElementById('confirm-message').textContent = i18n.t('confirm_delete_prompt_msg');
    document.querySelector('#confirm-dialog .modal-cancel').textContent = i18n.t('btn_cancel');
  }

  /**
   * Initialize all event listeners
   */
  function initEventListeners() {
    // Shortcut copy buttons
    document.querySelectorAll('.shortcut-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const shortcut = btn.dataset.shortcut;
        if (shortcut) {
          navigator.clipboard.writeText(shortcut).then(() => {
            const originalText = btn.textContent;
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = originalText; }, 1500);
          });
        }
      });
    });

    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    document.getElementById('btn-clear-search').addEventListener('click', () => {
      searchInput.value = '';
      handleSearch();
    });

    // New prompt button
    document.getElementById('btn-new-prompt').addEventListener('click', () => openPromptModal());

    // Batch manage button
    document.getElementById('btn-batch-manage').addEventListener('click', toggleBatchMode);
    document.getElementById('btn-batch-cancel').addEventListener('click', exitBatchMode);
    document.getElementById('btn-batch-move').addEventListener('click', batchMoveToFolder);
    document.getElementById('batch-folder-select').addEventListener('change', updateBatchMoveButton);
    document.getElementById('btn-batch-select-all').addEventListener('click', toggleSelectAll);

    // New folder button
    document.getElementById('btn-new-folder').addEventListener('click', () => openFolderModal());

    // New tag button
    document.getElementById('btn-new-tag').addEventListener('click', () => openNewTagDialog());

    // Save prompt button
    document.getElementById('btn-save-prompt').addEventListener('click', savePrompt);

    // Save folder button
    document.getElementById('btn-save-folder').addEventListener('click', saveFolder);

    // Import/Export
    document.getElementById('btn-import').addEventListener('click', importData);
    document.getElementById('btn-export').addEventListener('click', exportData);

    // Settings - open modal (load values + snapshot)
    document.getElementById('btn-settings').addEventListener('click', async () => {
      openModal('settings-modal');
      await loadSettings();
      settingsSnapshot = snapshotSettings();
    });
    document.getElementById('btn-clear-data').addEventListener('click', clearAllData);

    // Theme toggle
    document.getElementById('btn-theme').addEventListener('click', toggleDarkMode);

    // Settings - Apply
    document.getElementById('btn-settings-apply').addEventListener('click', applySettings);

    // Settings - Cancel
    document.getElementById('btn-settings-cancel').addEventListener('click', () => {
      closeAllModals();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => closeAllModals());
    });

    // Modal cancel buttons
    document.querySelectorAll('.modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => closeAllModals());
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAllModals();
      });
    });

    // Tag input
    const tagInput = document.getElementById('prompt-tag-input');
    tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTagToPrompt(tagInput.value.trim());
        tagInput.value = '';
      }
    });
  }

  /**
   * Get currently visible prompts (respecting folder filter and search)
   */
  async function getVisiblePrompts() {
    let prompts;
    if (currentFolderFilter) {
      prompts = await Storage.getPromptsByFolder(currentFolderFilter);
    } else {
      prompts = await Storage.getPrompts();
    }
    const query = document.getElementById('search-input').value.trim();
    if (query) {
      const q = query.toLowerCase();
      prompts = prompts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return prompts;
  }

  /**
   * Toggle select all / deselect all
   */
  async function toggleSelectAll() {
    const prompts = await getVisiblePrompts();
    const allSelected = prompts.length > 0 && prompts.every(p => selectedPromptIds.has(p.id));

    if (allSelected) {
      selectedPromptIds.clear();
    } else {
      prompts.forEach(p => selectedPromptIds.add(p.id));
    }

    updateBatchActionsBar();
    renderPrompts();
  }

  /**
   * Toggle batch mode
   */
  function toggleBatchMode() {
    isBatchMode = !isBatchMode;
    if (isBatchMode) {
      selectedPromptIds.clear();
      document.getElementById('btn-batch-manage').classList.add('active');
      document.getElementById('btn-batch-manage').innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
        ${i18n.t('btn_batch_done')}
      `;
    } else {
      exitBatchMode();
    }
    renderPrompts();
  }

  /**
   * Exit batch mode
   */
  function exitBatchMode() {
    isBatchMode = false;
    selectedPromptIds.clear();
    document.getElementById('btn-batch-manage').classList.remove('active');
    document.getElementById('btn-batch-manage').innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 11 12 14 22 4"></polyline>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
      ${i18n.t('btn_batch')}
    `;
    document.getElementById('batch-actions-bar').classList.add('hidden');
    renderPrompts();
  }

  /**
   * Toggle prompt selection in batch mode
   */
  function togglePromptSelection(promptId) {
    if (!isBatchMode) return;
    if (selectedPromptIds.has(promptId)) {
      selectedPromptIds.delete(promptId);
    } else {
      selectedPromptIds.add(promptId);
    }
    updateBatchActionsBar();
    renderPrompts(); // Re-render to update checkbox states
  }

  /**
   * Update batch actions bar visibility and count
   */
  async function updateBatchActionsBar() {
    const bar = document.getElementById('batch-actions-bar');
    const countEl = document.getElementById('batch-selected-count');
    const moveBtn = document.getElementById('btn-batch-move');
    const selectAllBtn = document.getElementById('btn-batch-select-all');

    if (isBatchMode) {
      bar.classList.remove('hidden');
      countEl.textContent = i18n.t('batch_selected_count', selectedPromptIds.size);

      // Update select all button text
      const prompts = await getVisiblePrompts();
      const allSelected = prompts.length > 0 && prompts.every(p => selectedPromptIds.has(p.id));
      selectAllBtn.textContent = i18n.t(allSelected ? 'btn_deselect_all' : 'btn_select_all');

      // Update folder select options
      updateBatchFolderSelect();
    } else {
      bar.classList.add('hidden');
    }
    updateBatchMoveButton();
  }

  /**
   * Update batch folder select options
   */
  async function updateBatchFolderSelect() {
    const select = document.getElementById('batch-folder-select');
    const folders = await Storage.getFolders();
    const currentVal = select.value;
    select.innerHTML = '<option value="">' + i18n.t('batch_move_to_folder') + '</option>' +
      folders.map(f => {
        const name = f.id === 'default' ? i18n.t('folder_uncategorized') : escapeHtml(f.name);
        return `<option value="${f.id}">${name}</option>`;
      }).join('');
    if ([...select.options].some(o => o.value === currentVal)) {
      select.value = currentVal;
    }
  }

  /**
   * Enable/disable batch move button based on folder selection
   */
  function updateBatchMoveButton() {
    const select = document.getElementById('batch-folder-select');
    const btn = document.getElementById('btn-batch-move');
    btn.disabled = !select.value || selectedPromptIds.size === 0;
  }

  /**
   * Batch move selected prompts to folder
   */
  async function batchMoveToFolder() {
    const folderId = document.getElementById('batch-folder-select').value;
    if (!folderId || selectedPromptIds.size === 0) return;

    const prompts = await Storage.getPrompts();
    for (const id of selectedPromptIds) {
      const prompt = prompts.find(p => p.id === id);
      if (prompt) {
        prompt.folder = folderId;
        prompt.updatedAt = Date.now();
        await Storage.savePrompt(prompt);
      }
    }

    showToast(i18n.t('batch_moved', selectedPromptIds.size), 'success');
    exitBatchMode();
    renderAll();
  }

  /**
   * Switch active tab
   * @param {string} tabName
   * @param {boolean} preserveFolderFilter - if true, don't reset currentFolderFilter
   */
  function switchTab(tabName, preserveFolderFilter = false) {
    currentTab = tabName;
    if (!preserveFolderFilter) {
      currentFolderFilter = null;
    }
    currentTagFilter = null;

    // Exit batch mode when switching tabs
    if (isBatchMode) {
      exitBatchMode();
    }

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });

    updatePromptsHeader();
    renderAll();
  }

  /**
   * Update prompts tab header to show folder filter breadcrumb
   */
  async function updatePromptsHeader() {
    const h2 = document.querySelector('#tab-prompts .tab-header h2');
    if (!h2) return;

    if (currentFolderFilter) {
      const folders = await Storage.getFolders();
      const folder = folders.find(f => f.id === currentFolderFilter);
      const folderName = folder && folder.id !== 'default' ? escapeHtml(folder.name) : i18n.t('folder_uncategorized');
      h2.innerHTML = `<span class="folder-breadcrumb" data-folder-id="${currentFolderFilter}" title="${i18n.t('back_to_all') || 'Back to all'}">&#9664; ${folderName}</span>`;
      // Click breadcrumb to go back to all prompts
      h2.querySelector('.folder-breadcrumb').addEventListener('click', () => {
        currentFolderFilter = null;
        updatePromptsHeader();
        renderPrompts();
      });
    } else {
      h2.textContent = i18n.t('heading_all_prompts');
    }
  }

  /**
   * Handle search input
   */
  async function handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    const clearBtn = document.getElementById('btn-clear-search');
    clearBtn.classList.toggle('hidden', !query);

    if (query) {
      const results = await Storage.searchPrompts(query);
      renderPrompts(results);
    } else {
      renderAll();
    }
  }

  /**
   * Render all content
   */
  async function renderAll() {
    await Promise.all([
      renderPrompts(),
      renderFolders(),
      renderTags(),
      renderPinned()
    ]);
  }

  /**
   * Render prompts list
   */
  async function renderPrompts(prompts = null) {
    const container = document.getElementById('prompts-list');
    const emptyState = document.getElementById('prompts-empty');

    if (!prompts) {
      if (currentFolderFilter) {
        prompts = await Storage.getPromptsByFolder(currentFolderFilter);
      } else {
        prompts = await Storage.getPrompts();
      }
    }

    if (prompts.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.querySelector('p').textContent = i18n.t('empty_no_prompts');
      emptyState.querySelector('.empty-hint').textContent = i18n.t('empty_prompts_hint');
      document.getElementById('batch-actions-bar').classList.add('hidden');
      return;
    }

    // Sort: pinned first, then by updatedAt descending
    prompts.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    emptyState.classList.add('hidden');
    const folders = await Storage.getFolders();

    container.innerHTML = prompts.map(prompt => {
      const folder = folders.find(f => f.id === prompt.folder);
      const folderName = folder && folder.id !== 'default' ? escapeHtml(folder.name) : i18n.t('folder_uncategorized');
      const folderColor = folder ? folder.color : '#808080';
      const isSelected = selectedPromptIds.has(prompt.id);

      if (isBatchMode) {
        return `
          <div class="prompt-card ${isSelected ? 'selected' : ''}" data-id="${prompt.id}" data-batch-select="true">
            <div class="batch-checkbox">
              <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${prompt.id}">
            </div>
            <div class="prompt-card-content">
              <div class="prompt-card-header">
                <div class="prompt-card-title">${escapeHtml(prompt.title)}</div>
              </div>
              <div class="prompt-card-preview">${escapeHtml((prompt.content || '').substring(0, 150))}${(prompt.content || '').length > 150 ? '...' : ''}</div>
              <div class="prompt-card-meta">
                <span class="prompt-card-folder" style="border-left: 3px solid ${folderColor}">${escapeHtml(folderName)}</span>
                ${(prompt.tags || []).map(tag => `<span class="prompt-card-tag">${escapeHtml(tag)}</span>`).join('')}
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="prompt-card" data-id="${prompt.id}">
            <div class="prompt-card-header">
              <div class="prompt-card-title">${escapeHtml(prompt.title)}</div>
              <div class="prompt-card-actions">
                <button class="prompt-card-action copy" title="${i18n.t('btn_copy')}" data-id="${prompt.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button class="prompt-card-action use" title="${i18n.t('btn_use')}" data-id="${prompt.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>
                <button class="prompt-card-action edit" title="${i18n.t('btn_edit')}" data-id="${prompt.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="prompt-card-action pin ${prompt.pinned ? 'active' : ''}" title="${i18n.t('btn_pin')}" data-id="${prompt.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="${prompt.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="17" x2="12" y2="22"></line>
                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path>
                  </svg>
                </button>
                <button class="prompt-card-action delete" title="${i18n.t('btn_delete')}" data-id="${prompt.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="prompt-card-preview">${escapeHtml((prompt.content || '').substring(0, 150))}${(prompt.content || '').length > 150 ? '...' : ''}</div>
            <div class="prompt-card-meta">
              <span class="prompt-card-folder" style="border-left: 3px solid ${folderColor}">${escapeHtml(folderName)}</span>
              ${(prompt.tags || []).map(tag => `<span class="prompt-card-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
        `;
      }
    }).join('');

    if (isBatchMode) {
      // Batch mode: click card or checkbox to toggle selection
      container.querySelectorAll('.prompt-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const id = card.dataset.id;
          togglePromptSelection(id);
        });
      });
      updateBatchActionsBar();
    } else {
      // Normal mode: existing behavior
      container.querySelectorAll('.prompt-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (!e.target.closest('.prompt-card-action')) {
            copyPromptToClipboard(card.dataset.id);
          }
        });
      });

      // Copy button - one-click copy
      container.querySelectorAll('.prompt-card-action.copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          copyPromptToClipboard(btn.dataset.id);
        });
      });

      container.querySelectorAll('.prompt-card-action.use').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          copyPromptToClipboard(btn.dataset.id);
        });
      });

      container.querySelectorAll('.prompt-card-action.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openPromptModal(btn.dataset.id);
        });
      });

      container.querySelectorAll('.prompt-card-action.pin').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await Storage.togglePin(btn.dataset.id);
          renderAll();
        });
      });

      container.querySelectorAll('.prompt-card-action.delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          confirmDelete('prompt', btn.dataset.id);
        });
      });
    }
  }

  /**
   * Render folders list
   */
  async function renderFolders() {
    const container = document.getElementById('folders-list');
    const folders = await Storage.getFolders();
    const prompts = await Storage.getPrompts();

    container.innerHTML = folders.map(folder => {
      const count = prompts.filter(p => p.folder === folder.id).length;
      const folderName = folder.id === 'default' ? i18n.t('folder_uncategorized') : escapeHtml(folder.name);
      const folderColor = folder.color || '#808080';
      return `
        <div class="folder-card" data-id="${folder.id}" style="border-left-color: ${folderColor}">
          <div class="folder-card-left">
            <div class="folder-color-block" style="background: ${folderColor}20;">
              <svg class="folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${folderColor}" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span class="folder-card-name">${folderName}</span>
            <span class="folder-card-count">${count}</span>
          </div>
          <div class="folder-card-actions">
            ${folder.id !== 'default' ? `
              <button class="prompt-card-action edit" title="${i18n.t('btn_edit')}" data-id="${folder.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="prompt-card-action delete" title="${i18n.t('btn_delete')}" data-id="${folder.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners
    container.querySelectorAll('.folder-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.prompt-card-action')) {
          currentFolderFilter = card.dataset.id;
          switchTab('prompts', true);
        }
      });
    });

    container.querySelectorAll('.folder-card .edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openFolderModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.folder-card .delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete('folder', btn.dataset.id);
      });
    });

    // Update folder selects
    updateFolderSelects(folders);
  }

  /**
   * Render tags list
   */
  async function renderTags() {
    const container = document.getElementById('tags-list');
    const tags = await Storage.getTags();
    const prompts = await Storage.getPrompts();

    if (tags.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>' + i18n.t('empty_no_tags') + '</p></div>';
      return;
    }

    container.innerHTML = tags.map(tag => {
      // Normalize both sides for robust matching
      const normalizedTag = tag.trim().toLowerCase();
      const count = prompts.filter(p => {
        if (!p.tags || !p.tags.length) return false;
        return p.tags.some(t => t.trim().toLowerCase() === normalizedTag);
      }).length;
      return `
        <div class="tag-item" data-tag="${escapeHtml(tag)}">
          <span>${escapeHtml(tag)}</span>
          <span class="tag-item-count">${count}</span>
          <button class="tag-item-delete" data-tag="${escapeHtml(tag)}">×</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.tag-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tag-item-delete')) {
          currentTagFilter = item.dataset.tag;
          switchTab('prompts');
        }
      });
    });

    container.querySelectorAll('.tag-item-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Storage.removeTag(btn.dataset.tag);
        renderAll();
        showToast(i18n.t('toast_tag_deleted'));
      });
    });
  }

  /**
   * Render pinned list (only pinned prompts)
   */
  async function renderPinned() {
    const container = document.getElementById('pinned-list');
    const emptyState = document.getElementById('pinned-empty');
    const prompts = await Storage.getPrompts();
    const pinned = prompts.filter(p => p.pinned);

    if (pinned.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.querySelector('p').textContent = i18n.t('empty_no_pinned');
      emptyState.querySelector('.empty-hint').textContent = i18n.t('empty_pinned_hint');
      return;
    }

    emptyState.classList.add('hidden');
    const folders = await Storage.getFolders();

    // Sort pinned by updatedAt descending
    pinned.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    container.innerHTML = pinned.map(prompt => {
      const folder = folders.find(f => f.id === prompt.folder);
      const folderName = folder && folder.id !== 'default' ? escapeHtml(folder.name) : i18n.t('folder_uncategorized');
      const folderColor = folder ? folder.color : '#808080';

      return `
        <div class="prompt-card" data-id="${prompt.id}">
          <div class="prompt-card-header">
            <div class="prompt-card-title">${escapeHtml(prompt.title)}</div>
            <div class="prompt-card-actions">
              <button class="prompt-card-action copy" title="${i18n.t('btn_copy')}" data-id="${prompt.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button class="prompt-card-action use" title="${i18n.t('btn_use')}" data-id="${prompt.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <button class="prompt-card-action edit" title="${i18n.t('btn_edit')}" data-id="${prompt.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="prompt-card-action pin active" title="${i18n.t('btn_pin')}" data-id="${prompt.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="17" x2="12" y2="22"></line>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path>
                </svg>
              </button>
              <button class="prompt-card-action delete" title="${i18n.t('btn_delete')}" data-id="${prompt.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="prompt-card-preview">${escapeHtml((prompt.content || '').substring(0, 150))}${(prompt.content || '').length > 150 ? '...' : ''}</div>
          <div class="prompt-card-meta">
            <span class="prompt-card-folder" style="border-left: 3px solid ${folderColor}">${escapeHtml(folderName)}</span>
            ${(prompt.tags || []).map(tag => `<span class="prompt-card-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners for pinned-list cards
    container.querySelectorAll('.prompt-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.prompt-card-action')) {
          copyPromptToClipboard(card.dataset.id);
        }
      });
    });
    container.querySelectorAll('.prompt-card-action.copy').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); copyPromptToClipboard(btn.dataset.id); });
    });
    container.querySelectorAll('.prompt-card-action.use').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); copyPromptToClipboard(btn.dataset.id); });
    });
    container.querySelectorAll('.prompt-card-action.edit').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openPromptModal(btn.dataset.id); });
    });
    container.querySelectorAll('.prompt-card-action.pin').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Storage.togglePin(btn.dataset.id);
        renderAll();
      });
    });
    container.querySelectorAll('.prompt-card-action.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete('prompt', btn.dataset.id);
      });
    });
  }

  /**
   * Open prompt modal (new or edit)
   */
  async function openPromptModal(promptId = null) {
    editingPromptId = promptId;
    const title = document.getElementById('prompt-modal-title');

    // Update form labels
    document.querySelector('[for="prompt-title"]').textContent = i18n.t('label_title');
    document.querySelector('[for="prompt-content"]').textContent = i18n.t('label_content');
    document.querySelector('[for="prompt-folder"]').textContent = i18n.t('label_folder');
    document.querySelector('#prompt-modal .form-group:nth-child(4) label').textContent = i18n.t('label_tags');
    document.getElementById('prompt-title').placeholder = i18n.t('placeholder_title');
    document.getElementById('prompt-content').placeholder = i18n.t('placeholder_content');
    document.getElementById('prompt-tag-input').placeholder = i18n.t('placeholder_tag');
    document.getElementById('btn-save-prompt').textContent = i18n.t('btn_save');

    // Load existing tags for suggestions
    const existingTags = await Storage.getTags();
    renderTagSuggestions(existingTags);

    if (promptId) {
      title.textContent = i18n.t('modal_edit_prompt');
      const prompt = await Storage.getPrompt(promptId);
      document.getElementById('prompt-title').value = prompt.title;
      document.getElementById('prompt-content').value = prompt.content;
      document.getElementById('prompt-folder').value = prompt.folder || 'default';
      renderPromptTags(prompt.tags || []);
    } else {
      title.textContent = i18n.t('modal_new_prompt');
      document.getElementById('prompt-title').value = '';
      document.getElementById('prompt-content').value = '';
      document.getElementById('prompt-folder').value = 'default';
      renderPromptTags([]);
    }

    openModal('prompt-modal');
  }

  /**
   * Render tag suggestions (existing tags)
   */
  function renderTagSuggestions(existingTags) {
    const container = document.getElementById('tag-suggestions');
    if (!container) return;

    // Defensive dedup
    const uniqueTags = [...new Set(existingTags || [])];

    if (uniqueTags.length === 0) {
      container.innerHTML = '';
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = uniqueTags.map(tag => `
      <span class="tag-suggestion" data-tag="${escapeHtml(tag)}">
        ${escapeHtml(tag)}
      </span>
    `).join('');

    // Use event delegation: bind once on container
    container.onclick = (e) => {
      const target = e.target.closest('.tag-suggestion');
      if (!target) return;
      const tag = target.dataset.tag;
      const currentTags = getCurrentPromptTags();

      if (currentTags.includes(tag)) {
        removeTagFromPrompt(tag);
      } else {
        addTagToPrompt(tag);
      }

      updateTagSuggestionState();
    };

    updateTagSuggestionState();
  }

  /**
   * Update visual state of tag suggestions (highlight selected ones)
   */
  function updateTagSuggestionState() {
    const currentTags = getCurrentPromptTags();
    const suggestions = document.querySelectorAll('.tag-suggestion');
    suggestions.forEach(span => {
      if (currentTags.includes(span.dataset.tag)) {
        span.classList.add('selected');
      } else {
        span.classList.remove('selected');
      }
    });
  }

  /**
   * Get current prompt tags from chip display
   */
  function getCurrentPromptTags() {
    const container = document.getElementById('prompt-tags');
    return Array.from(container.querySelectorAll('.tag-chip'))
      .map(chip => chip.textContent.trim().slice(0, -1).trim())
      .filter(t => t.length > 0);
  }

  /**
   * Render prompt tags in modal
   */
  function renderPromptTags(tags) {
    const container = document.getElementById('prompt-tags');
    container.innerHTML = tags.map(tag => `
      <span class="tag-chip">
        ${escapeHtml(tag)}
        <button class="tag-chip-remove" data-tag="${escapeHtml(tag)}">×</button>
      </span>
    `).join('');

    container.querySelectorAll('.tag-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        removeTagFromPrompt(btn.dataset.tag);
      });
    });

    // Update suggestion highlights
    updateTagSuggestionState();
  }

  function addTagToPrompt(tag) {
    if (!tag) return;
    tag = tag.trim();
    if (!tag) return;
    const container = document.getElementById('prompt-tags');
    const existingTags = getCurrentPromptTags();
    if (!existingTags.includes(tag)) {
      existingTags.push(tag);
      renderPromptTags(existingTags);
    }
  }

  function removeTagFromPrompt(tag) {
    tag = tag.trim();
    const container = document.getElementById('prompt-tags');
    const existingTags = getCurrentPromptTags()
      .filter(t => t !== tag);
    renderPromptTags(existingTags);
  }

  /**
   * Save prompt
   */
  async function savePrompt() {
    const title = document.getElementById('prompt-title').value.trim();
    const content = document.getElementById('prompt-content').value.trim();
    const folder = document.getElementById('prompt-folder').value;

    if (!title || !content) {
      showToast(i18n.t('toast_error_folder_name'), 'error');
      return;
    }

    const tags = Array.from(document.querySelectorAll('#prompt-tags .tag-chip'))
      .map(chip => chip.textContent.trim().slice(0, -1).trim())
      .filter(t => t.length > 0);

    const prompt = {
      id: editingPromptId || Storage.generateId(),
      title,
      content,
      folder,
      tags,
      pinned: false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (editingPromptId) {
      const existing = await Storage.getPrompt(editingPromptId);
      prompt.pinned = existing.pinned || false;
      prompt.usageCount = existing.usageCount || 0;
      prompt.lastUsedAt = existing.lastUsedAt || 0;
      prompt.createdAt = existing.createdAt;
    }

    await Storage.savePrompt(prompt);
    for (const tag of tags) {
      await Storage.addTag(tag);
    }

    closeAllModals();
    renderAll();
    showToast(editingPromptId ? i18n.t('toast_updated') : i18n.t('toast_saved'), 'success');
  }

  /**
   * Open folder modal
   */
  async function openFolderModal(folderId = null) {
    editingFolderId = folderId;
    const title = document.getElementById('folder-modal-title');

    document.querySelector('[for="folder-name"]').textContent = i18n.t('label_name');
    document.querySelector('[for="folder-color"]').textContent = i18n.t('label_color');
    document.getElementById('folder-name').placeholder = i18n.t('placeholder_folder_name');
    document.getElementById('btn-save-folder').textContent = i18n.t('btn_save');

    if (folderId) {
      title.textContent = i18n.t('modal_edit_folder');
      const folders = await Storage.getFolders();
      const folder = folders.find(f => f.id === folderId);
      document.getElementById('folder-name').value = folder.name;
      document.getElementById('folder-color').value = folder.color;
    } else {
      title.textContent = i18n.t('modal_new_folder');
      document.getElementById('folder-name').value = '';
      document.getElementById('folder-color').value = '#4A90E2';
    }

    openModal('folder-modal');

    document.querySelectorAll('.color-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('folder-color').value = btn.dataset.color;
      });
    });
  }

  async function saveFolder() {
    const name = document.getElementById('folder-name').value.trim();
    const color = document.getElementById('folder-color').value;

    if (!name) {
      showToast(i18n.t('toast_error_folder_name'), 'error');
      return;
    }

    const folder = {
      id: editingFolderId || Storage.generateId(),
      name,
      color
    };

    await Storage.saveFolder(folder);
    closeAllModals();
    renderAll();
    showToast(editingFolderId ? i18n.t('toast_folder_updated') : i18n.t('toast_folder_created'), 'success');
  }

  async function openNewTagDialog() {
    const tagModal = document.getElementById('tag-modal');
    const tagInput = document.getElementById('tag-input');
    const tagModalTitle = document.getElementById('tag-modal-title');
    const tagInputLabel = document.getElementById('tag-input-label');

    // Set i18n text
    tagModalTitle.textContent = i18n.t('modal_new_tag') || 'New Tag';
    tagInputLabel.textContent = i18n.t('label_name') || 'Name';
    tagInput.placeholder = i18n.t('placeholder_tag') || 'Enter tag name...';

    // Show modal
    tagModal.classList.remove('hidden');
    setTimeout(() => tagInput.focus(), 50);

    // Save handler
    const saveTag = async () => {
      const tag = tagInput.value.trim();
      if (!tag) return;
      await Storage.addTag(tag);
      closeTagModal();
      renderAll();
      showToast(i18n.t('toast_tag_created'), 'success');
    };

    // Bind buttons (one-time)
    const saveBtn = document.getElementById('btn-save-tag');
    const cancelBtn = tagModal.querySelector('.modal-cancel');
    const closeBtn = tagModal.querySelector('.modal-close');

    const closeTagModal = () => {
      tagModal.classList.add('hidden');
      tagInput.value = '';
      // Remove listeners to avoid stacking
      saveBtn.replaceWith(saveBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      closeBtn.replaceWith(closeBtn.cloneNode(true));
    };

    // Re-bind fresh listeners
    document.getElementById('btn-save-tag').addEventListener('click', saveTag);
    tagModal.querySelector('.modal-cancel').addEventListener('click', closeTagModal);
    tagModal.querySelector('.modal-close').addEventListener('click', closeTagModal);

    // Enter key to save
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveTag(); }
      if (e.key === 'Escape') { closeTagModal(); }
    });

    // Click overlay to close
    tagModal.addEventListener('click', (e) => {
      if (e.target === tagModal) closeTagModal();
    });
  }

  /**
   * Copy prompt to clipboard directly
   */
  async function copyPromptToClipboard(promptId) {
    const prompt = await Storage.getPrompt(promptId);
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt.content);
    showToast(i18n.t('toast_copied'), 'success');
  }

  /**
   * Insert prompt into current page (for AI websites)
   * This will be fully implemented with sidebar feature
   */
  async function insertPromptIntoPage(promptId) {
    const prompt = await Storage.getPrompt(promptId);
    if (!prompt) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertPrompt',
        text: prompt.content
      }, (response) => {
        if (chrome.runtime.lastError) {
          showToast(i18n.t('toast_error_cannot_insert'), 'error');
        } else {
          showToast(i18n.t('toast_inserted'), 'success');
        }
      });
    });
  }

  function confirmDelete(type, id) {
    const title = document.getElementById('confirm-title');
    const message = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');

    if (type === 'prompt') {
      title.textContent = i18n.t('confirm_delete_prompt');
      message.textContent = i18n.t('confirm_delete_prompt_msg');
    } else if (type === 'folder') {
      title.textContent = i18n.t('confirm_delete_folder');
      message.textContent = i18n.t('confirm_delete_folder_msg');
    }

    openModal('confirm-dialog');

    okBtn.onclick = async () => {
      if (type === 'prompt') {
        await Storage.deletePrompt(id);
        showToast(i18n.t('toast_deleted'), 'success');
      } else if (type === 'folder') {
        await Storage.deleteFolder(id);
        showToast(i18n.t('toast_deleted'), 'success');
      }
      closeAllModals();
      renderAll();
    };
  }

  async function exportData() {
    const data = await Storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `promptvault_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast(i18n.t('toast_exported'), 'success');
  }

  async function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result);
          await Storage.importData(data);
          renderAll();
          showToast(i18n.t('toast_imported'), 'success');
        } catch (error) {
          showToast(i18n.t('toast_error_invalid_json'), 'error');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  async function toggleDarkMode() {
    const settings = await Storage.getSettings();
    settings.darkMode = !settings.darkMode;
    await Storage.saveSettings(settings);
    applyTheme(settings.darkMode);
  }

  function applyTheme(darkMode) {
    if (darkMode) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  async function loadSettings() {
    const settings = await Storage.getSettings();
    applyTheme(settings.darkMode);

    const langSelect = document.getElementById('setting-language');
    if (langSelect) langSelect.value = i18n.getLocale();

    const sidebarCheckbox = document.getElementById('setting-enable-sidebar');
    if (sidebarCheckbox) sidebarCheckbox.checked = settings.enableSidebar !== false;

    const badgeCheckbox = document.getElementById('setting-show-badge');
    if (badgeCheckbox) badgeCheckbox.checked = settings.showBadge !== false;

    // Also populate and select default folder
    await updateFolderSelects(await Storage.getFolders());
    const defaultFolderSelect = document.getElementById('setting-default-folder');
    if (defaultFolderSelect) defaultFolderSelect.value = settings.defaultFolder || 'default';
  }

  /**
   * Apply settings from form (called by Apply button)
   */
  async function applySettings() {
    const settings = await Storage.getSettings();

    const newLang = document.getElementById('setting-language').value;
    const newEnableSidebar = document.getElementById('setting-enable-sidebar').checked;
    const newShowBadge = document.getElementById('setting-show-badge').checked;
    const newDefaultFolder = document.getElementById('setting-default-folder').value;

    // Detect what changed
    const langChanged = newLang !== settings.locale;
    const badgeChanged = newShowBadge !== (settings.showBadge !== false);

    // Update settings object
    settings.locale = newLang;
    settings.enableSidebar = newEnableSidebar;
    settings.showBadge = newShowBadge;
    settings.defaultFolder = newDefaultFolder;

    await Storage.saveSettings(settings);

    // Apply language change immediately
    if (langChanged) {
      await i18n.setLocale(newLang);
      applyTranslations();
      await renderAll();
    }

    // Update badge (explicitly wait for background to process)
    if (badgeChanged || true) {
      chrome.runtime.sendMessage({ action: 'updateBadge' });
    }

    // Update snapshot
    settingsSnapshot = snapshotSettings();

    closeAllModals();
    showToast(i18n.t('toast_settings_applied'), 'success');
  }

  function clearAllData() {
    const title = document.getElementById('confirm-title');
    const message = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');

    title.textContent = i18n.t('confirm_clear_data');
    message.textContent = i18n.t('confirm_clear_data_msg');

    openModal('confirm-dialog');

    okBtn.onclick = async () => {
      await chrome.storage.local.clear();
      await Storage.init();
      closeAllModals();
      renderAll();
      showToast(i18n.t('toast_cleared'), 'success');
    };
  }

  async function updateFolderSelects(folders) {
    const selects = [
      document.getElementById('prompt-folder'),
      document.getElementById('setting-default-folder')
    ];

    selects.forEach(select => {
      if (!select) return;
      const currentValue = select.value;
      select.innerHTML = folders.map(folder => {
        const displayName = folder.id === 'default' ? i18n.t('folder_uncategorized') : escapeHtml(folder.name);
        return `<option value="${folder.id}">${displayName}</option>`;
      }).join('');
      if ([...select.options].some(o => o.value === currentValue)) {
        select.value = currentValue;
      }
    });
  }

  function openModal(modalId) {
    closeAllModals();
    document.getElementById(modalId).classList.remove('hidden');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });
  }

  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
})();
