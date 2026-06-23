/**
 * PromptVault Background Service Worker
 * Handles extension events and background tasks
 */

// Track tabs where scripts have been injected (for page refresh recovery)
const injectedTabs = new Set();

// Scripts to inject (in order)
const CONTENT_SCRIPTS = [
  'i18n.js',
  'storage.js',
  'universal-insert.js',
  'content.js',
  'sidebar.js',
  'command-palette.js'
];

/**
 * Inject all content scripts into a tab
 * @param {number} tabId - The tab ID to inject into
 * @returns {Promise<boolean>} - Whether injection was successful
 */
async function injectScripts(tabId) {
  try {
    // Check if tab still exists
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) {
      injectedTabs.delete(tabId);
      return false;
    }

    // Inject scripts sequentially (order matters)
    for (const file of CONTENT_SCRIPTS) {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [file]
      });
    }

    injectedTabs.add(tabId);
    console.log(`PromptVault: Scripts injected into tab ${tabId}`);
    return true;
  } catch (error) {
    // Tab might not be ready or might not have activeTab permission
    console.log(`PromptVault: Failed to inject scripts into tab ${tabId}:`, error.message);
    return false;
  }
}

/**
 * Ensure scripts are injected into a tab (inject if not already done)
 * @param {number} tabId - The tab ID
 * @returns {Promise<boolean>} - Whether scripts are ready
 */
async function ensureScriptsInjected(tabId) {
  if (injectedTabs.has(tabId)) {
    // Double-check by sending a ping
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return true; // Scripts are already running
    } catch (e) {
      // Scripts not responding, need to re-inject
      injectedTabs.delete(tabId);
    }
  }

  // Need to inject
  return await injectScripts(tabId);
}

// Inline minimal i18n for background service worker (avoids importScripts issues in MV3)
const i18n = (() => {
  const translations = {
    zh: {
      ctx_save_as_prompt: '保存为提示词',
      ctx_insert_prompt: '插入提示词',
      app_title: 'PromptVault',
      notif_prompt_saved: '提示词已保存！',
    },
    en: {
      ctx_save_as_prompt: 'Save as Prompt',
      ctx_insert_prompt: 'Insert Prompt',
      app_title: 'PromptVault',
      notif_prompt_saved: 'Prompt saved!',
    },
  };
  let currentLocale = 'zh';

  async function loadLocale() {
    try {
      const data = await chrome.storage.local.get('promptvault_data');
      const store = data.promptvault_data;
      if (store && store.settings && store.settings.locale) {
        currentLocale = store.settings.locale;
      }
    } catch (e) {
      currentLocale = 'zh';
    }
  }

  function t(key) {
    return (translations[currentLocale] && translations[currentLocale][key]) || key;
  }

  function setLocale(locale) {
    currentLocale = locale;
  }

  return { t, setLocale, loadLocale };
})();

// Load locale on service worker startup, then create context menus
i18n.loadLocale().then(() => {
  createContextMenus();
}).catch(() => {
  createContextMenus(); // Create anyway even if locale load fails
});

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  // Load locale before creating context menus
  await i18n.loadLocale();

  if (details.reason === 'install') {
    console.log('PromptVault installed');
    await initializeStorage();

    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
    // Mark as not seen welcome (redundant but safe)
    chrome.storage.local.set({ promptvault_hasSeenWelcome: false });
  } else if (details.reason === 'update') {
    console.log('PromptVault updated to version', chrome.runtime.getManifest().version);
    // Recreate context menus on update (menus may be cleared)
    createContextMenus();
  }
});

function createContextMenus() {
  // Remove all existing menus first
  chrome.contextMenus.removeAll(() => {
    // Save as prompt (when text is selected)
    chrome.contextMenus.create({
      id: 'saveAsPrompt',
      title: '💾 ' + i18n.t('ctx_save_as_prompt'),
      contexts: ['selection']
    });

    // Insert prompt (when in editable area)
    chrome.contextMenus.create({
      id: 'insertPrompt',
      title: '📋 ' + i18n.t('ctx_insert_prompt'),
      contexts: ['editable']
    });
  });
}

// Update context menu title when locale changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.promptvault_data) {
    const newData = changes.promptvault_data.newValue;
    if (newData && newData.settings && newData.settings.locale) {
      i18n.setLocale(newData.settings.locale);
      // Update context menu titles (MV3: returns promise, need .catch)
      chrome.contextMenus.update('saveAsPrompt', {
        title: i18n.t('ctx_save_as_prompt')
      }).catch(() => {});
      chrome.contextMenus.update('insertPrompt', {
        title: i18n.t('ctx_insert_prompt')
      }).catch(() => {});
    }
  }
});

// Listen for messages from content script or popup (single merged listener)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Sync handlers: call sendResponse immediately, return false
  if (message.action === 'openPopup') {
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'updateBadge') {
    updateBadge();
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'ping') {
    sendResponse({ pong: true });
    return false;
  }

  // Async handlers: keep message channel open
  if (message.action === 'savePrompt') {
    savePromptFromPage(message.prompt)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ error: error.message }));
    return true; // async
  }

  if (message.action === 'injectScripts') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const result = await injectScripts(tabs[0].id);
        sendResponse({ success: result });
      } else {
        sendResponse({ success: false, error: 'No active tab' });
      }
    });
    return true; // async
  }

  // Unknown action: close channel
  return false;
});

/**
 * Initialize storage with default data
 */
async function initializeStorage() {
  const defaultData = {
    prompts: [],
    folders: [
      { id: 'default', name: 'Default', color: '#808080' }
    ],
    settings: { darkMode: true, defaultFolder: 'default', locale: 'zh', enableSidebar: true, showBadge: true }
  };

  await chrome.storage.local.set({ promptvault_data: defaultData });
}

/**
 * Save prompt from page context menu
 */
async function savePromptFromPage(promptData) {
  try {
    const data = await chrome.storage.local.get('promptvault_data');
      const store = data.promptvault_data || {
        prompts: [],
        folders: [{ id: 'default', name: 'Default', color: '#808080' }],
        settings: { darkMode: true, defaultFolder: 'default', locale: 'zh', enableSidebar: true, showBadge: true }
      };

        const prompt = {
          id: generateId(),
          title: promptData.title || i18n.t('default_prompt_title'),
          content: promptData.content,
          folder: promptData.folder || 'default',
          pinned: false,
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

    store.prompts.push(prompt);
    await chrome.storage.local.set({ promptvault_data: store });

    return { success: true, prompt };
  } catch (error) {
    console.error('Error saving prompt:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Generate a short title from text (max 20 chars)
 */
function generateShortTitle(text) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= 20) return trimmed;
  return trimmed.substring(0, 20) + '...';
}

// Context menu for saving selected text as prompt
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'saveAsPrompt') {
      const selectedText = info.selectionText;

      if (selectedText) {
        // Save to storage
        const data = await chrome.storage.local.get('promptvault_data');
        const store = data.promptvault_data || {
          prompts: [],
          folders: [{ id: 'default', name: 'Default', color: '#808080' }],
          settings: { darkMode: true, defaultFolder: 'default', locale: 'zh', enableSidebar: true, showBadge: true }
        };

        const prompt = {
          id: generateId(),
          title: generateShortTitle(selectedText),
          content: selectedText,
          folder: 'default',
          pinned: false,
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        store.prompts.push(prompt);
        await chrome.storage.local.set({ promptvault_data: store });

        // Notify user
        if (chrome.notifications) {
          try {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: i18n.t('app_title'),
              message: i18n.t('notif_prompt_saved')
            });
          } catch (e) {
            console.log('Notification failed:', e.message);
          }
        }
      }
    }

    if (info.menuItemId === 'insertPrompt') {
      // Ensure scripts are injected, then tell content script to show prompt picker
      if (tab && tab.id) {
        const injected = await ensureScriptsInjected(tab.id);
        if (injected) {
          chrome.tabs.sendMessage(tab.id, { action: 'showPromptPicker' });
        } else {
          console.log('PromptVault: Could not inject scripts into tab', tab.id);
        }
      }
    }
  });
}

// Handle keyboard shortcuts
if (chrome.commands) {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open-promptvault') {
      chrome.action.openPopup();
    }
    if (command === 'open-command-palette') {
      // Ensure scripts are injected, then open command palette
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        const injected = await ensureScriptsInjected(tabs[0].id);
        if (injected) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'openCommandPalette' });
        } else {
          console.log('PromptVault: Could not inject scripts into current tab');
        }
      }
    }
  });
}

// Badge update for prompt count
async function updateBadge() {
  const data = await chrome.storage.local.get('promptvault_data');
  const store = data.promptvault_data;

  // Check showBadge setting (default true if not set)
  const showBadge = store && store.settings ? store.settings.showBadge !== false : true;
  if (!showBadge) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  if (store && store.prompts) {
    const count = store.prompts.length;
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4a9eff' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
}

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.promptvault_data) {
    updateBadge();
  }
});

// Initialize badge on startup
updateBadge();

// Listen for tab updates (page refresh) to re-inject scripts
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && injectedTabs.has(tabId)) {
    // Page refreshed, re-inject scripts
    injectScripts(tabId).catch(err => {
      console.log('PromptVault: Failed to re-inject scripts on page refresh:', err.message);
    });
  }
});

// Listen for tab removal to clean up injectedTabs
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});



console.log('PromptVault background service worker loaded');
