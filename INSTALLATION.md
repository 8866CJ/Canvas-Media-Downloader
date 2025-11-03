# Installation Guide

## Quick Start

### For Chrome/Edge/Chromium Browsers

1. **Download the Extension**
   - Clone this repository or download as ZIP
   - Extract the files to a local directory

2. **Enable Developer Mode**
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle "Developer mode" ON (top-right corner)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the folder containing the extension files
   - The Canvas Media Downloader icon should appear in your toolbar

4. **Start Using**
   - Visit any Canvas page (*.instructure.com)
   - The extension will automatically start detecting media
   - Click the extension icon to view detected files and toggle modes

### For Firefox

1. **Download the Extension**
   - Clone this repository or download as ZIP
   - Extract the files to a local directory

2. **Load Temporary Add-on**
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Navigate to the extension folder and select `manifest.json`

3. **Start Using**
   - Visit any Canvas page (*.instructure.com)
   - The extension will automatically start detecting media
   - Click the extension icon to view detected files and toggle modes

> **Note:** In Firefox, temporary add-ons are removed when you close the browser. For permanent installation, you would need to sign the extension through Mozilla.

## Configuration

### Download Modes

**Automatic Mode (Default)**
- Media files are automatically downloaded when detected
- Files are saved to your browser's default download location
- Best for downloading all course media quickly

**Manual Mode**
- Review detected media files in the popup
- Click "Download" button for individual files
- Best for selective downloading

### Changing Download Location

Downloads are saved to your browser's default download folder. To change this:

**Chrome/Edge:**
- Settings → Downloads → Location

**Firefox:**
- Settings → General → Downloads → Save files to

## Troubleshooting

### Extension not detecting media
- Ensure you're on a Canvas page (*.instructure.com)
- Refresh the page to reinitialize the extension
- Check that the extension is enabled in your browser

### Downloads not starting
- Check browser download permissions
- Verify popup blockers aren't interfering
- Ensure you have write access to the download directory

### Extension not loading
- Verify all files are present in the directory
- Check the browser console for error messages
- Try reloading the extension

## Permissions Explained

The extension requires these permissions:

- **storage**: Save your preference for auto/manual mode
- **downloads**: Download detected media files
- **webRequest**: Monitor network requests for media files
- **host_permissions**: Access Canvas pages to detect media

## Privacy

This extension:
- Only runs on Canvas pages (*.instructure.com)
- Does not collect or transmit any data
- Does not track your browsing activity
- Stores only your download mode preference locally

## Support

For issues, questions, or contributions, please visit the GitHub repository.
