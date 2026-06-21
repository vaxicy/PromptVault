# PromptVault Chrome Extension

A production-ready Chrome Extension for saving, organizing, and using AI prompts efficiently.

## Features

- ✅ **Save Prompts** - Save your favorite AI prompts with title and content
- ✅ **Use Prompts** - Copy to clipboard or insert directly into web pages
- ✅ **Search Prompts** - Quick search through all your saved prompts
- ✅ **Export JSON** - Backup your prompts as JSON file
- ✅ **Import JSON** - Restore prompts from JSON backup
- ✅ **Favorites** - Mark frequently used prompts as favorites
- ✅ **Tag System** - Organize prompts with custom tags
- ✅ **Folder System** - Group prompts into folders
- ✅ **Prompt Variables** - Use `{{variable}}` syntax for dynamic prompts
- ✅ **Dark Mode** - Modern dark theme (with light mode option)
- ✅ **Modern UI** - Clean, responsive interface

## Installation

### Method 1: Load Unpacked (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `promptvault` folder
5. The extension is now installed!

### Method 2: Generate Icons First

Before loading the extension, generate the icon files:

1. Open `icons/generate-icons.html` in a browser
2. Click "Generate All Icons"
3. Click "Download All Icons"
4. Move the downloaded PNG files to the `icons/` folder
5. Then follow Method 1

Or use the Node.js script:
```bash
node generate-icons.js
```

## Usage

### Saving a Prompt

1. Click the PromptVault icon in the toolbar
2. Click "New Prompt"
3. Fill in title, content, folder, and tags
4. Click "Save Prompt"

### Using a Prompt

1. Open the extension popup
2. Click on a prompt card (or click the "+" button)
3. Fill in any variables if needed
4. Click "Copy to Clipboard" or "Insert into Page"

### Variables

Use `{{variable}}` syntax in your prompt content:

```
Write a blog post about {{topic}} in {{tone}} tone.
```

When using the prompt, you'll be asked to fill in the variables.

### Keyboard Shortcuts

- `Ctrl/Cmd + Shift + P` - Quick open PromptVault (when injected)

### Context Menu

Select text on any webpage, right-click, and choose "Save as Prompt" to quickly save prompts.

## File Structure

```
promptvault/
├── manifest.json       # Extension manifest (Manifest V3)
├── popup.html          # Main popup UI
├── popup.js            # Popup logic
├── styles.css          # Styles (dark mode)
├── content.js          # Content script (page injection)
├── background.js       # Service worker (background tasks)
├── storage.js          # Storage abstraction layer
├── icons/              # Icon files
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── generate-icons.html
├── generate-icons.js   # Node.js icon generator
└── README.md          # This file
```

## Architecture

### Manifest V3

- Uses Service Worker instead of background pages
- Content Security Policy compliant
- Modern extension architecture

### Storage

- Uses Chrome Storage Local API
- Data structure:
  ```json
  {
    "prompts": [...],
    "folders": [...],
    "tags": [...],
    "settings": {...}
  }
  ```

### Modules

- **storage.js** - Abstraction layer for Chrome storage
- **popup.js** - UI logic for the popup
- **content.js** - Injected into web pages for prompt insertion
- **background.js** - Service worker for background tasks

## Export/Import

### Export

1. Open the extension
2. Click "Export"
3. JSON file will be downloaded

### Import

1. Open the extension
2. Click "Import"
3. Select a previously exported JSON file

## Settings

- **Dark Mode** - Toggle between dark and light themes
- **Default Folder** - Set default folder for new prompts
- **Clear Data** - Reset all data (use with caution!)

## Browser Compatibility

- ✅ Chrome (Manifest V3)
- ✅ Edge (Chromium-based)
- ✅ Brave (Chromium-based)
- ✅ Opera (Chromium-based)

## Permissions

- `storage` - Save prompts locally
- `activeTab` - Access current tab for prompt insertion
- `scripting` - Inject content scripts
- `host_permissions` - Access all URLs for prompt insertion

## Troubleshooting

### Icons not showing

Generate the icon files using `icons/generate-icons.html` or `node generate-icons.js`

### Prompt not inserting into page

Some websites may block content script injection. Try copying to clipboard instead.

### Data not saving

Check Chrome's storage quota. Clear old data if needed.

## Development

### Prerequisites

- Chrome browser
- Basic knowledge of JavaScript
- (Optional) Node.js for icon generation

### Making Changes

1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the PromptVault card
4. Test your changes

### Debugging

- **Popup**: Right-click extension icon → "Inspect popup"
- **Background**: Go to `chrome://extensions/` → "Service worker"
- **Content Script**: Use Chrome DevTools on the target page

## License

MIT License - Free to use and modify

## Credits

Built with vanilla JavaScript (no frameworks)
UI inspired by modern design principles
Icons: Custom generated

## Support

For issues, feature requests, or contributions, please open an issue on the repository.

---

**Enjoy using PromptVault!** 🚀
