# PromptVault - AI 提示词管理助手

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/hofmefncklehaakcdolknkddodnklckc?label=Chrome%20Web%20Store&logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/detail/promptvault-ai%E6%8F%90%E7%A4%BA%E8%AF%8D%E7%AE%A1%E7%90%86%E5%8A%A9%E6%89%8B/hofmefncklehaakcdolknkddodnklckc)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> 保存、整理和快速访问你的 AI 提示词 | Save, organize, and quickly access your AI prompts

**PromptVault** 是一款轻量级的 Chrome 扩展，帮助你高效管理 AI 提示词（Prompts）。支持文件夹/标签分类、搜索筛选、一键复制/插入到网页、导入导出、侧边栏快速访问等功能。兼容 ChatGPT、Claude、Gemini 等主流 AI 平台。

---

## 📦 安装

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/detail/promptvault-ai%E6%8F%90%E7%A4%BA%E8%AF%8D%E7%AE%A1%E7%90%86%E5%8A%A9%E6%89%8B/hofmefncklehaakcdolknkddodnklckc)

从 Chrome 网上应用商店安装（推荐），或下载源码以开发者模式加载。

---

## ✨ 功能特色

### 📝 提示词管理
| 功能 | 说明 |
|------|------|
| **创建/编辑/删除** | 完整的 CRUD，支持标题、内容、文件夹、标签 |
| **复制** | 点击卡片一键复制到剪贴板 |
| **插入网页** | 将提示词直接插入到 ChatGPT、Claude 等页面的输入框 |
| **置顶** | 常用提示词置顶，优先展示 |

### 📂 文件夹管理
- 创建/编辑/删除文件夹，支持 8 种预设颜色 + 自定义颜色
- 按文件夹筛选提示词
- 支持批量移动提示词到指定文件夹

### 🏷️ 标签管理
- 在提示词中添加多个标签，灵活分类
- 标签管理器：搜索、重命名、删除标签
- 点击标签快速筛选该标签下的所有提示词

### 🔍 搜索与筛选
- **实时搜索**（300ms 防抖）
- **高级搜索语法**：
  - `folder:xxx` — 按文件夹搜索
  - `tag:xxx` — 按标签搜索
  - `title:xxx` — 仅搜索标题
  - `is:pinned` / `is:unpinned` — 按置顶状态筛选
- 搜索结果关键词高亮
- 多种排序方式：智能排序、更新时间、创建时间、名称 A-Z、使用次数

### 📊 数据管理
- **导出**：导出为 JSON 文件
- **导入**：从 JSON 文件导入（合并策略）
- **最近使用**：显示最近使用的提示词
- **使用统计**：记录每条提示词的使用次数和最后使用时间

### 🧩 侧边栏
- 在任意网页右侧打开 PromptVault 侧边栏（浮动按钮触发）
- 三个标签：全部 / 最近 / 置顶
- 实时搜索过滤
- 卡片点击复制或插入
- 行内编辑、置顶、删除
- 拖拽排序
- 独立深浅主题切换
- 支持吸附左右边缘或自由浮动

### ⌨️ 命令面板
- 快捷键 `Ctrl+Shift+P`（Mac: `⌘+Shift+P`）
- 类似 VSCode/Raycast 风格
- 在任意网页快速搜索和插入提示词

### 🖱️ 右键菜单
- **保存为提示词**：选中网页文本，右键保存
- **插入提示词**：在可编辑区域右键，打开命令面板

### ⚙️ 设置
| 设置项 | 说明 |
|--------|------|
| 默认文件夹 | 新建提示词的默认文件夹 |
| 语言 | 中文 / English（自动检测） |
| 显示角标 | 扩展图标上显示提示词数量 |
| 显示最近使用 | 首页显示最近使用的提示词 |
| 点击后置顶 | 复制提示词后自动置顶 |
| 显示模式 | 列表 / 按文件夹分组 |
| 启用侧边栏 | 在网页中显示侧边栏 |
| 侧边栏卡片点击 | 复制到剪贴板 / 插入页面 |
| 深浅主题 | 全局独立切换 |

### 🔄 兼容的 AI 平台
- **ChatGPT** — chatgpt.com / chat.openai.com
- **Claude** — claude.ai
- **Gemini** — gemini.google.com
- **Grok** — grok.x.ai / x.com
- 通用网页文本输入框也支持

### 🌙 主题
- 深色模式 / 浅色模式
- 侧边栏独立主题切换

### 🌐 国际化
- 中文（简体）
- English

---

## 🚀 快速上手

1. 安装扩展后，点击工具栏的 PromptVault 图标
2. 点击 **「新建提示词」**，填入名称和内容
3. 可选择文件夹和标签分类
4. 保存后，点击卡片即可**复制**到剪贴板
5. 在任意网页点击**插入按钮**（↗），将提示词直接插入输入框
6. 使用快捷键 `Ctrl+Shift+P` 随时打开命令面板

---

## 🗂️ 项目结构

```
promptvault/
├── manifest.json            # 扩展清单 (Manifest V3)
├── popup.html               # 弹出窗口 UI
├── popup.js                 # 弹出窗口逻辑
├── styles.css               # 主样式（深色/浅色主题）
├── sidebar.js               # 侧边栏注入脚本 (iframe bridge)
├── sidebar-frame.html       # 侧边栏 iframe UI
├── sidebar-frame.js         # 侧边栏 iframe 逻辑
├── sidebar.css              # 侧边栏样式
├── command-palette.js       # 命令面板
├── content.js               # 内容脚本（消息路由）
├── universal-insert.js      # 通用文本插入引擎
├── background.js            # 后台 Service Worker
├── storage.js               # 存储管理模块
├── i18n.js                  # 国际化模块 (zh/en)
├── welcome.html             # 欢迎页面
├── welcome.js               # 欢迎页逻辑
├── welcome.css              # 欢迎页样式
├── icons/                   # 扩展图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── assets/support/          # 支持相关资源
```

---

## 🛠️ 开发

### 调试
- **弹出窗口**：右键扩展图标 → "审查弹出内容"
- **后台**：`chrome://extensions/` → 点击 "Service Worker"
- **内容脚本**：在目标页面打开 Chrome DevTools

### 加载未打包的扩展
1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目文件夹

---

## 🔐 隐私

- 所有数据存储在本地（Chrome Storage Local API）
- 不会收集或上传任何用户数据
- 调用 AI API 时仅通过用户自己配置的 API Key 发送请求
- 完整隐私政策：[Privacy Policy](https://vaxicy.github.io/PromptVault-privacy/privacy-policy.html)

---

## 📄 许可证

[![License: CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

本作品采用 **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**。

**您可以**：
- ✅ **共享** — 在任何媒介以任何形式复制、发行本作品
- ✅ **演绎** — 修改、转换或以本作品为基础进行创作

**但必须遵守以下条件**：
- **署名** — 必须给出适当的署名，提供指向本许可证的链接
- **非商业性使用** — 不得将本作品用于商业目的
- **相同方式共享** — 如果修改了本作品，必须以相同的许可证发布

---

## 💬 联系与支持

- Chrome 网上应用店：[PromptVault](https://chromewebstore.google.com/detail/promptvault-ai%E6%8F%90%E7%A4%BA%E8%AF%8D%E7%AE%A1%E7%90%86%E5%8A%A9%E6%89%8B/hofmefncklehaakcdolknkddodnklckc)
- 反馈与建议：[huangzero2004@gmail.com](mailto:huangzero2004@gmail.com)
- GitHub Issues：[提交问题](https://github.com/vaxicy/PromptVault/issues)

---

<p align="center">
  Made with ❤️ for the AI prompt community
</p>
