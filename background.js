/**
 * PromptVault Background Service Worker
 * Handles extension events and background tasks
 */

// Load i18n module
importScripts('i18n.js');

// Load stored locale
i18n.loadLocale();

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('PromptVault installed');
    await initializeStorage();
  } else if (details.reason === 'update') {
    console.log('PromptVault updated to version', chrome.runtime.getManifest().version);
  }

  // Create context menu with i18n
  try {
    chrome.contextMenus.create({
      id: 'saveAsPrompt',
      title: i18n.t('ctx_save_as_prompt'),
      contexts: ['selection']
    });
  } catch (e) {
    console.log('Context menu not available:', e.message);
  }
});

// Update context menu title when locale changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.promptvault_data) {
    const newData = changes.promptvault_data.newValue;
    if (newData && newData.settings && newData.settings.locale) {
      i18n.setLocale(newData.settings.locale);
      // Update context menu title
      try {
        chrome.contextMenus.update('saveAsPrompt', {
          title: i18n.t('ctx_save_as_prompt')
        });
      } catch (e) {}
    }
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    sendResponse({ success: true });
  }

  if (message.action === 'savePrompt') {
    savePromptFromPage(message.prompt)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  return true;
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
    tags: [],
    settings: { darkMode: true, defaultFolder: 'default' }
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
      tags: [],
      settings: { darkMode: true, defaultFolder: 'default' }
    };

    const prompt = {
      id: generateId(),
      title: promptData.title || 'Untitled Prompt',
      content: promptData.content,
      folder: promptData.folder || 'default',
      tags: promptData.tags || [],
      favorite: false,
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
          tags: [],
          settings: { darkMode: true, defaultFolder: 'default' }
        };

        const prompt = {
          id: generateId(),
          title: selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''),
          content: selectedText,
          folder: 'default',
          tags: [],
          favorite: false,
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
  });
}

// Handle keyboard shortcuts
if (chrome.commands) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-promptvault') {
      chrome.action.openPopup();
    }
  });
}

// Badge update for prompt count
async function updateBadge() {
  const data = await chrome.storage.local.get('promptvault_data');
  const store = data.promptvault_data;

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

console.log('PromptVault background service worker loaded');
