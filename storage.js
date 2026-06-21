/**
 * Storage Module - Handles all Chrome storage operations
 * Uses Chrome Storage Local API
 */
const Storage = (() => {
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
      showBadge: true
    }
  };

  /**
   * Initialize storage with default data if not exists
   */
  async function init() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    if (!data[STORAGE_KEY]) {
      await chrome.storage.local.set({ [STORAGE_KEY]: defaultData });
      return defaultData;
    }
    return data[STORAGE_KEY];
  }

  /**
   * Get all data from storage
   */
  async function getAll() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return data[STORAGE_KEY] || defaultData;
  }

  /**
   * Save all data to storage
   */
  async function saveAll(data) {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
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
   * Search prompts by query
   */
  async function searchPrompts(query) {
    const prompts = await getPrompts();
    const lowerQuery = query.toLowerCase();

    return prompts.filter(p => {
      return (
        p.title.toLowerCase().includes(lowerQuery) ||
        p.content.toLowerCase().includes(lowerQuery) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(lowerQuery))) ||
        (p.folder && p.folder.toLowerCase().includes(lowerQuery))
      );
    });
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
