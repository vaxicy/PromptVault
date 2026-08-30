/**
 * PromptVault i18n - Internationalization Support
 * Languages: zh (中文), en (English)
 * 产品定位：AI Prompt Manager（简单、轻量）
 */

// Idempotency guard: check window property (survives re-injection)
if (typeof window.PromptVaultI18n === 'undefined') {
  window.PromptVaultI18n = (() => {
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
      tag_search_placeholder: '搜索标签...',
      tag_usage_count: '{0} 个提示词',

      // Buttons
      btn_new_prompt: '新建提示词',
      btn_new_folder: '新建文件夹',
      btn_new_tag: '新增标签',
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
      btn_rename_tag: '重命名',
      btn_close: '关闭',
      card_click_to_copy: '点击复制',
      card_copied: '已复制',
      card_has_variables: '含变量',

      // Labels
      label_title: '提示词名称',
      label_content: '提示词内容',
      label_folder: '文件夹',
      label_tags: '标签',
      untitled: '未命名',
      export_generated_at: '导出时间',
      export_format_json_desc: '完整备份',
      export_format_md_desc: '适合 Notion / 语雀',
      export_format_csv_desc: '适合 Excel',
      export_format_txt_desc: '简单可读',
      label_tag_name: '标签名称',
      label_name: '名称',
      label_color: '颜色',
      custom_color: '自定义颜色',
      label_dark_mode: '深色模式',
      label_default_folder: '默认文件夹',
      label_language: '语言',

      // Placeholders
      placeholder_title: '输入提示词名称...',
      placeholder_content: '输入提示词内容...',
      placeholder_folder_name: '输入文件夹名称...',
      placeholder_tag_name: '输入标签名称...',

      // Empty states
      empty_no_prompts: '暂无提示词',
      empty_prompts_hint: '创建你的第一个提示词开始使用',
      empty_no_search_results: '没有找到匹配的提示词',
      empty_search_hint: '试试更短的关键词，或使用 folder: 精准筛选',
      empty_no_filtered_prompts: '当前筛选下没有提示词',
      empty_filter_hint: '返回全部提示词或换一个文件夹',
      empty_no_tags: '暂无标签',
      empty_tags_hint: '点击新增标签，或在提示词里添加标签',
      empty_action_new_prompt: '新建提示词',
      empty_action_clear_search: '清空搜索',
      empty_action_view_all: '查看全部提示词',
      search_results_count: '找到 {0} 个结果',
      filter_search: '搜索',
      filter_folder: '文件夹',
      clear_filter: '清除筛选',
      search_syntax_tip: '支持按关键词、文件夹搜索',
      empty_shortcut_hint: '提示',

      // Shortcut
      shortcut_label: '快捷键',
      shortcut_title: '快捷键',
      shortcut_windows: 'Windows',
      shortcut_mac: 'Mac',
      shortcut_copy: '复制',
      shortcut_copy_tooltip: '复制快捷键',
      shortcut_toast_title: '快捷键已启用',
      shortcut_toast_body: '以后在任何网页按：',

      // Welcome
      welcome_title: '欢迎使用 PromptVault',
      welcome_subtitle: '保存、整理并快速复用你的 AI 提示词',
      welcome_hint: '点击工具栏图标打开，或在输入框右键快速插入',
      welcome_any_page: '任何网页输入框',
      welcome_later: '稍后查看',
      welcome_get_started: '开始体验',
      empty_no_pinned: '暂无置顶',
      empty_pinned_hint: '将提示词置顶后显示在这里',

      // Modal titles
      modal_new_prompt: '新建提示词',
      modal_edit_prompt: '编辑提示词',
      modal_new_folder: '新建文件夹',
      modal_edit_folder: '编辑文件夹',
      modal_settings: '设置',
      modal_confirm: '确认',

      // Confirm dialogs
      confirm_delete_prompt: '删除提示词',
      confirm_delete_prompt_msg: '确定要删除这个提示词吗？此操作不可撤销。',
      confirm_delete_folder: '删除文件夹',
      confirm_delete_folder_msg: '确定要删除这个文件夹吗？其中的提示词将移至"默认"。',
      confirm_clear_data: '清除所有数据',
      confirm_clear_data_msg: '确定要删除所有数据吗？此操作不可撤销。',
      confirm_delete_tag: '删除标签',
      confirm_delete_tag_msg: '确定要从所有提示词中删除标签“{0}”吗？',
      prompt_new_tag: '新增标签',
      prompt_rename_tag: '重命名标签',

      // Toast messages
      toast_saved: '保存成功！',
      toast_updated: '更新成功！',
      toast_deleted: '已删除',
      toast_created: '创建成功',
      toast_folder_created: '文件夹已创建',
      toast_folder_updated: '文件夹已更新',
      toast_copied: '已复制到剪贴板！',
      toast_inserted: '已插入页面！',
      toast_exported: '数据已导出！',
      toast_imported: '数据已导入！',
      toast_cleared: '所有数据已清除',
      toast_error_folder_name: '请输入文件夹名称',
      toast_error_invalid_json: '无效的 JSON 文件',
      toast_error_no_input: '未找到输入框',
      toast_error_cannot_insert: '无法插入到此页面',
      toast_paypal_coming_soon: 'PayPal 支持入口即将开放',
      toast_error_empty_fields: '标题和内容不能为空',
      editor_char_count: '{0} 字',
      editor_save_hint: 'Ctrl + Enter 保存',
      confirm_discard_title: '放弃编辑？',
      confirm_discard_msg: '有未保存的修改，关闭后将丢失。确定要放弃吗？',
      label_enable_trash: '启用回收站',
      settings_enable_trash_hint: '删除的提示词先进入回收站，可随时还原；关闭后删除即永久删除',
      btn_open_trash: '回收站',
      trash_title: '回收站',
      trash_empty: '回收站是空的',
      trash_empty_hint: '删除的提示词会出现在这里，可随时还原',
      btn_restore: '还原',
      btn_delete_forever: '彻底删除',
      btn_empty_trash: '清空回收站',
      confirm_delete_prompt_msg_trash: '确定要删除这个提示词吗？删除后会进入回收站，可随时还原。',
      confirm_disable_trash_title: '关闭回收站？',
      confirm_disable_trash_msg: '回收站里还有 {0} 个提示词，关闭将永久删除它们，且无法恢复。确定要关闭吗？',
      confirm_empty_trash_title: '清空回收站？',
      confirm_empty_trash_msg: '将永久删除回收站里的 {0} 个提示词，无法恢复。确定要清空吗？',
      toast_moved_to_trash: '已移入回收站',
      toast_restored: '已还原',
      toast_deleted_forever: '已彻底删除',
      toast_trash_emptied: '回收站已清空',
      toast_error_tag_name: '请输入标签名称',
      toast_tag_created: '标签已新增',
      toast_tag_renamed: '标签已重命名',
      toast_tag_deleted: '标签已删除',

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
      settings_preferences: '偏好设置',
      settings_data_management_hint: '导入会合并数据；清除会删除所有提示词和文件夹',
      settings_support: '感谢支持',
      settings_support_intro_short: '❤️ 如果 PromptVault 对你有帮助，欢迎支持开发者继续维护优化。',
      settings_support_contact_hint: '联系开发者：',
      settings_wechat_reward: '微信赞赏码',
      settings_wechat_reward_hint: '国内用户可以使用微信扫码支持。',
      settings_paypal_support: 'PayPal 支持',
      btn_import: '导入',
      btn_export: '导出',

      // Toast messages (used by insert / copy flows)
      toast_copied: '已复制到剪贴板！',
      toast_inserted: '已插入提示词',
      toast_no_input: '未找到输入框，请先点击输入框',
      toast_insert_failed: '插入失败，请手动复制',
      toast_fallback_copied: '无法插入，已复制到剪贴板',

      // Batch operations
      btn_batch: '批量',
      btn_batch_done: '完成',
      btn_batch_manage: '批量管理',
      btn_batch_move: '移动',
      btn_batch_cancel: '取消',
      batch_selected_count: '{0} 已选',
      batch_move_to_folder: '移动到...',
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
      label_show_badge: '显示角标',
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
      sort_smart: '智能',
      sort_updated: '更新',
      sort_created: '创建',
      sort_title: '标题 A-Z',
      sort_usage: '使用',
      sort_custom: '自定义',
      sort_custom_hint: '拖拽卡片调整顺序',
      sort_group_folder: '文件夹名称',
      sort_group_recent: '最近使用',
      sort_group_updated: '最近更新',
      sort_group_usage: '使用次数',
      sort_group_custom: '自定义顺序',
      sort_list_tooltip: '调整提示词排序',
      sort_group_tooltip: '调整文件夹和组内提示词排序',
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
      // Settings - auto top after use
      settings_auto_top: '点击后置顶',
      settings_auto_top_hint: '复制提示词后自动置顶（智能排序模式下生效）',
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
      tag_search_placeholder: 'Search tags...',
      tag_usage_count: '{0} prompts',

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
      btn_rename_tag: 'Rename',
      btn_close: 'Close',
      card_click_to_copy: 'Click to copy',
      card_copied: 'Copied',
      card_has_variables: 'Variables',

      // Labels
      label_title: 'Prompt Name',
      label_content: 'Prompt Content',
      label_folder: 'Folder',
      label_tags: 'Tags',
      untitled: 'Untitled',
      export_generated_at: 'Exported at',
      export_format_json_desc: 'Full backup',
      export_format_md_desc: 'For Notion',
      export_format_csv_desc: 'For Excel',
      export_format_txt_desc: 'Plain and readable',
      label_tag_name: 'Tag name',
      label_name: 'Name',
      label_color: 'Color',
      custom_color: 'Custom color',
      label_dark_mode: 'Dark Mode',
      label_default_folder: 'Default Folder',
      label_language: 'Language',

      // Placeholders
      placeholder_title: 'Enter prompt name...',
      placeholder_content: 'Enter your prompt content...',
      placeholder_folder_name: 'Enter folder name...',
      placeholder_tag_name: 'Enter tag name...',

      // Empty states
      empty_no_prompts: 'No prompts yet',
      empty_prompts_hint: 'Create your first prompt to get started',
      empty_no_search_results: 'No matching prompts found',
      empty_search_hint: 'Try a shorter keyword, or use folder: filter',
      empty_no_filtered_prompts: 'No prompts in this filter',
      empty_filter_hint: 'Go back to all prompts or choose another folder',
      empty_no_tags: 'No tags yet',
      empty_tags_hint: 'Create a tag here, or add tags while editing prompts',
      empty_action_new_prompt: 'New Prompt',
      empty_action_clear_search: 'Clear Search',
      empty_action_view_all: 'View All Prompts',
      search_results_count: '{0} results found',
      filter_search: 'Search',
      filter_folder: 'Folder',
      clear_filter: 'Clear filter',
      search_syntax_tip: 'Search by keyword or folder',
      empty_shortcut_hint: 'Tip',

      // Shortcut
      shortcut_label: 'Shortcut',
      shortcut_title: 'Shortcut',
      shortcut_windows: 'Windows',
      shortcut_mac: 'Mac',
      shortcut_copy: 'Copy',
      shortcut_copy_tooltip: 'Copy shortcut',
      shortcut_toast_title: 'Shortcut enabled',
      shortcut_toast_body: 'Press on any page to open PromptVault: ',

      // Welcome
      welcome_title: 'Welcome to PromptVault',
      welcome_subtitle: 'Save, organize and reuse your AI prompts',
      welcome_hint: 'Click the toolbar icon, or right-click any input to insert',
      welcome_any_page: 'Any webpage input',
      welcome_later: 'Maybe Later',
      welcome_get_started: 'Get Started',
      empty_no_pinned: 'No pinned prompts',
      empty_pinned_hint: 'Pin prompts for quick access',

      // Modal titles
      modal_new_prompt: 'New Prompt',
      modal_edit_prompt: 'Edit Prompt',
      modal_new_folder: 'New Folder',
      modal_edit_folder: 'Edit Folder',
      modal_settings: 'Settings',
      modal_confirm: 'Confirm',

      // Confirm dialogs
      confirm_delete_prompt: 'Delete Prompt',
      confirm_delete_prompt_msg: 'Are you sure you want to delete this prompt? This action cannot be undone.',
      confirm_delete_folder: 'Delete Folder',
      confirm_delete_folder_msg: 'Are you sure you want to delete this folder? Prompts will be moved to Default.',
      confirm_clear_data: 'Clear All Data',
      confirm_clear_data_msg: 'Are you sure you want to delete ALL data? This cannot be undone.',
      confirm_delete_tag: 'Delete Tag',
      confirm_delete_tag_msg: 'Remove tag "{0}" from every prompt?',
      prompt_new_tag: 'New tag',
      prompt_rename_tag: 'Rename tag',

      // Toast messages
      toast_saved: 'Prompt saved!',
      toast_updated: 'Prompt updated!',
      toast_deleted: 'Deleted',
      toast_created: 'Prompt created!',
      toast_folder_created: 'Folder created',
      toast_folder_updated: 'Folder updated',
      toast_copied: 'Copied to clipboard!',
      toast_inserted: 'Inserted into page!',
      toast_exported: 'Data exported!',
      toast_imported: 'Data imported!',
      toast_cleared: 'All data cleared',
      toast_error_folder_name: 'Please enter a folder name',
      toast_error_invalid_json: 'Invalid JSON file',
      toast_error_no_input: 'No active input found',
      toast_error_cannot_insert: 'Cannot insert into this page',
      toast_paypal_coming_soon: 'PayPal support is coming soon',
      toast_error_empty_fields: 'Title and content cannot be empty',
      editor_char_count: '{0} chars',
      editor_save_hint: 'Ctrl + Enter to save',
      confirm_discard_title: 'Discard changes?',
      confirm_discard_msg: 'You have unsaved edits. Closing will lose them. Discard anyway?',
      label_enable_trash: 'Enable Trash',
      settings_enable_trash_hint: 'Deleted prompts go to the trash and can be restored; when off, deleting is permanent',
      btn_open_trash: 'Trash',
      trash_title: 'Trash',
      trash_empty: 'Trash is empty',
      trash_empty_hint: 'Deleted prompts will appear here and can be restored anytime',
      btn_restore: 'Restore',
      btn_delete_forever: 'Delete Forever',
      btn_empty_trash: 'Empty Trash',
      confirm_delete_prompt_msg_trash: 'Delete this prompt? It will move to the trash and can be restored anytime.',
      confirm_disable_trash_title: 'Turn off trash?',
      confirm_disable_trash_msg: 'There are {0} prompts in the trash. Turning this off deletes them permanently and they cannot be recovered. Continue?',
      confirm_empty_trash_title: 'Empty trash?',
      confirm_empty_trash_msg: 'This permanently deletes {0} prompts in the trash. This cannot be undone. Continue?',
      toast_moved_to_trash: 'Moved to trash',
      toast_restored: 'Restored',
      toast_deleted_forever: 'Permanently deleted',
      toast_trash_emptied: 'Trash emptied',
      toast_error_tag_name: 'Please enter a tag name',
      toast_tag_created: 'Tag created',
      toast_tag_renamed: 'Tag renamed',
      toast_tag_deleted: 'Tag deleted',

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
      settings_preferences: 'Preferences',
      settings_data_management_hint: 'Import merges data; clear deletes all prompts and folders',
      settings_support: 'Thanks for Your Support',
      settings_support_intro_short: '❤️ If PromptVault helps you, consider supporting the developer to keep it maintained.',
      settings_support_contact_hint: 'Contact the developer:',
      settings_wechat_reward: 'WeChat Reward Code',
      settings_wechat_reward_hint: 'Users in China can scan with WeChat to support development.',
      settings_paypal_support: 'Support via PayPal',
      btn_import: 'Import',
      btn_export: 'Export',

      // Toast messages (used by insert / copy flows)
      toast_copied: 'Copied to clipboard!',
      toast_inserted: 'Prompt inserted',
      toast_no_input: 'No input found. Click the input box first.',
      toast_insert_failed: 'Insert failed. Please copy manually.',
      toast_fallback_copied: 'Cannot insert, copied to clipboard instead.',

      // Batch operations
      btn_batch: 'Batch',
      btn_batch_done: 'Done',
      btn_batch_manage: 'Batch Manage',
      btn_batch_move: 'Move',
      btn_batch_cancel: 'Cancel',
      batch_selected_count: '{0} selected',
      batch_move_to_folder: 'Move to...',
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
      label_show_badge: 'Show Badge',
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
      sort_smart: 'Smart',
      sort_updated: 'Updated',
      sort_created: 'Created',
      sort_title: 'Title A-Z',
      sort_usage: 'Usage',
      sort_custom: 'Custom',
      sort_custom_hint: 'Drag cards to reorder',
      sort_group_folder: 'Folder Name',
      sort_group_recent: 'Recently Used',
      sort_group_updated: 'Recently Updated',
      sort_group_usage: 'Usage Count',
      sort_group_custom: 'Custom Order',
      sort_list_tooltip: 'Sort prompts',
      sort_group_tooltip: 'Sort folders and prompts inside each group',
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
      // Settings - auto top after use
      settings_auto_top: 'Auto Top After Use',
      settings_auto_top_hint: 'Automatically pin to top after copying (works in smart sort mode)',
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
} // end idempotency guard

// Ensure `i18n` is available as a global variable in the isolated world
// Using `var` so it survives re-injection and is accessible to other scripts
var i18n = window.PromptVaultI18n;
