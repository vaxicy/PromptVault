/**
 * PromptVault Welcome Page
 */
(async function () {
  'use strict';

  await i18n.loadLocale();
  applyTranslations();

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKbd = document.getElementById('welcome-shortcut-kbd');
  if (shortcutKbd) {
    shortcutKbd.textContent = isMac ? '⌘ + Shift + P' : 'Ctrl + Shift + P';
  }

  document.getElementById('welcome-get-started').addEventListener('click', () => {
    chrome.storage.local.set({ promptvault_hasSeenWelcome: true }, () => {
      window.close();
    });
  });

  document.getElementById('welcome-later').addEventListener('click', () => {
    chrome.storage.local.set({ promptvault_hasSeenWelcome: true }, () => {
      window.close();
    });
  });

  document.getElementById('welcome-close').addEventListener('click', () => {
    chrome.storage.local.set({ promptvault_hasSeenWelcome: true }, () => {
      window.close();
    });
  });

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const text = i18n.t(key);
      if (text) el.textContent = text;
    });
  }
})();
