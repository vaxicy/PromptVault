/**
 * PromptVault Content Script
 * Handles inserting prompts into text fields on any webpage.
 * Uses UniversalInsert engine for maximum compatibility.
 */

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ pong: true });
    return false;
  }

  if (message.action === 'insertPrompt') {
    try {
      const success = UniversalInsert.insertText(message.text);
      sendResponse({ success });
    } catch (err) {
      console.error('[PromptVault] insertPrompt error:', err);
      sendResponse({ success: false, error: err.message });
    }
    return false;
  }

  if (message.action === 'copyPrompt') {
    UniversalInsert.copyToClipboard(message.text)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async
  }

  if (message.action === 'showPromptPicker') {
    // Open command palette
    if (window.PromptVaultCommandPalette) {
      window.PromptVaultCommandPalette.open();
    }
    sendResponse({ success: true });
    return false;
  }

  return false;
});
