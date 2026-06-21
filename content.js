/**
 * PromptVault Content Script
 * Handles inserting prompts into text fields on web pages
 */

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'insertPrompt') {
    insertTextIntoActiveElement(message.text);
    sendResponse({ success: true });
  }
  return true;
});

/**
 * Insert text into the currently active element
 */
function insertTextIntoActiveElement(text) {
  const activeElement = document.activeElement;

  if (!activeElement) {
    showNotification(i18n.t('notif_no_active_input'));
    return;
  }

  // Handle different types of input elements
  if (activeElement.isContentEditable) {
    insertIntoContentEditable(activeElement, text);
  } else if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
    insertIntoInput(activeElement, text);
    } else {
    // Try to find an input element
    const input = findInputElement();
    if (input) {
      insertIntoInput(input, text);
    } else {
      showNotification(i18n.t('notif_no_input_found'));
    }
  }
}

/**
 * Insert text into contentEditable element
 */
function insertIntoContentEditable(element, text) {
  // Focus the element
  element.focus();

  // Use execCommand for better compatibility
  if (document.execCommand) {
    document.execCommand('insertText', false, text);
  } else {
    // Fallback to Selection API
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

/**
 * Insert text into input or textarea
 */
function insertIntoInput(element, text) {
  // Focus the element
  element.focus();

  // Get current selection
  const start = element.selectionStart;
  const end = element.selectionEnd;
  const value = element.value;

  // Insert text at cursor position
  element.value = value.substring(0, start) + text + value.substring(end);

  // Move cursor to end of inserted text
  const newCursorPos = start + text.length;
  element.setSelectionRange(newCursorPos, newCursorPos);

  // Trigger input event
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Find an input element on the page
 */
function findInputElement() {
  // Common selectors for AI chat inputs
  const selectors = [
    'textarea',
    'input[type="text"]',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '.chat-input',
    '#chat-input',
    '[data-testid*="input"]',
    '[data-testid*="textbox"]'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (isVisible(element)) {
        return element;
      }
    }
  }

  return null;
}

/**
 * Check if element is visible
 */
function isVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         style.opacity !== '0' &&
         element.offsetWidth > 0 &&
         element.offsetHeight > 0;
}

/**
 * Show notification on page
 */
function showNotification(message) {
  // Remove existing notification
  const existing = document.getElementById('promptvault-notification');
  if (existing) {
    existing.remove();
  }

  // Create notification
  const notification = document.createElement('div');
  notification.id = 'promptvault-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4757;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add keyboard shortcut listener
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Shift + P to open PromptVault
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: 'openPopup' });
  }
});
