/**
 * Storage Module - Handles all Chrome storage operations
 * Uses Chrome Storage Local API
 */

// Idempotency guard: check window property (survives re-injection)
if (typeof window.PromptVaultStorage === 'undefined') {
  window.PromptVaultStorage = (() => {
  const STORAGE_KEY = 'promptvault_data';

  // Default data structure
  const defaultData = {
    prompts: [],
    tags: [],
    trash: [],
    folders: [
      { id: 'default', name: 'Default', color: '#808080' }
    ],
    settings: {
      darkMode: true,
      defaultFolder: 'default',
      locale: 'zh',
      showBadge: true,
      sortMode: 'smart',
      autoTopAfterUse: true,
      insertTopAfterUse: true,
      groupSortMode: 'folderName',
      // Opt-in: when false, deleting removes the prompt permanently
      enableTrash: false
    }
  };

  let warnedInvalidContext = false;

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function isExtensionContextError(error) {
    return String(error?.message || error || '').includes('Extension context invalidated');
  }

  function hasStorageAccess() {
    try {
      return Boolean(
        typeof chrome !== 'undefined' &&
        chrome.runtime?.id &&
        chrome.storage?.local
      );
    } catch (error) {
      return false;
    }
  }

  function warnInvalidContextOnce(error) {
    if (warnedInvalidContext) return;
    warnedInvalidContext = true;
    console.warn('[PromptVault] Extension context is no longer available. Please refresh the page.', error);
  }

  async function storageGet(key) {
    if (!hasStorageAccess()) return {};

    try {
      return await chrome.storage.local.get(key);
    } catch (error) {
      if (isExtensionContextError(error)) {
        warnInvalidContextOnce(error);
        return {};
      }
      throw error;
    }
  }

  async function storageSet(value) {
    if (!hasStorageAccess()) return false;

    try {
      await chrome.storage.local.set(value);
      return true;
    } catch (error) {
      if (isExtensionContextError(error)) {
        warnInvalidContextOnce(error);
        return false;
      }
      throw error;
    }
  }

  /**
   * Initialize storage with default data if not exists
   */
  async function init() {
    const data = await storageGet(STORAGE_KEY);
    if (!data[STORAGE_KEY]) {
      await storageSet({ [STORAGE_KEY]: cloneData(defaultData) });
      return cloneData(defaultData);
    }
    return data[STORAGE_KEY];
  }

  /**
   * Get all data from storage
   */
  async function getAll() {
    const data = await storageGet(STORAGE_KEY);
    return data[STORAGE_KEY] || cloneData(defaultData);
  }

  /**
   * Save all data to storage
   */
  async function saveAll(data) {
    await storageSet({ [STORAGE_KEY]: data });
  }

  /**
   * Get all prompts
   */
  async function getPrompts() {
    const data = await getAll();
    return data.prompts || [];
  }

  /**
   * Get a single prompt by ID
   */
  async function getPrompt(id) {
    const prompts = await getPrompts();
    return prompts.find(p => p.id === id);
  }

  /**
   * Save a prompt (create or update)
   */
  async function savePrompt(prompt) {
    const data = await getAll();
    const index = data.prompts.findIndex(p => p.id === prompt.id);

    if (index >= 0) {
      data.prompts[index] = prompt;
    } else {
      prompt.id = generateId();
      prompt.createdAt = Date.now();
      prompt.updatedAt = Date.now();
      data.prompts.push(prompt);
    }

    await saveAll(data);
    return prompt;
  }

  /**
   * Delete a prompt by ID.
   * When the trash is enabled the prompt is moved to `trash` (recoverable);
   * otherwise it is removed permanently.
   */
  async function deletePrompt(id) {
    const data = await getAll();
    const prompt = data.prompts.find(p => p.id === id);
    if (!prompt) return { trashed: false };

    if (data.settings?.enableTrash === true) {
      if (!data.trash) data.trash = [];
      // Avoid duplicate entries if the same id somehow gets deleted twice
      data.trash = data.trash.filter(t => t.id !== id);
      data.trash.unshift({ ...cloneData(prompt), deletedAt: Date.now() });
      data.prompts = data.prompts.filter(p => p.id !== id);
      await saveAll(data);
      return { trashed: true };
    }

    data.prompts = data.prompts.filter(p => p.id !== id);
    await saveAll(data);
    return { trashed: false };
  }

  /**
   * Get all prompts currently in the trash (newest first).
   */
  async function getTrash() {
    const data = await getAll();
    return data.trash || [];
  }

  /**
   * Restore a trashed prompt back into the prompt list.
   * If its original folder no longer exists, it falls back to 'default'.
   */
  async function restoreFromTrash(id) {
    const data = await getAll();
    const index = (data.trash || []).findIndex(p => p.id === id);
    if (index === -1) return false;

    const item = data.trash[index];
    const restored = cloneData(item);
    delete restored.deletedAt;

    const folderExists = (data.folders || []).some(f => f.id === restored.folder);
    if (!folderExists) restored.folder = 'default';

    data.trash.splice(index, 1);
    if (!data.prompts.some(p => p.id === restored.id)) {
      data.prompts.push(restored);
    }
    await saveAll(data);
    return true;
  }

  /**
   * Permanently remove a single item from the trash.
   */
  async function deleteFromTrash(id) {
    const data = await getAll();
    data.trash = (data.trash || []).filter(p => p.id !== id);
    await saveAll(data);
  }

  /**
   * Empty the entire trash.
   */
  async function emptyTrash() {
    const data = await getAll();
    const count = (data.trash || []).length;
    data.trash = [];
    await saveAll(data);
    return count;
  }

  /**
   * Reorder prompts by ID array (for custom drag-and-drop sort)
   * Assigns sortOrder to each prompt based on position in promptIds
   */
  async function reorderPrompts(promptIds) {
    const data = await getAll();
    promptIds.forEach((id, index) => {
      const prompt = data.prompts.find(p => p.id === id);
      if (prompt) prompt.sortOrder = index;
    });
    await saveAll(data);
  }

  /**
   * Toggle pin status of a prompt
   */
  async function togglePin(id) {
    const data = await getAll();
    const prompt = data.prompts.find(p => p.id === id);
    if (prompt) {
      prompt.pinned = !prompt.pinned;
      prompt.updatedAt = Date.now();
      await saveAll(data);
    }
    return prompt;
  }

  /**
   * Record prompt usage (increment count and update lastUsedAt)
   */
  async function recordUsage(id) {
    const data = await getAll();
    const prompt = data.prompts.find(p => p.id === id);
    if (prompt) {
      prompt.usageCount = (prompt.usageCount || 0) + 1;
      prompt.lastUsedAt = Date.now();
      await saveAll(data);
    }
    return prompt;
  }

  /**
   * Normalize search text for lightweight fuzzy matching.
   */
  function normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getFolderLabel(prompt, folderMap) {
    const folderId = prompt.folder || 'default';
    return folderMap[folderId] || folderId;
  }

  function parseSearchQuery(query) {
    const tokens = normalizeSearchText(query).match(/"[^"]+"|\S+/g) || [];
    const filters = {
      terms: [],
      folders: [],
      titleTerms: [],
      tags: [],
      pinned: null,
    };

    tokens.forEach(token => {
      const clean = token.replace(/^"|"$/g, '');
      const [rawKey, ...rest] = clean.split(':');
      const value = rest.join(':').trim();
      const key = rawKey.trim();

      if (value && key === 'folder') {
        filters.folders.push(value);
      } else if (value && key === 'title') {
        filters.titleTerms.push(value);
      } else if (value && key === 'tag') {
        filters.tags.push(value);
      } else if (value && key === 'is') {
        if (value === 'pinned' || value === 'favorite') filters.pinned = true;
        if (value === 'unpinned') filters.pinned = false;
      } else {
        filters.terms.push(clean);
      }
    });

    return filters;
  }

  function promptMatchesFilters(prompt, filters, folderLabel) {
    const title = normalizeSearchText(prompt.title);
    const content = normalizeSearchText(prompt.content);
    const folder = normalizeSearchText(folderLabel);
    const tags = (prompt.tags || []).map(t => normalizeSearchText(t));

    if (filters.pinned !== null && Boolean(prompt.pinned) !== filters.pinned) return false;

    const folderMatches = filters.folders.every(term => folder.includes(term));
    if (!folderMatches) return false;

    const titleMatches = filters.titleTerms.every(term => title.includes(term));
    if (!titleMatches) return false;

    const tagMatches = filters.tags.every(term =>
      tags.some(tag => tag.includes(term))
    );
    if (!tagMatches) return false;

    return filters.terms.every(term =>
      title.includes(term) ||
      content.includes(term) ||
      folder.includes(term) ||
      tags.some(tag => tag.includes(term))
    );
  }

  function getFieldScore(text, term, weights) {
    if (!term || !text.includes(term)) return 0;
    if (text === term) return weights.exact;
    if (text.startsWith(term)) return weights.prefix;
    return weights.contains;
  }

  function scorePrompt(prompt, filters, folderLabel) {
    const title = normalizeSearchText(prompt.title);
    const content = normalizeSearchText(prompt.content);
    const folder = normalizeSearchText(folderLabel);
    const allTerms = [...filters.terms, ...filters.titleTerms, ...filters.folders];

    let score = 0;
    allTerms.forEach(term => {
      score += getFieldScore(title, term, { exact: 120, prefix: 90, contains: 65 });
      score += getFieldScore(folder, term, { exact: 45, prefix: 35, contains: 25 });
      score += getFieldScore(content, term, { exact: 30, prefix: 22, contains: 12 });
    });

    if (prompt.pinned) score += 18;
    score += Math.min(prompt.usageCount || 0, 20) * 2;

    const lastUsedAt = prompt.lastUsedAt || 0;
    const weekAgo = Date.now() - 7 * 86400000;
    if (lastUsedAt > weekAgo) score += 16;

    return score;
  }

  /**
   * Filter and rank prompt arrays. Used by popup and command palette.
   */
  function filterAndRankPrompts(prompts, query, options = {}) {
    const trimmedQuery = String(query || '').trim();
    const folders = options.folders || [];
    const folderMap = folders.reduce((map, folder) => {
      map[folder.id] = folder.name;
      return map;
    }, { default: 'Default' });

    if (!trimmedQuery) return [...prompts];

    const filters = parseSearchQuery(trimmedQuery);
    return prompts
      .map(prompt => {
        const folderLabel = getFolderLabel(prompt, folderMap);
        if (!promptMatchesFilters(prompt, filters, folderLabel)) return null;
        return {
          prompt,
          score: scorePrompt(prompt, filters, folderLabel),
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        b.score - a.score ||
        (b.prompt.lastUsedAt || 0) - (a.prompt.lastUsedAt || 0) ||
        (b.prompt.updatedAt || 0) - (a.prompt.updatedAt || 0)
      )
      .map(item => item.prompt);
  }

  /**
   * Search prompts by query
   */
  async function searchPrompts(query) {
    const data = await getAll();
    return filterAndRankPrompts(data.prompts || [], query, { folders: data.folders || [] });
  }

  /**
   * Get prompts by folder
   */
  async function getPromptsByFolder(folderId) {
    const prompts = await getPrompts();
    return prompts.filter(p => p.folder === folderId);
  }

  /**
   * Get all folders
   */
  async function getFolders() {
    const data = await getAll();
    return data.folders || [];
  }

  /**
   * Save a folder (create or update)
   */
  async function saveFolder(folder) {
    const data = await getAll();
    const index = data.folders.findIndex(f => f.id === folder.id);

    if (index >= 0) {
      data.folders[index] = folder;
    } else {
      folder.id = generateId();
      data.folders.push(folder);
    }

    await saveAll(data);
    return folder;
  }

  /**
   * Delete a folder by ID
   */
  async function deleteFolder(id) {
    const data = await getAll();
    data.folders = data.folders.filter(f => f.id !== id);
    // Move prompts to default folder
    data.prompts.forEach(p => {
      if (p.folder === id) {
        p.folder = 'default';
      }
    });
    await saveAll(data);
  }

  /**
   * Export all data as JSON
   */
  async function exportData() {
    return await getAll();
  }

  /**
   * Import data from JSON
   */
  async function importData(jsonData) {
    // Merge with existing data
    const existing = await getAll();

    // Merge prompts
    if (jsonData.prompts) {
      jsonData.prompts.forEach(newPrompt => {
        const existingIndex = existing.prompts.findIndex(p => p.id === newPrompt.id);
        if (existingIndex >= 0) {
          existing.prompts[existingIndex] = newPrompt;
        } else {
          existing.prompts.push(newPrompt);
        }
      });
    }

    // Merge folders
    if (jsonData.folders) {
      jsonData.folders.forEach(newFolder => {
        const existingIndex = existing.folders.findIndex(f => f.id === newFolder.id);
        if (existingIndex >= 0) {
          existing.folders[existingIndex] = newFolder;
        } else {
          existing.folders.push(newFolder);
        }
      });
    }

    await saveAll(existing);
    return existing;
  }

  /**
   * Get settings
   */
  async function getSettings() {
    const data = await getAll();
    return data.settings || defaultData.settings;
  }

  // Legacy sidebar settings removed in v1.2.0 — stripped on save to keep stored data clean
  const LEGACY_SIDEBAR_SETTING_KEYS = [
    'enableSidebar',
    'sidebarCloseOnOutside',
    'sidebarCardClickAction'
  ];

  /**
   * Save settings
   */
  async function saveSettings(settings) {
    const data = await getAll();
    const merged = { ...data.settings, ...settings };
    LEGACY_SIDEBAR_SETTING_KEYS.forEach(key => delete merged[key]);
    data.settings = merged;
    await saveAll(data);
  }

  /**
   * Get all existing tags with usage count
   * Returns [{tag, count}] sorted by count desc
   */
  async function getAllTags() {
    const data = await getAll();
    const tagCount = {};
    (data.tags || []).forEach(t => {
      const key = normalizeSearchText(t);
      if (!key || tagCount[key]) return;
      tagCount[key] = { tag: t, key, count: 0 };
    });
    (data.prompts || []).forEach(p => {
      (p.tags || []).forEach(t => {
        const key = normalizeSearchText(t);
        if (!tagCount[key]) tagCount[key] = { tag: t, key, count: 0 };
        tagCount[key].count++;
      });
    });
    return Object.values(tagCount).sort((a, b) => b.count - a.count);
  }

  /**
   * Create a reusable tag, even before it is used by a prompt.
   */
  async function createTag(tagName) {
    const name = String(tagName || '').trim();
    const key = normalizeSearchText(name);
    if (!key) return { created: false };

    const data = await getAll();
    if (!data.tags) data.tags = [];

    const existsInRegistry = data.tags.some(tag => normalizeSearchText(tag) === key);
    const existsInPrompts = (data.prompts || []).some(prompt =>
      (prompt.tags || []).some(tag => normalizeSearchText(tag) === key)
    );

    if (!existsInRegistry) {
      data.tags.push(name);
      await saveAll(data);
    }

    return { created: !existsInRegistry && !existsInPrompts };
  }

  /**
   * Rename a tag everywhere it is used.
   */
  async function renameTag(oldTag, newTag) {
    const oldKey = normalizeSearchText(oldTag);
    const newName = String(newTag || '').trim();
    const newKey = normalizeSearchText(newName);
    if (!oldKey || !newKey) return { updated: 0 };

    const data = await getAll();
    if (!data.tags) data.tags = [];
    let updated = 0;

    let registryUpdated = false;
    if (data.tags.some(tag => normalizeSearchText(tag) === oldKey)) {
      const nextTags = [];
      data.tags.forEach(tag => {
        const candidate = normalizeSearchText(tag) === oldKey ? newName : tag;
        if (!nextTags.some(existing => normalizeSearchText(existing) === normalizeSearchText(candidate))) {
          nextTags.push(candidate);
        }
      });
      data.tags = nextTags;
      registryUpdated = true;
    }

    (data.prompts || []).forEach(prompt => {
      const tags = prompt.tags || [];
      if (!tags.some(tag => normalizeSearchText(tag) === oldKey)) return;

      const nextTags = [];
      tags.forEach(tag => {
        const candidate = normalizeSearchText(tag) === oldKey ? newName : tag;
        if (!nextTags.some(existing => normalizeSearchText(existing) === normalizeSearchText(candidate))) {
          nextTags.push(candidate);
        }
      });

      prompt.tags = nextTags;
      prompt.updatedAt = Date.now();
      updated++;
    });

    if (updated > 0 || registryUpdated) await saveAll(data);
    return { updated, registryUpdated };
  }

  /**
   * Remove a tag from every prompt.
   */
  async function deleteTag(tagName) {
    const key = normalizeSearchText(tagName);
    if (!key) return { updated: 0 };

    const data = await getAll();
    if (!data.tags) data.tags = [];
    let updated = 0;

    const nextRegistryTags = data.tags.filter(tag => normalizeSearchText(tag) !== key);
    const registryUpdated = nextRegistryTags.length !== data.tags.length;
    data.tags = nextRegistryTags;

    (data.prompts || []).forEach(prompt => {
      const tags = prompt.tags || [];
      const nextTags = tags.filter(tag => normalizeSearchText(tag) !== key);
      if (nextTags.length === tags.length) return;

      prompt.tags = nextTags;
      prompt.updatedAt = Date.now();
      updated++;
    });

    if (updated > 0 || registryUpdated) await saveAll(data);
    return { updated, registryUpdated };
  }

  /**
   * Generate unique ID
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get recent usage (last 20)
   */
  async function getRecentUsage() {
    const data = await getAll();
    return (data.recentUsage || []).slice(0, 20);
  }

  /**
   * Add a prompt to recent usage by promptId
   */
  async function addRecentUsage(promptId) {
    const data = await getAll();
    if (!data.recentUsage) data.recentUsage = [];

    const usage = {
      promptId: promptId,
      timestamp: Date.now(),
    };

    data.recentUsage.unshift(usage);
    data.recentUsage = data.recentUsage.slice(0, 20);

    // Also update prompt usageCount and lastUsedAt
    const prompt = data.prompts.find(p => p.id === promptId);
    if (prompt) {
      prompt.usageCount = (prompt.usageCount || 0) + 1;
      prompt.lastUsedAt = Date.now();
    }

    await saveAll(data);
  }

  // Public API
  return {
    init,
    getAll,
    getPrompts,
    getPrompt,
    savePrompt,
    deletePrompt,
    getTrash,
    restoreFromTrash,
    deleteFromTrash,
    emptyTrash,
    togglePin,
    reorderPrompts,
    recordUsage,
    searchPrompts,
    filterAndRankPrompts,
    parseSearchQuery,
    getPromptsByFolder,
    getFolders,
    saveFolder,
    deleteFolder,
    exportData,
    importData,
    getSettings,
    saveSettings,
    generateId,
    getRecentUsage,
    addRecentUsage,
    getAllTags,
    createTag,
    renameTag,
    deleteTag,
  };
})();
} // end idempotency guard

// Ensure `Storage` is available as a global variable in the isolated world
// Using `var` so it survives re-injection and is accessible to other scripts
var Storage = window.PromptVaultStorage;
