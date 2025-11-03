// Background service worker for Canvas Media Downloader
// Monitors network requests and manages downloads

let isAutoDownloadEnabled = true;
let capturedMediaUrls = [];

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ autoDownload: true });
});

// Load settings on startup
chrome.storage.sync.get(['autoDownload'], (result) => {
  isAutoDownloadEnabled = result.autoDownload !== false;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.autoDownload) {
    isAutoDownloadEnabled = changes.autoDownload.newValue;
  }
});

// Media file patterns
const MEDIA_PATTERNS = [
  /\.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|mkv|avi|mov|wmv|flv|m4v)(\?|$)/i,
  /\/media\//i,
  /\/videos\//i,
  /\/audio\//i,
  /video\/|audio\//i,
  /\.instructuremedia\.com/i,
  /canvas.*\.(mp4|webm|mp3)/i
];

// Check if URL is a media file
function isMediaUrl(url) {
  return MEDIA_PATTERNS.some(pattern => pattern.test(url));
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'mediaDetected') {
    const mediaUrl = request.url;
    
    // Avoid duplicates
    if (!capturedMediaUrls.includes(mediaUrl)) {
      capturedMediaUrls.push(mediaUrl);
      
      // Auto-download if enabled
      if (isAutoDownloadEnabled) {
        downloadMedia(mediaUrl, request.filename);
      }
      
      // Notify popup
      sendResponse({ success: true, autoDownloaded: isAutoDownloadEnabled });
    } else {
      sendResponse({ success: false, reason: 'duplicate' });
    }
    return true;
  } else if (request.action === 'getMediaList') {
    sendResponse({ mediaUrls: capturedMediaUrls, autoDownload: isAutoDownloadEnabled });
    return true;
  } else if (request.action === 'downloadMedia') {
    downloadMedia(request.url, request.filename);
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'clearMediaList') {
    capturedMediaUrls = [];
    sendResponse({ success: true });
    return true;
  }
});

// Download media file
function downloadMedia(url, filename) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = url.match(/\.([a-z0-9]+)(\?|$)/i)?.[1] || 'media';
  const defaultFilename = filename || `canvas-media-${timestamp}.${extension}`;
  
  chrome.downloads.download({
    url: url,
    filename: defaultFilename,
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download failed:', chrome.runtime.lastError);
    } else {
      console.log('Download started:', downloadId, url);
    }
  });
}

// Web request listener for network monitoring
chrome.webRequest.onCompleted.addListener(
  (details) => {
    // Check if it's a media file
    if (isMediaUrl(details.url) && details.statusCode === 200) {
      // Extract filename from URL
      let filename = 'media';
      try {
        const urlObj = new URL(details.url);
        const pathParts = urlObj.pathname.split('/');
        filename = pathParts[pathParts.length - 1] || 'media';
      } catch (e) {
        console.warn('Invalid URL in webRequest:', details.url);
        return; // Skip invalid URLs
      }
      
      // Store for potential download
      if (!capturedMediaUrls.includes(details.url)) {
        capturedMediaUrls.push(details.url);
        
        // Auto-download if enabled
        if (isAutoDownloadEnabled) {
          downloadMedia(details.url, filename);
        }
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

console.log('Canvas Media Downloader background script loaded');
