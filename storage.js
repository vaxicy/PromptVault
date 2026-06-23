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
    folders: [
      { id: 'default', name: 'Default', color: '#808080' }
    ],
    tags: [],
    settings: {
      darkMode: true,
      defaultFolder: 'default',
      locale: 'zh',
      enableSidebar: true,
      sidebarCloseOnOutside: true,
      sidebarCardClickAction: 'copy',
      showBadge: true,
      sortMode: 'smart',
      autoTopAfterUse: true,
      groupSortMode: 'folderName'
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
   * Delete a prompt by ID
   */
  async function deletePrompt(id) {
    const data = await getAll();
    data.prompts = data.prompts.filter(p => p.id !== id);
    await saveAll(data);
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
      tags: [],
      folders: [],
      titleTerms: [],
      pinned: null,
    };

    tokens.forEach(token => {
      const clean = token.replace(/^"|"$/g, '');
      const [rawKey, ...rest] = clean.split(':');
      const value = rest.join(':').trim();
      const key = rawKey.trim();

      if (value && key === 'tag') {
        filters.tags.push(value);
      } else if (value && key === 'folder') {
        filters.folders.push(value);
      } else if (value && key === 'title') {
        filters.titleTerms.push(value);
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
    const tags = (prompt.tags || []).map(normalizeSearchText);
    const folder = normalizeSearchText(folderLabel);

    if (filters.pinned !== null && Boolean(prompt.pinned) !== filters.pinned) return false;

    const tagMatches = filters.tags.every(term => tags.some(tag => tag.includes(term)));
    if (!tagMatches) return false;

    const folderMatches = filters.folders.every(term => folder.includes(term));
    if (!folderMatches) return false;

    const titleMatches = filters.titleTerms.every(term => title.includes(term));
    if (!titleMatches) return false;

    return filters.terms.every(term =>
      title.includes(term) ||
      content.includes(term) ||
      tags.some(tag => tag.includes(term)) ||
      folder.includes(term)
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
    const tags = (prompt.tags || []).map(normalizeSearchText);
    const folder = normalizeSearchText(folderLabel);
    const allTerms = [...filters.terms, ...filters.titleTerms, ...filters.tags, ...filters.folders];

    let score = 0;
    allTerms.forEach(term => {
      score += getFieldScore(title, term, { exact: 120, prefix: 90, contains: 65 });
      score += tags.reduce((sum, tag) => sum + getFieldScore(tag, term, { exact: 80, prefix: 60, contains: 45 }), 0);
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
   * Filter and rank prompt arrays. Used by popup, sidebar, and command palette.
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
   * Get prompts by tag
   */
  async function getPromptsByTag(tag) {
    const prompts = await getPrompts();
    return prompts.filter(p => p.tags && p.tags.includes(tag));
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
   * Normalize a tag name (trim whitespace, filter empty)
   */
  function normalizeTag(tag) {
    if (!tag) return '';
    return String(tag).trim();
  }

  /**
   * Get all tags (deduplicated & normalized)
   */
  async function getTags() {
    const data = await getAll();
    const tags = (data.tags || [])
      .map(t => normalizeTag(t))
      .filter(t => t.length > 0);
    return [...new Set(tags)];
  }

  /**
   * Add a tag
   */
  async function addTag(tag) {
    tag = normalizeTag(tag);
    if (!tag) return (await getAll()).tags || [];
    const data = await getAll();
    if (!data.tags.includes(tag)) {
      data.tags.push(tag);
      await saveAll(data);
    }
    return data.tags;
  }

  /**
   * Remove a tag
   */
  async function removeTag(tag) {
    tag = normalizeTag(tag);
    const data = await getAll();
    data.tags = data.tags.filter(t => t !== tag);
    // Remove tag from all prompts (normalized comparison)
    data.prompts.forEach(p => {
      if (p.tags) {
        p.tags = p.tags.map(t => normalizeTag(t)).filter(t => t && t !== tag);
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

    // Merge tags
    if (jsonData.tags) {
      jsonData.tags.forEach(tag => {
        if (!existing.tags.includes(tag)) {
          existing.tags.push(tag);
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

  /**
   * Save settings
   */
  async function saveSettings(settings) {
    const data = await getAll();
    data.settings = { ...data.settings, ...settings };
    await saveAll(data);
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
    togglePin,
    reorderPrompts,
    recordUsage,
    searchPrompts,
    filterAndRankPrompts,
    parseSearchQuery,
    getPromptsByFolder,
    getPromptsByTag,
    getFolders,
    saveFolder,
    deleteFolder,
    getTags,
    addTag,
    removeTag,
    exportData,
    importData,
    getSettings,
    saveSettings,
    generateId,
    getRecentUsage,
    addRecentUsage,
  };
})();
} // end idempotency guard

// Ensure `Storage` is available as a global variable in the isolated world
// Using `var` so it survives re-injection and is accessible to other scripts
var Storage = window.PromptVaultStorage;
