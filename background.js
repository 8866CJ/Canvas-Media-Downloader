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
  /\.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|mkv|avi|mov|wmv|flv|m4v)(\?|$|&)/i,
  /\/media\//i,
  /\/videos\//i,
  /\/audio\//i,
  /\/files\/.*\/download/i, // Canvas file download URLs
  /\/courses\/.*\/files\//i, // Canvas course files
  /video\/|audio\//i,
  /^https?:\/\/([a-z0-9-]+\.)*instructuremedia\.com\//i,
  /canvas.*\.(mp4|webm|mp3)/i,
  /content-type=audio/i, // Canvas sometimes uses content-type in URL params
  /content-type=video/i
];

// Check if URL is a media file
function isMediaUrl(url) {
  // Skip common non-media patterns
  const invalidPatterns = [
    /\/api\//i, // API endpoints
    /\/api$/i,
    /annotation/i,
    /metadata/i,
    /\/sets$/i,
    /\/sets\?/i,
    /\/info$/i,
    /\/info\?/i,
    /\/stats$/i,
    /thumbnail/i,
    /preview/i,
    /perspectives/i, // Media management API
    /include\[\]/i, // API query parameters
  ];
  
  if (invalidPatterns.some(pattern => pattern.test(url))) {
    return false;
  }
  
  return MEDIA_PATTERNS.some(pattern => pattern.test(url));
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'mediaDetected') {
    const mediaUrl = request.url;
    
    // Check if it's a DRM-protected video
    const isDRM = mediaUrl.includes('/drm/');
    
    if (isDRM) {
      console.warn('DRM-protected video detected - cannot download directly:', mediaUrl);
      console.warn('This video is encrypted. To save it, you must:');
      console.warn('1. Use screen recording software (OBS Studio, Windows Game Bar)');
      console.warn('2. Or check if the course offers a downloadable MP4 version');
      
      // Don't add to captured list or try to download DRM content
      sendResponse({ success: false, reason: 'drm-protected' });
      return true;
    }
    
    // Avoid duplicates
    if (!capturedMediaUrls.includes(mediaUrl)) {
      capturedMediaUrls.push(mediaUrl);
      
      // Determine filename with proper extension
      let filename = request.filename;
      
      // If it's a redirect URL or doesn't have an extension, add .mp4
      if (mediaUrl.includes('/redirect') || mediaUrl.includes('media_attachments')) {
        // Extract a base name from the URL
        const urlObj = new URL(mediaUrl);
        const pathParts = urlObj.pathname.split('/');
        const mediaId = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
        filename = `canvas-media-${mediaId}.mp4`;
      } else if (!filename.includes('.')) {
        filename = `${filename}.mp4`;
      }
      
      // Auto-download if enabled
      if (isAutoDownloadEnabled) {
        downloadMedia(mediaUrl, filename);
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

// Safely download media file. Tries a HEAD request with credentials to check access.
async function safeDownload(url, filename) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = url.match(/\.([a-z0-9]+)(\?|$)/i)?.[1] || 'mp4';
  const defaultFilename = filename || `canvas-media-${timestamp}.${extension}`;

  try {
    // Try a HEAD request with credentials to see if resource is accessible and to read headers
    let headResponse;
    try {
      headResponse = await fetch(url, { method: 'HEAD', credentials: 'include', redirect: 'follow' });
    } catch (e) {
      // Some servers don't accept HEAD. We'll fall back to GET below.
      headResponse = null;
    }

    if (headResponse && (headResponse.status === 200 || headResponse.status === 206)) {
      // Good to download directly (resource accessible with credentials)
      chrome.downloads.download({ url: url, filename: defaultFilename, saveAs: false }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Direct download failed:', chrome.runtime.lastError);
        } else {
          console.log('Download started:', downloadId, url);
        }
      });
      return;
    }

    // If HEAD returned 403 or is unavailable, try fetching the resource with credentials and download the blob
    const getResponse = await fetch(url, { method: 'GET', credentials: 'include', redirect: 'follow' });
    if (!getResponse.ok) {
      console.error('Failed to fetch resource for download:', getResponse.status, getResponse.statusText, url);
      return;
    }

    const contentType = getResponse.headers.get('content-type') || '';
    // If server returned an HTML page (forbidden/redirect to login), don't save the HTML
    if (contentType.includes('text/html')) {
      console.warn('Fetch returned HTML (likely a 403/login page), aborting download for:', url);
      return;
    }

    const blob = await getResponse.blob();

    // Try to determine extension from Content-Type if not present
    let finalFilename = defaultFilename;
    if (!/\.[a-z0-9]+$/i.test(finalFilename)) {
      const mimeExt = contentType.split('/')[1]?.split(';')[0];
      if (mimeExt) finalFilename = `${defaultFilename}.${mimeExt}`;
    }

    // Create an object URL and download it
    const objectUrl = URL.createObjectURL(blob);
    chrome.downloads.download({ url: objectUrl, filename: finalFilename, saveAs: false }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Blob download failed:', chrome.runtime.lastError);
        // revoke immediately on failure
        try { URL.revokeObjectURL(objectUrl); } catch (e) {}
      } else {
        console.log('Blob download started:', downloadId, url);
        // Revoke the object URL after a minute to free memory
        setTimeout(() => {
          try { URL.revokeObjectURL(objectUrl); } catch (e) {}
        }, 60 * 1000);
      }
    });
  } catch (err) {
    console.error('safeDownload error for', url, err);
  }
}

// Wrapper to call safeDownload (keeps backward-compatible name)
function downloadMedia(url, filename) {
  safeDownload(url, filename);
}

// Web request listener for network monitoring
chrome.webRequest.onCompleted.addListener(
  (details) => {
    // Skip streaming chunks, manifests, and non-media files
    if (details.url.includes('.m4s') || details.url.includes('.ts') || 
        details.url.includes('chunk-') || details.url.includes('.mpd') || 
        details.url.includes('.m3u8') || details.url.includes('manifest') ||
        details.url.includes('.js') || details.url.includes('.css') || 
        details.url.includes('.woff') || details.url.includes('.jpg') || 
        details.url.includes('.png') || details.url.includes('.gif')) {
      return; // Skip these files
    }
    
    // Check if it's a media file by URL pattern
    const urlMatches = isMediaUrl(details.url);
    
    // Also check Content-Type header for audio/video
    let contentTypeMatches = false;
    if (details.responseHeaders) {
      const contentTypeHeader = details.responseHeaders.find(
        header => header.name.toLowerCase() === 'content-type'
      );
      if (contentTypeHeader) {
        const contentType = contentTypeHeader.value.toLowerCase();
        // Only accept complete media types, not streaming segments
        contentTypeMatches = (contentType.includes('audio/') || contentType.includes('video/')) &&
                            !contentType.includes('application/dash+xml') &&
                            !contentType.includes('application/x-mpegURL');
        
        if (contentTypeMatches) {
          console.log('Media detected by Content-Type:', details.url, 'Type:', contentType);
        }
      }
    }
    
    // Accept if URL matches OR Content-Type matches, and status is success or partial content
    if ((urlMatches || contentTypeMatches) && (details.statusCode === 200 || details.statusCode === 206)) {
      console.log('Media file detected in network:', details.url, 'Status:', details.statusCode);
      
      // Extract filename from URL
      let filename = 'media';
      try {
        const urlObj = new URL(details.url);
        const pathParts = urlObj.pathname.split('/');
        filename = pathParts[pathParts.length - 1] || 'media';
        
        // If filename is just "redirect" or empty, try to create a better name
        if (!filename || filename === 'redirect') {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          filename = `canvas-media-${timestamp}`;
        }
      } catch (e) {
        console.warn('Invalid URL in webRequest:', details.url);
        return; // Skip invalid URLs
      }
      
      // Store for potential download
      if (!capturedMediaUrls.includes(details.url)) {
        capturedMediaUrls.push(details.url);
        console.log('Added to media list:', details.url);
        
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
