/**
 * PromptVault Content Script
 * Handles inserting prompts into text fields on any webpage.
 * Uses UniversalInsert engine for maximum compatibility.
 */

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'insertPrompt') {
    const success = UniversalInsert.insertText(message.text);
    sendResponse({ success });
  }

  if (message.action === 'copyPrompt') {
    UniversalInsert.copyToClipboard(message.text).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async
  }

  if (message.action === 'showPromptPicker') {
    // Open command palette
    if (window.PromptVaultCommandPalette) {
      window.PromptVaultCommandPalette.open();
    }
    sendResponse({ success: true });
  }

  return true;
});

// Keyboard shortcut: Ctrl/Cmd + Shift + P to open Command Palette
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: 'openCommandPalette' });
  }
});
