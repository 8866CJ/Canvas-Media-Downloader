# Canvas Media Downloader

A browser extension that automatically detects and downloads media files from Canvas pages. Supports both automatic and manual download modes.

## Features

- 🎥 **Automatic Media Detection**: Monitors network activity and page content for media files (videos, audio)
- 📥 **Auto-Download Mode**: Automatically downloads detected media files
- 🎯 **Manual Mode**: Toggle to manual mode to review and selectively download files
- 🔄 **Real-time Monitoring**: Detects media files as they load on Canvas pages
- 📋 **Media List**: View all detected media files in the extension popup
- 🌐 **Canvas Integration**: Works seamlessly with Canvas LMS (instructure.com)

## Supported Media Types

- Video: `.mp4`, `.webm`, `.ogg`, `.mkv`, `.avi`, `.mov`, `.wmv`, `.flv`, `.m4v`
- Audio: `.mp3`, `.wav`, `.flac`, `.aac`, `.m4a`

## Installation

### Chrome/Edge
1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension directory

### Firefox
1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the extension directory

## Usage

### Getting Started
1. Install the extension following the instructions above
2. Navigate to any Canvas page (e.g., `*.instructure.com`)
3. The extension will automatically start detecting media files

### Automatic Download Mode (Default)
- Media files are automatically downloaded when detected
- Downloads are saved to your browser's default download location
- Files are named with timestamps for easy organization

### Manual Download Mode
1. Click the extension icon in your browser toolbar
2. Toggle the switch from "Automatic" to "Manual"
3. View the list of detected media files
4. Click "Download" button next to any file to download it

### Extension Popup Features
- **Mode Toggle**: Switch between automatic and manual download modes
- **Media List**: View all detected media files from the current session
- **Refresh List**: Update the list of detected media
- **Clear List**: Remove all items from the detected media list

## Permissions

The extension requires the following permissions:
- `storage`: Save user preferences (auto/manual mode)
- `downloads`: Download detected media files
- `webRequest`: Monitor network requests for media files
- `host_permissions`: Access Canvas pages (instructure.com)

## Privacy

This extension:
- Only runs on Canvas pages (*.instructure.com)
- Does not collect or transmit any personal data
- Does not track your browsing activity
- Stores only your download mode preference locally

## Development

### File Structure
```
Canvas-Media-Downloader/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for network monitoring
├── content.js         # Content script for page analysis
├── popup.html         # Extension popup UI
├── popup.js           # Popup functionality
├── popup.css          # Popup styling
└── icons/            # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### How It Works
1. **Content Script** (`content.js`): Runs on Canvas pages, detects media elements in the DOM
2. **Background Script** (`background.js`): Monitors network requests, manages downloads, stores settings
3. **Popup** (`popup.html/js/css`): Provides user interface for mode toggle and media list

## Troubleshooting

### Media files not being detected
- Ensure you're on a Canvas page (*.instructure.com)
- Refresh the page to re-initialize the extension
- Check if the media is actually embedded (not just linked)

### Downloads not working
- Check browser download permissions
- Ensure popup blockers aren't interfering
- Verify you have write permissions to the download directory

### Extension not loading
- Make sure developer mode is enabled
- Check the browser console for errors
- Verify all required files are present

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is provided as-is for educational purposes.
