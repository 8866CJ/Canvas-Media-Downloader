// Popup script for Canvas Media Downloader

let autoDownloadEnabled = true;
let mediaUrls = [];

// DOM elements
const autoDownloadToggle = document.getElementById('autoDownloadToggle');
const modeLabel = document.getElementById('modeLabel');
const modeDescription = document.getElementById('modeDescription');
const mediaList = document.getElementById('mediaList');
const mediaCount = document.getElementById('mediaCount');
const refreshBtn = document.getElementById('refreshBtn');
const clearBtn = document.getElementById('clearBtn');

// Initialize popup
async function initialize() {
  // Load saved settings
  chrome.storage.sync.get(['autoDownload'], (result) => {
    autoDownloadEnabled = result.autoDownload !== false;
    autoDownloadToggle.checked = autoDownloadEnabled;
    updateModeDisplay();
  });
  
  // Load media list from background
  loadMediaList();
}

// Update mode display
function updateModeDisplay() {
  if (autoDownloadEnabled) {
    modeLabel.textContent = 'Automatic';
    modeDescription.textContent = 'Media files will be downloaded automatically when detected';
  } else {
    modeLabel.textContent = 'Manual';
    modeDescription.textContent = 'Click download button for each media file you want to save';
  }
}

// Load media list from background script
function loadMediaList() {
  chrome.runtime.sendMessage({ action: 'getMediaList' }, (response) => {
    if (response) {
      mediaUrls = response.mediaUrls || [];
      autoDownloadEnabled = response.autoDownload !== false;
      updateMediaDisplay();
    }
  });
}

// Update media display
function updateMediaDisplay() {
  mediaCount.textContent = `${mediaUrls.length} file${mediaUrls.length !== 1 ? 's' : ''} detected`;
  
  if (mediaUrls.length === 0) {
    mediaList.innerHTML = '<div class="empty-state">No media files detected yet</div>';
    return;
  }
  
  mediaList.innerHTML = '';
  
  mediaUrls.forEach((url, index) => {
    const item = document.createElement('div');
    item.className = 'media-item';
    
    const urlSpan = document.createElement('span');
    urlSpan.className = 'media-url';
    
    // Extract filename or show truncated URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    urlSpan.textContent = filename || url.substring(0, 50) + '...';
    urlSpan.title = url;
    
    item.appendChild(urlSpan);
    
    // Add download button for manual mode or re-download
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('click', () => {
      downloadMedia(url, filename);
    });
    
    item.appendChild(downloadBtn);
    mediaList.appendChild(item);
  });
}

// Download media file
function downloadMedia(url, filename) {
  chrome.runtime.sendMessage({
    action: 'downloadMedia',
    url: url,
    filename: filename
  }, (response) => {
    if (response && response.success) {
      console.log('Download initiated for:', url);
    }
  });
}

// Toggle auto-download mode
autoDownloadToggle.addEventListener('change', (e) => {
  autoDownloadEnabled = e.target.checked;
  chrome.storage.sync.set({ autoDownload: autoDownloadEnabled });
  updateModeDisplay();
});

// Refresh media list
refreshBtn.addEventListener('click', () => {
  loadMediaList();
});

// Clear media list
clearBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'clearMediaList' }, (response) => {
    if (response && response.success) {
      mediaUrls = [];
      updateMediaDisplay();
    }
  });
});

// Initialize on load
initialize();

// Listen for updates
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.autoDownload) {
    autoDownloadEnabled = changes.autoDownload.newValue;
    autoDownloadToggle.checked = autoDownloadEnabled;
    updateModeDisplay();
  }
});
