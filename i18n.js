/**
 * PromptVault i18n - Internationalization Support
 * Languages: zh (中文), en (English)
 * 产品定位：AI Prompt Manager（简单、轻量）
 */
const i18n = (() => {
  const translations = {
    zh: {
      // Header
      app_title: 'PromptVault',
      settings_title: '设置',
      toggle_theme: '切换主题',

      // Tabs
      tab_prompts: '提示词',
      tab_folders: '文件夹',
      tab_tags: '标签',
      tab_pinned: '置顶',

      // Section headings
      heading_all_prompts: '所有提示词',
      heading_folders: '文件夹',
      heading_tags: '标签',
      heading_pinned: '置顶',

      // Search
      search_placeholder: '搜索提示词...',

      // Buttons
      btn_new_prompt: '新建提示词',
      btn_new_folder: '新建文件夹',
      btn_new_tag: '新建标签',
      btn_import: '导入',
      btn_export: '导出',
      btn_save: '保存',
      btn_cancel: '取消',
      btn_confirm: '确认',
      btn_copy: '复制到剪贴板',
      btn_insert: '插入页面',
      btn_clear_data: '清除所有数据',
      btn_use: '使用',
      btn_edit: '编辑',
      btn_pin: '置顶',
      btn_delete: '删除',
      btn_close: '关闭',

      // Labels
      label_title: '提示词名称',
      label_content: '提示词内容',
      label_folder: '文件夹',
      label_tags: '标签',
      label_name: '名称',
      label_color: '颜色',
      custom_color: '自定义颜色',
      label_dark_mode: '深色模式',
      label_default_folder: '默认文件夹',
      label_language: '语言',

      // Placeholders
      placeholder_title: '输入提示词名称...',
      placeholder_content: '输入提示词内容...',
      placeholder_tag: '添加标签...',
      placeholder_folder_name: '输入文件夹名称...',
      placeholder_new_tag: '输入新标签名称:',

      // Empty states
      empty_no_prompts: '暂无提示词',
      empty_prompts_hint: '创建你的第一个提示词开始使用',
      empty_shortcut_hint: '提示',

      // Shortcut
      shortcut_label: '快捷键',
      shortcut_copy: '复制',
      shortcut_toast_title: '快捷键已启用',
      shortcut_toast_body: '以后在任何网页按：',

      // Welcome
      welcome_title: '欢迎使用 PromptVault',
      welcome_subtitle: '在任何网页中按以下快捷键快速打开',
      welcome_hint: '即可快速打开 PromptVault',
      welcome_any_page: '任何网页输入框',
      welcome_later: '稍后查看',
      welcome_get_started: '开始体验',
      empty_no_pinned: '暂无置顶',
      empty_pinned_hint: '将提示词置顶后显示在这里',
      empty_no_tags: '暂无标签',

      // Modal titles
      modal_new_prompt: '新建提示词',
      modal_edit_prompt: '编辑提示词',
      modal_new_folder: '新建文件夹',
      modal_edit_folder: '编辑文件夹',
      modal_new_tag: '新建标签',
      modal_settings: '设置',
      modal_confirm: '确认',

      // Confirm dialogs
      confirm_delete_prompt: '删除提示词',
      confirm_delete_prompt_msg: '确定要删除这个提示词吗？此操作不可撤销。',
      confirm_delete_folder: '删除文件夹',
      confirm_delete_folder_msg: '确定要删除这个文件夹吗？其中的提示词将移至"默认"。',
      confirm_clear_data: '清除所有数据',
      confirm_clear_data_msg: '确定要删除所有数据吗？此操作不可撤销。',

      // Toast messages
      toast_saved: '保存成功！',
      toast_updated: '更新成功！',
      toast_deleted: '已删除',
      toast_created: '创建成功',
      toast_folder_created: '文件夹已创建',
      toast_folder_updated: '文件夹已更新',
      toast_tag_created: '标签已创建',
      toast_tag_deleted: '标签已删除',
      toast_copied: '已复制到剪贴板！',
      toast_inserted: '已插入页面！',
      toast_exported: '数据已导出！',
      toast_imported: '数据已导入！',
      toast_cleared: '所有数据已清除',
      toast_error_folder_name: '请输入文件夹名称',
      toast_error_invalid_json: '无效的 JSON 文件',
      toast_error_no_input: '未找到输入框',
      toast_error_cannot_insert: '无法插入到此页面',

      // Notification
      notif_no_active_input: '未找到活动输入框',
      notif_no_input_found: '此页面上未找到文本输入框',
      notif_prompt_saved: '提示词已保存！',

      // Context menu
      ctx_save_as_prompt: '保存为提示词',

      // Folder default
      folder_uncategorized: '默认',

      // Language options
      lang_zh: '中文',
      lang_en: 'English',

      // Data management
      data_management: '数据管理',
      btn_import: '导入',
      btn_export: '导出',

      // Sidebar
      sidebar_all: '全部',
      sidebar_recent: '最近',
      sidebar_pinned: '置顶',
      sidebar_search_placeholder: '搜索提示词...',
      sidebar_no_prompts: '暂无提示词',
      sidebar_no_prompts_hint: '在扩展中创建你的第一个提示词',
      sidebar_no_recent: '暂无最近使用',
      sidebar_no_recent_hint: '使用提示词后会显示在这里',
      sidebar_no_pinned: '暂无置顶',
      sidebar_no_pinned_hint: '将提示词置顶方便快速访问',
      sidebar_loading: '加载中...',
      sidebar_copied: '已复制到剪贴板',
      sidebar_inserted: '已插入提示词',
      sidebar_no_input: '未找到输入框，请先点击输入框',
      sidebar_insert_failed: '插入失败，请手动复制',

      // Batch operations
      btn_batch: '批量',
      btn_batch_done: '完成',
      btn_batch_manage: '批量管理',
      btn_batch_move: '移动',
      btn_batch_cancel: '取消',
      batch_selected_count: '{0} 已选',
      batch_move_to_folder: '移动到文件夹...',
      batch_moved: '{0} 个提示词已移动',

      // Command Palette
      cmd_search_placeholder: '搜索提示词...',
      cmd_all: '所有',
      cmd_favorites: '置顶',
      cmd_recent: '最近',
      cmd_no_prompts: '暂无提示词',
      cmd_nav: '↑↓ 导航',
      cmd_insert: 'Enter 插入',
      cmd_close: 'Esc 关闭',

      // Context menu
      ctx_save_as_prompt: '保存为提示词',
      ctx_insert_prompt: '插入提示词',
      ctx_pin: '置顶',
      default_prompt_title: '网页提示词',

      // Pinned tab heading
      heading_pinned_prompts: '置顶提示词',

      // Batch mode - select all
      btn_select_all: '全选',
      btn_deselect_all: '取消全选',

      // Settings
      label_enable_sidebar: '启用侧边栏',
      label_show_badge: '显示角标',
      settings_enable_sidebar_hint: '在网页中显示 PromptVault 侧边栏',
      settings_show_badge_hint: '在扩展图标上显示提示词数量',
      back_to_all: '返回全部',
      btn_apply: '应用',
      toast_settings_applied: '设置已应用',
      // Recent usage
      recent_used: '最近使用',
      recent_used_empty: '暂无最近使用',
      recent_used_empty_hint: '使用提示词后会显示在这里',
      // Usage stats
      usage_stats: '使用 {0} 次 · {1}',
      // Relative time
      time_just_now: '刚刚',
      time_minutes_ago: '{0} 分钟前',
      time_hours_ago: '{0} 小时前',
      time_days_ago: '{0} 天前',
      time_weeks_ago: '{0} 周前',
      time_months_ago: '{0} 个月前',
      time_years_ago: '{0} 年前',
      // Sort options
      sort_updated: '按更新时间',
      sort_created: '按创建时间',
      sort_title: '按名称 A-Z',
      sort_usage: '按使用次数',
      sort_custom: '自定义',
      // Recent usage
      recent_clear: '清空',
      confirm_clear_recent: '清空最近使用',
      confirm_clear_recent_msg: '确定要清空所有最近使用记录吗？提示词本身不会被删除。',
      toast_cleared: '已清空',
      // View mode
      view_mode_list: '列表模式',
      view_mode_grouped: '分组模式',
      // Settings - display mode
      label_display_mode: '显示模式',
      display_mode_list: '列表',
      display_mode_grouped: '按文件夹分组',
      // Settings - show recent
      label_show_recent: '显示最近使用',
      settings_show_recent_hint: '在首页显示最近使用的提示词',
    },
    en: {
      // Header
      app_title: 'PromptVault',
      settings_title: 'Settings',
      toggle_theme: 'Toggle Theme',

      // Tabs
      tab_prompts: 'Prompts',
      tab_folders: 'Folders',
      tab_tags: 'Tags',
      tab_pinned: 'Pinned',

      // Section headings
      heading_all_prompts: 'All Prompts',
      heading_folders: 'Folders',
      heading_tags: 'Tags',
      heading_pinned: 'Pinned',

      // Search
      search_placeholder: 'Search prompts...',

      // Buttons
      btn_new_prompt: 'New Prompt',
      btn_new_folder: 'New Folder',
      btn_new_tag: 'New Tag',
      btn_import: 'Import',
      btn_export: 'Export',
      btn_save: 'Save',
      btn_cancel: 'Cancel',
      btn_confirm: 'Confirm',
      btn_copy: 'Copy to Clipboard',
      btn_insert: 'Insert into Page',
      btn_clear_data: 'Clear All Data',
      btn_use: 'Use',
      btn_edit: 'Edit',
      btn_pin: 'Pin',
      btn_delete: 'Delete',
      btn_close: 'Close',

      // Labels
      label_title: 'Prompt Name',
      label_content: 'Prompt Content',
      label_folder: 'Folder',
      label_tags: 'Tags',
      label_name: 'Name',
      label_color: 'Color',
      custom_color: 'Custom color',
      label_dark_mode: 'Dark Mode',
      label_default_folder: 'Default Folder',
      label_language: 'Language',

      // Placeholders
      placeholder_title: 'Enter prompt name...',
      placeholder_content: 'Enter your prompt content...',
      placeholder_tag: 'Add tag...',
      placeholder_folder_name: 'Enter folder name...',
      placeholder_new_tag: 'Enter new tag name:',

      // Empty states
      empty_no_prompts: 'No prompts yet',
      empty_prompts_hint: 'Create your first prompt to get started',
      empty_shortcut_hint: 'Tip',

      // Shortcut
      shortcut_label: 'Shortcut',
      shortcut_copy: 'Copy',
      shortcut_toast_title: 'Shortcut enabled',
      shortcut_toast_body: 'Press on any page to open PromptVault: ',

      // Welcome
      welcome_title: 'Welcome to PromptVault',
      welcome_subtitle: 'Press the shortcut below to open instantly on any webpage',
      welcome_hint: 'to quickly open PromptVault',
      welcome_any_page: 'Any webpage input',
      welcome_later: 'Maybe Later',
      welcome_get_started: 'Get Started',
      empty_no_pinned: 'No pinned prompts',
      empty_pinned_hint: 'Pin prompts for quick access',
      empty_no_tags: 'No tags yet',

      // Modal titles
      modal_new_prompt: 'New Prompt',
      modal_edit_prompt: 'Edit Prompt',
      modal_new_folder: 'New Folder',
      modal_edit_folder: 'Edit Folder',
      modal_new_tag: 'New Tag',
      modal_settings: 'Settings',
      modal_confirm: 'Confirm',

      // Confirm dialogs
      confirm_delete_prompt: 'Delete Prompt',
      confirm_delete_prompt_msg: 'Are you sure you want to delete this prompt? This action cannot be undone.',
      confirm_delete_folder: 'Delete Folder',
      confirm_delete_folder_msg: 'Are you sure you want to delete this folder? Prompts will be moved to Default.',
      confirm_clear_data: 'Clear All Data',
      confirm_clear_data_msg: 'Are you sure you want to delete ALL data? This cannot be undone.',

      // Toast messages
      toast_saved: 'Prompt saved!',
      toast_updated: 'Prompt updated!',
      toast_deleted: 'Deleted',
      toast_created: 'Prompt created!',
      toast_folder_created: 'Folder created',
      toast_folder_updated: 'Folder updated',
      toast_tag_created: 'Tag created',
      toast_tag_deleted: 'Tag deleted',
      toast_copied: 'Copied to clipboard!',
      toast_inserted: 'Inserted into page!',
      toast_exported: 'Data exported!',
      toast_imported: 'Data imported!',
      toast_cleared: 'All data cleared',
      toast_error_folder_name: 'Please enter a folder name',
      toast_error_invalid_json: 'Invalid JSON file',
      toast_error_no_input: 'No active input found',
      toast_error_cannot_insert: 'Cannot insert into this page',

      // Notification
      notif_no_active_input: 'No active input found',
      notif_no_input_found: 'No text input found on this page',
      notif_prompt_saved: 'Prompt saved!',

      // Context menu
      ctx_save_as_prompt: 'Save as Prompt',

      // Folder default
      folder_uncategorized: 'Default',

      // Language options
      lang_zh: '中文',
      lang_en: 'English',

      // Data management
      data_management: 'Data Management',
      btn_import: 'Import',
      btn_export: 'Export',

      // Sidebar
      sidebar_all: 'All',
      sidebar_recent: 'Recent',
      sidebar_pinned: 'Pinned',
      sidebar_search_placeholder: 'Search prompts...',
      sidebar_no_prompts: 'No prompts yet',
      sidebar_no_prompts_hint: 'Create your first prompt in the extension',
      sidebar_no_recent: 'No recent usage',
      sidebar_no_recent_hint: 'Prompts you use will appear here',
      sidebar_no_pinned: 'No pinned',
      sidebar_no_pinned_hint: 'Pin prompts for quick access',
      sidebar_loading: 'Loading...',
      sidebar_copied: 'Copied to clipboard',
      sidebar_inserted: 'Prompt inserted',
      sidebar_no_input: 'No input found. Click the input box first.',
      sidebar_insert_failed: 'Insert failed. Please copy manually.',

      // Batch operations
      btn_batch: 'Batch',
      btn_batch_done: 'Done',
      btn_batch_manage: 'Batch Manage',
      btn_batch_move: 'Move',
      btn_batch_cancel: 'Cancel',
      batch_selected_count: '{0} selected',
      batch_move_to_folder: 'Move to folder...',
      batch_moved: '{0} prompts moved',

      // Command Palette
      cmd_search_placeholder: 'Search prompts...',
      cmd_all: 'All',
      cmd_favorites: 'Pinned',
      cmd_recent: 'Recent',
      cmd_no_prompts: 'No prompts',
      cmd_nav: '↑↓ Nav',
      cmd_insert: 'Enter Insert',
      cmd_close: 'Esc Close',

      // Context menu
      ctx_save_as_prompt: 'Save as Prompt',
      ctx_insert_prompt: 'Insert Prompt',
      ctx_pin: 'Pin',
      default_prompt_title: 'Web Prompt',

      // Pinned tab heading
      heading_pinned_prompts: 'Pinned Prompts',

      // Batch mode - select all
      btn_select_all: 'Select All',
      btn_deselect_all: 'Deselect All',

      // Settings
      label_enable_sidebar: 'Enable Sidebar',
      label_show_badge: 'Show Badge',
      settings_enable_sidebar_hint: 'Show PromptVault sidebar on web pages',
      settings_show_badge_hint: 'Show prompt count on extension icon',
      back_to_all: 'Back to all',
      btn_apply: 'Apply',
      toast_settings_applied: 'Settings applied',
      // Recent usage
      recent_used: 'Recent',
      recent_used_empty: 'No recent usage',
      recent_used_empty_hint: 'Prompts you use will appear here',
      // Usage stats
      usage_stats: 'Used {0} times · {1}',
      // Relative time
      time_just_now: 'Just now',
      time_minutes_ago: '{0} minutes ago',
      time_hours_ago: '{0} hours ago',
      time_days_ago: '{0} days ago',
      time_weeks_ago: '{0} weeks ago',
      time_months_ago: '{0} months ago',
      time_years_ago: '{0} years ago',
      // Sort options
      sort_updated: 'By update time',
      sort_created: 'By creation time',
      sort_title: 'By name A-Z',
      sort_usage: 'By usage count',
      sort_custom: 'Custom',
      // Recent usage
      recent_clear: 'Clear',
      confirm_clear_recent: 'Clear recent usage',
      confirm_clear_recent_msg: 'Are you sure you want to clear all recent usage records? Prompts themselves will not be deleted.',
      toast_cleared: 'Cleared',
      // View mode
      view_mode_list: 'List mode',
      view_mode_grouped: 'Grouped mode',
      // Settings - display mode
      label_display_mode: 'Display Mode',
      display_mode_list: 'List',
      display_mode_grouped: 'Group by Folder',
      // Settings - show recent
      label_show_recent: 'Show Recent Usage',
      settings_show_recent_hint: 'Show recently used prompts on home page',
    },
  };

  let currentLocale = 'zh'; // default

  /**
   * Detect browser/system language
   */
  function detectLocale() {
    try {
      const lang = (navigator.language || navigator.userLanguage || 'zh').toLowerCase();
      if (lang.startsWith('zh')) return 'zh';
      return 'en';
    } catch (e) {
      return 'zh';
    }
  }

  /**
   * Get translation by key (supports {0}, {1}... placeholders)
   */
  function t(key, ...args) {
    let text = (translations[currentLocale] && translations[currentLocale][key]) || key;
    if (args.length > 0) {
      args.forEach((arg, i) => {
        text = text.replace(new RegExp('\\{' + i + '\\}', 'g'), arg);
      });
    }
    return text;
  }

  /**
   * Set current locale and persist to storage
   */
  async function setLocale(locale) {
    currentLocale = locale;
    try {
      const data = await chrome.storage.local.get('promptvault_data');
      const store = data.promptvault_data || {};
      if (!store.settings) store.settings = {};
      store.settings.locale = locale;
      await chrome.storage.local.set({ promptvault_data: store });
    } catch (e) {
      console.warn('i18n: failed to persist locale', e);
    }
  }

  /**
   * Load locale from storage, fallback to auto-detect
   */
  async function loadLocale() {
    try {
      const data = await chrome.storage.local.get('promptvault_data');
      const store = data.promptvault_data;
      if (store && store.settings && store.settings.locale) {
        currentLocale = store.settings.locale;
      } else {
        currentLocale = detectLocale();
      }
    } catch (e) {
      currentLocale = detectLocale();
    }
  }

  /**
   * Get current locale
   */
  function getLocale() {
    return currentLocale;
  }

  return {
    t,
    setLocale,
    loadLocale,
    getLocale,
    detectLocale,
  };
})();
