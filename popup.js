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
  let recentUsageCollapsed = false;
  let currentSortMode = 'smart'; // smart | updatedAt | createdAt | title | usageCount | custom
  let currentGroupSortMode = 'folderName'; // folderName | recent | updatedAt | usageCount | custom
  let displayMode = 'list'; // list | grouped
  let isPromptDragSorting = false;
  let suppressPromptCardClickUntil = 0;
  const PAYPAL_DONATION_URL = 'https://www.paypal.com/ncp/payment/3ZZGQLA3U2GZQ';

  // Settings snapshot (for Apply/Cancel)
  let settingsSnapshot = null;
  function snapshotSettings() {
    return {
      language: document.getElementById('setting-language').value,
      enableSidebar: document.getElementById('setting-enable-sidebar').checked,
      sidebarCloseOnOutside: document.getElementById('setting-sidebar-close-outside').checked,
      sidebarCardClickAction: document.getElementById('setting-sidebar-card-click').value,
      showBadge: document.getElementById('setting-show-badge').checked,
      showRecent: document.getElementById('setting-show-recent').checked,
      autoTopAfterUse: document.getElementById('setting-auto-top')?.checked,
      defaultFolder: document.getElementById('setting-default-folder').value,
      displayMode: document.getElementById('setting-display-mode').value,
    };
  }

  function setTooltip(element, label, placement = 'top') {
    if (!element || !label) return;
    element.removeAttribute('title');
    element.dataset.tooltip = label;
    element.dataset.tooltipPlacement = placement;
    element.setAttribute('aria-label', label);
  }

  function isGroupedSortMode() {
    return displayMode === 'grouped';
  }

  function getActiveSortMode() {
    return isGroupedSortMode() ? currentGroupSortMode : currentSortMode;
  }

  function getSortOptions() {
    if (isGroupedSortMode()) {
      return [
        ['folderName', i18n.t('sort_group_folder')],
        ['recent', i18n.t('sort_group_recent')],
        ['updatedAt', i18n.t('sort_group_updated')],
        ['usageCount', i18n.t('sort_group_usage')],
        ['custom', i18n.t('sort_group_custom')],
      ];
    }

    return [
      ['smart', i18n.t('sort_smart')],
      ['updatedAt', i18n.t('sort_updated')],
      ['createdAt', i18n.t('sort_created')],
      ['title', i18n.t('sort_title')],
      ['usageCount', i18n.t('sort_usage')],
      ['custom', i18n.t('sort_custom')],
    ];
  }

  function updateSortSelectOptions() {
    const sortSelect = document.getElementById('sort-select');
    if (!sortSelect) return;

    sortSelect.innerHTML = getSortOptions()
      .map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`)
      .join('');
    sortSelect.value = getActiveSortMode();
    setTooltip(
      sortSelect,
      i18n.t(isGroupedSortMode() ? 'sort_group_tooltip' : 'sort_list_tooltip'),
      'bottom'
    );
  }

  async function persistSortModes() {
    const settings = await Storage.getSettings();
    settings.sortMode = currentSortMode;
    settings.groupSortMode = currentGroupSortMode;
    await Storage.saveSettings(settings);
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
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>`;
    const btnNewPrompt = document.getElementById('btn-new-prompt');
    setTooltip(btnNewPrompt, i18n.t('btn_new_prompt'), 'bottom');
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
    const preferencesHeading = document.querySelector('[data-i18n="settings_preferences"]');
    if (preferencesHeading) preferencesHeading.textContent = i18n.t('settings_preferences');
    const shortcutHeading = document.querySelector('[data-i18n="shortcut_title"]');
    if (shortcutHeading) shortcutHeading.textContent = i18n.t('shortcut_title');
    const importBtnText = document.querySelector('#btn-import span[data-i18n]');
    if (importBtnText) importBtnText.textContent = i18n.t('btn_import');
    const exportBtnText = document.querySelector('#btn-export span[data-i18n]');
    if (exportBtnText) exportBtnText.textContent = i18n.t('btn_export');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const text = i18n.t(key);
      if (text && text !== key) el.textContent = text;
    });
    document.querySelectorAll('.shortcut-copy-btn').forEach(btn => {
      setTooltip(btn, i18n.t('shortcut_copy_tooltip'));
    });

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
    const h2Folders = document.querySelector('#tab-folders .tab-header h2');
    if (h2Folders) h2Folders.textContent = i18n.t('heading_folders');
    const h2Tags = document.querySelector('#tab-tags .tab-header h2');
    if (h2Tags) h2Tags.textContent = i18n.t('heading_tags');
    const h2Pinned = document.getElementById('heading-pinned');
    if (h2Pinned) h2Pinned.textContent = i18n.t('heading_pinned_prompts');

    // Button tooltips
    const btnSettings = document.getElementById('btn-settings');
    setTooltip(btnSettings, i18n.t('settings_title'), 'bottom');
    const btnTheme = document.getElementById('btn-theme');
    setTooltip(btnTheme, i18n.t('toggle_theme'), 'bottom');
    updateSortSelectOptions();

    // Settings modal close button
    const settingsCloseBtn = document.querySelector('#settings-modal .modal-cancel');
    if (settingsCloseBtn) settingsCloseBtn.textContent = i18n.t('btn_close');

    // Batch manage button
    const btnBatchManage = document.getElementById('btn-batch-manage');
    if (btnBatchManage) {
      setTooltip(btnBatchManage, i18n.t('btn_batch_manage'), 'bottom');
      btnBatchManage.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>`;
    }

    // Batch actions bar
    document.getElementById('batch-selected-count').textContent =
      i18n.t('batch_selected_count', 0);
    const emptyNewPromptBtn = document.getElementById('btn-empty-new-prompt');
    if (emptyNewPromptBtn) emptyNewPromptBtn.textContent = i18n.t('empty_action_new_prompt');
    const emptyViewAllBtn = document.getElementById('btn-empty-view-all');
    if (emptyViewAllBtn) emptyViewAllBtn.textContent = i18n.t('empty_action_view_all');
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
            btn.textContent = i18n.getLocale() === 'zh' ? '已复制' : 'Copied';
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
    searchInput.addEventListener('focus', () => renderPrompts());
    searchInput.addEventListener('blur', () => {
      setTimeout(() => renderPrompts(), 120);
    });
    document.getElementById('btn-clear-search').addEventListener('click', () => {
      searchInput.value = '';
      handleSearch();
    });
    document.getElementById('search-context').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-clear-filter]');
      if (!btn) return;

      const type = btn.dataset.clearFilter;
      if (type === 'query') {
        searchInput.value = '';
      } else if (type === 'folder') {
        currentFolderFilter = null;
        updatePromptsHeader();
      } else if (type === 'tag') {
        currentTagFilter = null;
        updatePromptsHeader();
      }
      handleSearch();
    });

    // New prompt button
    document.getElementById('btn-new-prompt').addEventListener('click', () => openPromptModal());
    document.getElementById('btn-empty-new-prompt')?.addEventListener('click', () => {
      const query = document.getElementById('search-input').value.trim();
      if (query) {
        document.getElementById('search-input').value = '';
        handleSearch();
      } else if (currentFolderFilter || currentTagFilter) {
        currentFolderFilter = null;
        currentTagFilter = null;
        updatePromptsHeader();
        renderPrompts();
      } else {
        openPromptModal();
      }
    });
    document.getElementById('btn-empty-view-all')?.addEventListener('click', () => {
      document.getElementById('search-input').value = '';
      currentFolderFilter = null;
      currentTagFilter = null;
      switchTab('prompts');
    });

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
    document.getElementById('btn-open-wechat-support')?.addEventListener('click', openWechatSupport);
    document.getElementById('btn-paypal-support')?.addEventListener('click', openPaypalSupport);

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

    // Toggle recent usage collapse/expand
    const recentToggle = document.getElementById('recent-usage-toggle');
    if (recentToggle) {
      recentToggle.addEventListener('click', () => {
        recentUsageCollapsed = !recentUsageCollapsed;
        renderRecentUsage();
      });
    }

    // Clear all recent usage
    const btnClearRecent = document.getElementById('btn-clear-recent');
    if (btnClearRecent) {
      btnClearRecent.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete('clear_recent');
      });
    }

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      updateSortSelectOptions();
      sortSelect.addEventListener('change', async () => {
        if (isGroupedSortMode()) {
          currentGroupSortMode = sortSelect.value;
        } else {
          currentSortMode = sortSelect.value;
        }
        await persistSortModes();
        renderPrompts();
      });
    }

  }

  /**
   * Get currently visible prompts (respecting folder filter and search)
   */
  async function getVisiblePrompts() {
    let prompts = await getBasePrompts();
    const folders = await Storage.getFolders();
    const query = document.getElementById('search-input').value.trim();
    if (query) {
      prompts = Storage.filterAndRankPrompts(prompts, query, { folders });
    }
    return prompts;
  }

  async function getBasePrompts() {
    let prompts;
    if (currentFolderFilter) {
      prompts = await Storage.getPromptsByFolder(currentFolderFilter);
    } else {
      prompts = await Storage.getPrompts();
    }

    if (currentTagFilter) {
      const normalizedTag = currentTagFilter.trim().toLowerCase();
      prompts = prompts.filter(p =>
        (p.tags || []).some(t => t.trim().toLowerCase() === normalizedTag)
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
        </svg>`;
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
      </svg>`;
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
  function switchTab(tabName, preserveFilter = false) {
    currentTab = tabName;
    if (!preserveFilter) {
      currentFolderFilter = null;
      currentTagFilter = null;
    }

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
    const wrap = document.getElementById('folder-breadcrumb-wrap');
    if (!wrap) return;

    if (currentFolderFilter || currentTagFilter) {
      const folders = await Storage.getFolders();
      let label = '';
      if (currentFolderFilter) {
        const folder = folders.find(f => f.id === currentFolderFilter);
        label = folder && folder.id !== 'default' ? escapeHtml(folder.name) : i18n.t('folder_uncategorized');
      } else {
        label = `${i18n.t('label_tags')}: ${escapeHtml(currentTagFilter)}`;
      }
      wrap.innerHTML = `<span class="folder-breadcrumb" title="${i18n.t('back_to_all') || 'Back to all'}">&#9664; ${label}</span>`;
      // Click breadcrumb to go back to all prompts
      wrap.querySelector('.folder-breadcrumb').addEventListener('click', () => {
        currentFolderFilter = null;
        currentTagFilter = null;
        updatePromptsHeader();
        renderPrompts();
      });
    } else {
      wrap.innerHTML = '';
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
      renderPrompts();
      // Hide recent usage section when searching
      const section = document.getElementById('recent-usage-section');
      if (section) section.classList.add('hidden');
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
      renderPinned(),
      renderRecentUsage(),
    ]);
  }

  function getSearchTerms(query) {
    if (!query) return [];
    const filters = Storage.parseSearchQuery(query);
    return [...filters.terms, ...filters.titleTerms, ...filters.tags, ...filters.folders]
      .map(term => term.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightMatches(text, terms) {
    const value = String(text || '');
    if (!terms.length) return escapeHtml(value);

    const pattern = terms.map(escapeRegExp).filter(Boolean).join('|');
    if (!pattern) return escapeHtml(value);

    return value
      .split(new RegExp(`(${pattern})`, 'gi'))
      .map(part => {
        const isMatch = new RegExp(`^(${pattern})$`, 'i').test(part);
        return isMatch
          ? `<mark class="search-highlight">${escapeHtml(part)}</mark>`
          : escapeHtml(part);
      })
      .join('');
  }

  function buildPromptSnippet(content, terms, maxLength = 150) {
    const text = String(content || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length <= maxLength || !terms.length) {
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    const lowerText = text.toLowerCase();
    const hitIndex = terms
      .map(term => lowerText.indexOf(term.toLowerCase()))
      .filter(index => index >= 0)
      .sort((a, b) => a - b)[0];

    if (hitIndex == null) return text.substring(0, maxLength) + '...';

    const context = Math.floor(maxLength / 2);
    const start = Math.max(0, hitIndex - context);
    const end = Math.min(text.length, start + maxLength);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';
    return prefix + text.slice(start, end) + suffix;
  }

  function promptHasVariables(prompt) {
    return /\{\{\s*[^{}]+\s*\}\}/.test(prompt.content || '');
  }

  function renderPromptStatusChips(prompt) {
    return promptHasVariables(prompt)
      ? `<span class="prompt-card-status variable">${i18n.t('card_has_variables')}</span>`
      : '';
  }

  function renderClickHint() {
    return `<span class="prompt-card-click-hint">${i18n.t('card_click_to_copy')}</span>`;
  }

  function showCardCopiedFeedback(promptId) {
    document.querySelectorAll('.prompt-card').forEach(card => {
      if (card.dataset.id !== promptId) return;
      const hint = card.querySelector('.prompt-card-click-hint');
      card.classList.add('copied');
      if (hint) hint.textContent = i18n.t('card_copied');
      setTimeout(() => {
        card.classList.remove('copied');
        if (hint) hint.textContent = i18n.t('card_click_to_copy');
      }, 1000);
    });
  }

  function compareSmartPrompts(a, b) {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;

    return (
      (b.lastUsedAt || 0) - (a.lastUsedAt || 0) ||
      (b.usageCount || 0) - (a.usageCount || 0) ||
      (b.updatedAt || 0) - (a.updatedAt || 0) ||
      (b.createdAt || 0) - (a.createdAt || 0) ||
      String(a.title || '').localeCompare(String(b.title || ''), i18n.getLocale())
    );
  }

  function comparePromptsBySortMode(a, b, sortMode) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    switch (sortMode) {
      case 'smart':
        return compareSmartPrompts(a, b);
      case 'recent':
        return (b.lastUsedAt || 0) - (a.lastUsedAt || 0) ||
          (b.updatedAt || 0) - (a.updatedAt || 0);
      case 'updatedAt':
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      case 'createdAt':
        return (b.createdAt || 0) - (a.createdAt || 0);
      case 'title':
        return (a.title || '').localeCompare(b.title || '', i18n.getLocale());
      case 'usageCount':
        return (b.usageCount || 0) - (a.usageCount || 0) ||
          (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
      case 'custom': {
        const aHasOrder = Number.isFinite(a.sortOrder);
        const bHasOrder = Number.isFinite(b.sortOrder);
        if (aHasOrder && bHasOrder && a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
        return compareSmartPrompts(a, b);
      }
      default:
        return compareSmartPrompts(a, b);
    }
  }

  function comparePromptsByCurrentSort(a, b) {
    return comparePromptsBySortMode(a, b, currentSortMode);
  }

  function getGroupPromptSortMode() {
    switch (currentGroupSortMode) {
      case 'recent':
        return 'recent';
      case 'updatedAt':
        return 'updatedAt';
      case 'usageCount':
        return 'usageCount';
      case 'custom':
        return 'custom';
      case 'folderName':
      default:
        return 'smart';
    }
  }

  function getGroupSortMetric(prompts, mode) {
    if (!prompts || prompts.length === 0) return 0;

    switch (mode) {
      case 'recent':
        return Math.max(...prompts.map(p => p.lastUsedAt || 0));
      case 'updatedAt':
        return Math.max(...prompts.map(p => p.updatedAt || 0));
      case 'usageCount':
        return prompts.reduce((sum, p) => sum + (p.usageCount || 0), 0);
      case 'custom':
        return Math.min(...prompts.map(p => Number.isFinite(p.sortOrder) ? p.sortOrder : Number.MAX_SAFE_INTEGER));
      case 'folderName':
      default:
        return 0;
    }
  }

  function tooltipAttrs(label, placement = 'top') {
    const safeLabel = escapeHtml(label);
    return `aria-label="${safeLabel}" data-tooltip="${safeLabel}" data-tooltip-placement="${placement}"`;
  }

  function renderFilterChip(type, label, value) {
    return `
      <span class="search-filter-chip" title="${escapeHtml(value)}">
        <span>${escapeHtml(label)}: ${escapeHtml(value)}</span>
        <button type="button" data-clear-filter="${type}" ${tooltipAttrs(i18n.t('clear_filter'))}>×</button>
      </span>
    `;
  }

  function updateSearchContext(resultCount, query, folders) {
    const context = document.getElementById('search-context');
    if (!context) return;

    const parts = [];
    if (query || currentFolderFilter || currentTagFilter) {
      parts.push(`<span class="search-result-count">${i18n.t('search_results_count', resultCount)}</span>`);
    }

    if (query) parts.push(renderFilterChip('query', i18n.t('filter_search'), query));
    if (currentFolderFilter) {
      const folder = folders.find(f => f.id === currentFolderFilter);
      const folderName = folder && folder.id !== 'default' ? folder.name : i18n.t('folder_uncategorized');
      parts.push(renderFilterChip('folder', i18n.t('filter_folder'), folderName));
    }
    if (currentTagFilter) parts.push(renderFilterChip('tag', i18n.t('filter_tag'), currentTagFilter));

    if (!parts.length && document.activeElement === document.getElementById('search-input')) {
      parts.push(`
        <span class="search-tip">
          ${i18n.t('search_syntax_tip')}
        </span>
      `);
    }

    if (!query && !currentFolderFilter && !currentTagFilter && getActiveSortMode() === 'custom' && currentTab === 'prompts') {
      parts.push(`
        <span class="search-tip sort-drag-tip">
          ${i18n.t('sort_custom_hint')}
        </span>
      `);
    }

    context.innerHTML = parts.join('');
    context.classList.toggle('hidden', parts.length === 0);
  }

  /**
   * Render prompts list
   */
  async function renderPrompts(prompts = null) {
    const container = document.getElementById('prompts-list');
    const emptyState = document.getElementById('prompts-empty');
    const query = document.getElementById('search-input').value.trim();
    const folders = await Storage.getFolders();
    const searchTerms = getSearchTerms(query);

    if (!prompts) {
      prompts = await getBasePrompts();
    }

    if (query) {
      prompts = Storage.filterAndRankPrompts(prompts, query, { folders });
    }

    if (prompts.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      const emptyActionBtn = document.getElementById('btn-empty-new-prompt');
      if (query) {
        emptyState.querySelector('p').textContent = i18n.t('empty_no_search_results');
        emptyState.querySelector('.empty-hint').textContent = i18n.t('empty_search_hint');
        if (emptyActionBtn) emptyActionBtn.textContent = i18n.t('empty_action_clear_search');
      } else if (currentFolderFilter || currentTagFilter) {
        emptyState.querySelector('p').textContent = i18n.t('empty_no_filtered_prompts');
        emptyState.querySelector('.empty-hint').textContent = i18n.t('empty_filter_hint');
        if (emptyActionBtn) emptyActionBtn.textContent = i18n.t('empty_action_view_all');
      } else {
        emptyState.querySelector('p').textContent = i18n.t('empty_no_prompts');
        emptyState.querySelector('.empty-hint').textContent = i18n.t('empty_prompts_hint');
        if (emptyActionBtn) emptyActionBtn.textContent = i18n.t('empty_action_new_prompt');
      }
      document.getElementById('batch-actions-bar').classList.add('hidden');
      return;
    }

    const shouldRenderGrouped = displayMode === 'grouped' && !query && !currentFolderFilter && !currentTagFilter;

    // Sort normally when browsing. Search results keep relevance order from Storage.filterAndRankPrompts.
    if (!query && !shouldRenderGrouped) {
      prompts.sort(comparePromptsByCurrentSort);
    }

    updateSearchContext(prompts.length, query, folders);

    // Delegate to grouped renderer if in grouped mode
    if (shouldRenderGrouped) {
      await renderPromptsGrouped(container, emptyState, prompts);
      return;
    }

    emptyState.classList.add('hidden');
    container.innerHTML = prompts.map(prompt => {
      const folder = folders.find(f => f.id === prompt.folder);
      const folderName = folder && folder.id !== 'default' ? escapeHtml(folder.name) : i18n.t('folder_uncategorized');
      const folderColor = folder ? folder.color : '#808080';
      const isSelected = selectedPromptIds.has(prompt.id);
      const titleHtml = highlightMatches(prompt.title, searchTerms);
      const snippetHtml = highlightMatches(buildPromptSnippet(prompt.content, searchTerms), searchTerms);
      const tagsHtml = (prompt.tags || [])
        .map(tag => `<span class="prompt-card-tag">${highlightMatches(tag, searchTerms)}</span>`)
        .join('');
      const statusChipsHtml = renderPromptStatusChips(prompt);

      if (isBatchMode) {
        return `
          <div class="prompt-card ${isSelected ? 'selected' : ''}" data-id="${prompt.id}" data-batch-select="true">
            <div class="batch-checkbox">
              <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${prompt.id}">
            </div>
            <div class="prompt-card-content">
              <div class="prompt-card-header">
                <div class="prompt-card-title">${titleHtml}</div>
              </div>
              <div class="prompt-card-preview">${snippetHtml}</div>
              <div class="prompt-card-meta">
                <span class="prompt-card-folder" style="border-left: 3px solid ${folderColor}">${escapeHtml(folderName)}</span>
                ${tagsHtml}
                ${statusChipsHtml}
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="prompt-card" data-id="${prompt.id}">
            <div class="prompt-card-header">
              <div class="prompt-card-title">${titleHtml}</div>
              <div class="prompt-card-actions">
                <button class="prompt-card-action edit" ${tooltipAttrs(i18n.t('btn_edit'))} data-id="${prompt.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="prompt-card-action pin ${prompt.pinned ? 'active' : ''}" ${tooltipAttrs(i18n.t('btn_pin'))} data-id="${prompt.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="${prompt.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="17" x2="12" y2="22"></line>
                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path>
                  </svg>
                </button>
                <button class="prompt-card-action delete" ${tooltipAttrs(i18n.t('btn_delete'))} data-id="${prompt.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="prompt-card-preview">${snippetHtml}</div>
            <div class="prompt-card-meta">
              <span class="prompt-card-folder" style="border-left: 3px solid ${folderColor}">${escapeHtml(folderName)}</span>
              ${tagsHtml}
              ${statusChipsHtml}
              ${prompt.usageCount > 0 ? `<span class="prompt-card-usage">${i18n.t('usage_stats', prompt.usageCount, formatRelativeTime(prompt.lastUsedAt))}</span>` : ''}
              ${renderClickHint()}
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
          if (isPromptDragSorting || Date.now() < suppressPromptCardClickUntil) return;
          if (!e.target.closest('.prompt-card-action')) {
            copyPromptToClipboard(card.dataset.id);
          }
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

    // Init drag-and-drop if in custom sort mode
    initDragAndDrop(container);
  }

  /**
   * Render prompts grouped by folder
   */
  async function renderPromptsGrouped(container, emptyState, prompts) {
    const folders = await Storage.getFolders();

    // Group prompts by folder
    const groups = {};
    folders.forEach(f => { groups[f.id] = []; });
    // Ensure default folder exists
    if (!groups['default']) groups['default'] = [];
    prompts.forEach(p => {
      const fid = p.folder || 'default';
      if (!groups[fid]) groups[fid] = [];
      groups[fid].push(p);
    });

    const folderMap = folders.reduce((map, folder) => {
      map[folder.id] = folder;
      return map;
    }, {});

    const folderNameForSort = (folderId) => {
      const folder = folderMap[folderId];
      if (!folder || folder.id === 'default') return i18n.t('folder_uncategorized');
      return folder.name || '';
    };

    const compareFolderName = (a, b) => {
      if (a === 'default' && b !== 'default') return -1;
      if (b === 'default' && a !== 'default') return 1;
      return folderNameForSort(a).localeCompare(folderNameForSort(b), i18n.getLocale());
    };

    const folderOrder = Object.keys(groups)
      .filter(fid => groups[fid] && groups[fid].length > 0)
      .sort((a, b) => {
        if (currentGroupSortMode === 'folderName' || currentGroupSortMode === 'custom') {
          return compareFolderName(a, b);
        }

        const aMetric = getGroupSortMetric(groups[a], currentGroupSortMode);
        const bMetric = getGroupSortMetric(groups[b], currentGroupSortMode);
        return bMetric - aMetric || compareFolderName(a, b);
      });

    const hasAny = folderOrder.some(fid => groups[fid] && groups[fid].length > 0);
    if (!hasAny) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.querySelector('p').textContent = i18n.t('empty_no_prompts');
      emptyState.querySelector('.empty-hint').textContent = i18n.t('empty_prompts_hint');
      const emptyActionBtn = document.getElementById('btn-empty-new-prompt');
      if (emptyActionBtn) emptyActionBtn.textContent = i18n.t('empty_action_new_prompt');
      return;
    }

    emptyState.classList.add('hidden');

    container.innerHTML = folderOrder.map(fid => {
      const groupPrompts = groups[fid];
      if (!groupPrompts || groupPrompts.length === 0) return '';
      groupPrompts.sort((a, b) => comparePromptsBySortMode(a, b, getGroupPromptSortMode()));

      const folder = folderMap[fid];
      const folderName = folder && folder.id !== 'default' ? escapeHtml(folder.name) : i18n.t('folder_uncategorized');
      const folderColor = folder ? folder.color : '#808080';
      const countLabel = i18n.getLocale() === 'zh'
        ? `${groupPrompts.length} 条`
        : `${groupPrompts.length} item${groupPrompts.length === 1 ? '' : 's'}`;

      const cardsHtml = groupPrompts.map(prompt => {
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
                  ${(prompt.tags || []).map(tag => `<span class="prompt-card-tag">${escapeHtml(tag)}</span>`).join('')}
                  ${renderPromptStatusChips(prompt)}
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
                  <button class="prompt-card-action edit" ${tooltipAttrs(i18n.t('btn_edit'))} data-id="${prompt.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button class="prompt-card-action pin ${prompt.pinned ? 'active' : ''}" ${tooltipAttrs(i18n.t('btn_pin'))} data-id="${prompt.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${prompt.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="17" x2="12" y2="22"></line>
                      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path>
                    </svg>
                  </button>
                  <button class="prompt-card-action delete" ${tooltipAttrs(i18n.t('btn_delete'))} data-id="${prompt.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="prompt-card-preview">${escapeHtml((prompt.content || '').substring(0, 150))}${(prompt.content || '').length > 150 ? '...' : ''}</div>
              <div class="prompt-card-meta">
                ${(prompt.tags || []).map(tag => `<span class="prompt-card-tag">${escapeHtml(tag)}</span>`).join('')}
                ${renderPromptStatusChips(prompt)}
                ${prompt.usageCount > 0 ? `<span class="prompt-card-usage">${i18n.t('usage_stats', prompt.usageCount, formatRelativeTime(prompt.lastUsedAt))}</span>` : ''}
                ${renderClickHint()}
              </div>
            </div>
          `;
        }
      }).join('');

      return `
        <div class="folder-group" data-folder-id="${fid}">
          <div class="folder-group-header" data-folder-id="${fid}">
            <span class="folder-group-arrow">▾</span>
            <span class="folder-group-dot" style="background:${folderColor}"></span>
            <span class="folder-group-name">${folderName}</span>
            <span class="folder-group-line"></span>
            <span class="folder-group-count">${countLabel}</span>
          </div>
          <div class="folder-group-list">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners (same as list mode)
    if (isBatchMode) {
      container.querySelectorAll('.prompt-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const id = card.dataset.id;
          togglePromptSelection(id);
        });
      });
      updateBatchActionsBar();
    } else {
      container.querySelectorAll('.prompt-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (isPromptDragSorting || Date.now() < suppressPromptCardClickUntil) return;
          if (!e.target.closest('.prompt-card-action')) {
            copyPromptToClipboard(card.dataset.id);
          }
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
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          confirmDelete('prompt', btn.dataset.id);
        });
      });
    }

    // Folder group collapse/expand
    container.querySelectorAll('.folder-group-header').forEach(header => {
      header.addEventListener('click', () => {
        const group = header.closest('.folder-group');
        const list = group.querySelector('.folder-group-list');
        const arrow = header.querySelector('.folder-group-arrow');
        if (list.classList.contains('hidden')) {
          list.classList.remove('hidden');
          arrow.textContent = '▾';
        } else {
          list.classList.add('hidden');
          arrow.textContent = '▸';
        }
      });
    });

    // Init drag-and-drop if in custom sort mode (per group)
    container.querySelectorAll('.folder-group-list').forEach(list => {
      initDragAndDrop(list);
    });
  }

  /**
   * Initialize drag-and-drop for prompt cards (custom sort mode only)
   */
  function initDragAndDrop(container) {
    if (!container) return;
    // Only enable in custom sort mode and not in batch mode
    if (getActiveSortMode() !== 'custom' || isBatchMode) {
      container.querySelectorAll('.prompt-card').forEach(card => {
        card.removeAttribute('draggable');
        card.classList.remove('draggable-card');
      });
      return;
    }

    const cards = container.querySelectorAll('.prompt-card');
    cards.forEach(card => {
      card.setAttribute('draggable', 'true');
      card.classList.add('draggable-card');

      card.addEventListener('dragstart', (e) => {
        isPromptDragSorting = true;
        suppressPromptCardClickUntil = Date.now() + 500;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        container.querySelectorAll('.prompt-card').forEach(c => {
          c.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        suppressPromptCardClickUntil = Date.now() + 300;
        setTimeout(() => {
          isPromptDragSorting = false;
        }, 300);
      });
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const afterElement = _getDragAfterElement(container, e.clientY);
      const draggable = container.querySelector('.dragging');
      container.querySelectorAll('.prompt-card').forEach(c => {
        c.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      if (afterElement && afterElement.element && afterElement.element !== draggable) {
        afterElement.element.classList.add(afterElement.position === 'before' ? 'drag-over-top' : 'drag-over-bottom');
      }
    });

    container.addEventListener('dragleave', (e) => {
      if (!container.contains(e.relatedTarget)) {
        container.querySelectorAll('.prompt-card').forEach(c => {
          c.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      }
    });

    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId) return;

      container.querySelectorAll('.prompt-card').forEach(c => {
        c.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      // Move the dragged card in the DOM to the correct position
      const draggedCard = container.querySelector(`[data-id="${draggedId}"]`);
      const afterResult = _getDragAfterElement(container, e.clientY);
      if (draggedCard && afterResult && afterResult.element) {
        if (afterResult.position === 'before') {
          container.insertBefore(draggedCard, afterResult.element);
        } else {
          container.insertBefore(draggedCard, afterResult.element.nextSibling);
        }
      }

      // Collect new order from DOM
      const orderedIds = [...container.querySelectorAll('.prompt-card')].map(c => c.dataset.id);

      // Save new order
      await Storage.reorderPrompts(orderedIds);
      await renderAll();
    });
  }

  /**
   * Helper: find the element to insert before/after based on mouse Y
   */
  function _getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.prompt-card:not(.dragging)')];
    let closestElement = null;
    let closestOffset = -Infinity;
    let closestPosition = 'before';

    for (const element of draggableElements) {
      const box = element.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closestElement = element;
        closestPosition = offset < -box.height / 4 ? 'before' : 'after';
      } else if (offset >= 0 && (closestElement === null || offset < closestOffset || closestOffset < 0)) {
        if (offset >= 0 && offset < box.height / 2) {
          closestOffset = offset;
          closestElement = element;
          closestPosition = 'after';
        }
      }
    }

    // If no closest found, find the last element
    if (!closestElement && draggableElements.length > 0) {
      closestElement = draggableElements[draggableElements.length - 1];
      closestPosition = 'after';
    }

    return { element: closestElement, position: closestPosition };
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
              <button class="prompt-card-action edit" ${tooltipAttrs(i18n.t('btn_edit'))} data-id="${folder.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="prompt-card-action delete" ${tooltipAttrs(i18n.t('btn_delete'))} data-id="${folder.id}">
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
          <button class="tag-item-delete" data-tag="${escapeHtml(tag)}" ${tooltipAttrs(i18n.t('btn_delete'))}>×</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.tag-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tag-item-delete')) {
          currentTagFilter = item.dataset.tag;
          currentFolderFilter = null;
          switchTab('prompts', true);
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
              <button class="prompt-card-action copy" ${tooltipAttrs(i18n.t('btn_copy'))} data-id="${prompt.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button class="prompt-card-action use" ${tooltipAttrs(i18n.t('btn_use'))} data-id="${prompt.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <button class="prompt-card-action edit" ${tooltipAttrs(i18n.t('btn_edit'))} data-id="${prompt.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="prompt-card-action pin active" ${tooltipAttrs(i18n.t('btn_pin'))} data-id="${prompt.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="17" x2="12" y2="22"></line>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"></path>
                </svg>
              </button>
              <button class="prompt-card-action delete" ${tooltipAttrs(i18n.t('btn_delete'))} data-id="${prompt.id}">
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
            ${renderPromptStatusChips(prompt)}
            ${prompt.usageCount > 0 ? `<span class="prompt-card-usage">${i18n.t('usage_stats', prompt.usageCount, formatRelativeTime(prompt.lastUsedAt))}</span>` : ''}
            ${renderClickHint()}
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
   * Render recent usage section on home page (top 5)
   */
  async function renderRecentUsage() {
    const section = document.getElementById('recent-usage-section');
    const list = document.getElementById('recent-usage-list');
    if (!section || !list) return;

    // Check settings: hide if showRecent is disabled
    const settings = await Storage.getSettings();
    if (settings.showRecent === false) {
      section.classList.add('hidden');
      return;
    }

    // Only show on prompts tab
    if (currentTab !== 'prompts') {
      section.classList.add('hidden');
      return;
    }

    // Check if user collapsed it
    const arrow = section.querySelector('.recent-toggle-arrow');
    if (recentUsageCollapsed) {
      section.classList.add('collapsed');
      if (arrow) arrow.textContent = '▸';
    } else {
      section.classList.remove('collapsed');
      if (arrow) arrow.textContent = '▾';
    }

    const prompts = await Storage.getPrompts();
    const recent = prompts
      .filter(p => p.lastUsedAt > 0)
      .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
      .slice(0, 5);

    if (recent.length === 0) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');
    const folders = await Storage.getFolders();

    list.innerHTML = recent.map(prompt => {
      const folder = folders.find(f => f.id === prompt.folder);
      const folderName = folder && folder.id !== 'default' ? escapeHtml(folder.name) : i18n.t('folder_uncategorized');
      const folderColor = folder ? folder.color : '#808080';

      return `
        <div class="recent-usage-item" data-id="${prompt.id}">
          <div class="recent-usage-title">${escapeHtml(prompt.title)}</div>
          <div class="recent-usage-meta">
            <span class="recent-usage-folder" style="border-left: 3px solid ${folderColor}">${folderName}</span>
            <span class="recent-usage-time">${formatRelativeTime(prompt.lastUsedAt)}</span>
            <button class="recent-item-delete" data-id="${prompt.id}" ${tooltipAttrs(i18n.t('btn_delete'))}>×</button>
          </div>
        </div>
      `;
    }).join('');

    // Click to copy (excluding delete button)
    list.querySelectorAll('.recent-usage-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('recent-item-delete')) return;
        copyPromptToClipboard(item.dataset.id);
      });
    });

    // Delete single recent item
    list.querySelectorAll('.recent-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteRecentItem(btn.dataset.id);
      });
    });
  }

  /**
   * Delete single recent usage item (reset its usage stats)
   */
  async function deleteRecentItem(promptId) {
    const prompt = await Storage.getPrompt(promptId);
    if (!prompt) return;
    prompt.lastUsedAt = 0;
    prompt.usageCount = 0;
    await Storage.savePrompt(prompt);
    showToast(i18n.t('toast_deleted'), 'success');
    await renderAll();
  }

  /**
   * Clear all recent usage (reset all prompts' usage stats)
   */
  async function clearAllRecentUsage() {
    const prompts = await Storage.getPrompts();
    prompts.forEach(p => {
      p.lastUsedAt = 0;
      p.usageCount = 0;
    });
    for (const p of prompts) {
      await Storage.savePrompt(p);
    }
    recentUsageCollapsed = false;
    showToast(i18n.t('toast_cleared'), 'success');
    await renderAll();
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
      showToast(i18n.t('toast_error_empty_fields'), 'error');
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
      document.getElementById('folder-color').value = '#808080';
    }

    openModal('folder-modal');

    // Bind color presets (excluding custom color button)
    document.querySelectorAll('.color-preset:not(.custom-color-btn)').forEach(btn => {
      btn.onclick = () => {
        document.getElementById('folder-color').value = btn.dataset.color;
      };
    });

    // Bind custom color button
    const customColorBtn = document.getElementById('custom-color-btn');
    const customColorInput = document.getElementById('custom-color-input');
    if (customColorBtn && customColorInput) {
      setTooltip(customColorBtn, i18n.t('custom_color'));
      customColorBtn.onclick = () => {
        customColorInput.click();
      };
      customColorInput.onchange = () => {
        document.getElementById('folder-color').value = customColorInput.value;
      };
    }
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
    tagModalTitle.textContent = i18n.t('modal_new_tag') || '新建标签';
    tagInputLabel.textContent = i18n.t('label_name') || '名称';
    tagInput.placeholder = i18n.t('placeholder_tag') || '输入标签名称...';

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
    // Record usage (updates lastUsedAt so smart sort puts it on top)
    await Storage.recordUsage(promptId);
    showCardCopiedFeedback(promptId);
    showToast(i18n.t('toast_copied'), 'success');
    // Re-render so the just-used prompt moves to the top (if enabled)
    const settings = await Storage.getSettings();
    if (settings.autoTopAfterUse !== false) {
      renderPrompts();
    }
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

    // Record usage
    await Storage.recordUsage(promptId);
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
    } else if (type === 'clear_recent') {
      title.textContent = i18n.t('confirm_clear_recent');
      message.textContent = i18n.t('confirm_clear_recent_msg');
    }

    openModal('confirm-dialog');

    okBtn.onclick = async () => {
      if (type === 'prompt') {
        await Storage.deletePrompt(id);
        showToast(i18n.t('toast_deleted'), 'success');
      } else if (type === 'folder') {
        await Storage.deleteFolder(id);
        showToast(i18n.t('toast_deleted'), 'success');
      } else if (type === 'clear_recent') {
        await clearAllRecentUsage();
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

  function isPaypalDonationConfigured() {
    return /^https:\/\/.+/i.test(PAYPAL_DONATION_URL) &&
      !PAYPAL_DONATION_URL.includes('PLACEHOLDER');
  }

  function openExternalUrl(url) {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openPaypalSupport() {
    if (!isPaypalDonationConfigured()) {
      showToast(i18n.t('toast_paypal_coming_soon'), 'info');
      return;
    }
    openExternalUrl(PAYPAL_DONATION_URL);
  }

  function openWechatSupport() {
    openModal('support-modal');
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
    const sidebarCloseOutsideCheckbox = document.getElementById('setting-sidebar-close-outside');
    if (sidebarCloseOutsideCheckbox) sidebarCloseOutsideCheckbox.checked = settings.sidebarCloseOnOutside !== false;
    const sidebarCardClickSelect = document.getElementById('setting-sidebar-card-click');
    if (sidebarCardClickSelect) sidebarCardClickSelect.value = settings.sidebarCardClickAction || 'copy';

    const badgeCheckbox = document.getElementById('setting-show-badge');
    if (badgeCheckbox) badgeCheckbox.checked = settings.showBadge !== false;

    currentSortMode = settings.sortMode || currentSortMode;
    currentGroupSortMode = settings.groupSortMode || currentGroupSortMode;

    // Load display mode
    displayMode = settings.displayMode || 'list';
    const displayModeSelect = document.getElementById('setting-display-mode');
    if (displayModeSelect) displayModeSelect.value = displayMode;
    updateSortSelectOptions();

    // Load show recent
    const recentCheckbox = document.getElementById('setting-show-recent');
    if (recentCheckbox) recentCheckbox.checked = settings.showRecent !== false;

    // Load auto top after use
    const autoTopCheckbox = document.getElementById('setting-auto-top');
    if (autoTopCheckbox) autoTopCheckbox.checked = settings.autoTopAfterUse !== false;

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
    const newSidebarCloseOnOutside = document.getElementById('setting-sidebar-close-outside').checked;
    const newSidebarCardClickAction = document.getElementById('setting-sidebar-card-click').value;
    const newShowBadge = document.getElementById('setting-show-badge').checked;
    const newShowRecent = document.getElementById('setting-show-recent').checked;
    const newAutoTop = document.getElementById('setting-auto-top')?.checked;
    const newDefaultFolder = document.getElementById('setting-default-folder').value;
    const newDisplayMode = document.getElementById('setting-display-mode').value;

    // Detect what changed
    const langChanged = newLang !== settings.locale;
    const badgeChanged = newShowBadge !== (settings.showBadge !== false);
    const recentChanged = newShowRecent !== (settings.showRecent !== false);
    const displayModeChanged = newDisplayMode !== (settings.displayMode || 'list');

    // Update settings object
    settings.locale = newLang;
    settings.enableSidebar = newEnableSidebar;
    settings.sidebarCloseOnOutside = newSidebarCloseOnOutside;
    settings.sidebarCardClickAction = newSidebarCardClickAction;
    settings.showBadge = newShowBadge;
    settings.showRecent = newShowRecent;
    settings.autoTopAfterUse = newAutoTop;
    settings.defaultFolder = newDefaultFolder;
    settings.displayMode = newDisplayMode;

    await Storage.saveSettings(settings);

    // Apply language change immediately
    if (langChanged) {
      await i18n.setLocale(newLang);
      applyTranslations();
      await renderAll();
    }

    // Apply display mode change
    if (displayModeChanged) {
      displayMode = newDisplayMode;
      updateSortSelectOptions();
      await renderPrompts();
    }

    // Apply show recent change
    if (recentChanged) {
      await renderRecentUsage();
    }

    // Update badge (explicitly wait for background to process)
    if (badgeChanged) {
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

  /**
   * Format timestamp to relative time string
   * @param {number} timestamp - Unix timestamp (ms)
   * @returns {string} relative time string
   */
  function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return i18n.t('time_just_now');
    if (minutes < 60) return i18n.t('time_minutes_ago', minutes);
    if (hours < 24) return i18n.t('time_hours_ago', hours);
    if (days < 7) return i18n.t('time_days_ago', days);
    if (days < 30) return i18n.t('time_weeks_ago', Math.floor(days / 7));
    if (days < 365) return i18n.t('time_months_ago', Math.floor(days / 30));
    return i18n.t('time_years_ago', Math.floor(days / 365));
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
