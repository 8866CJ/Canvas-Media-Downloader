// Content script for Canvas Media Downloader
// Runs on Canvas pages to detect and report media files

console.log('Canvas Media Downloader content script loaded');

// Function to extract media URLs from the page
function detectMediaOnPage() {
  const mediaElements = [];
  
  // Find video elements
  const videos = document.querySelectorAll('video, video source');
  videos.forEach(video => {
    const src = video.src || video.getAttribute('src');
    if (src && src.startsWith('http')) {
      mediaElements.push({ type: 'video', url: src });
    }
  });
  
  // Find audio elements
  const audios = document.querySelectorAll('audio, audio source');
  audios.forEach(audio => {
    const src = audio.src || audio.getAttribute('src');
    if (src && src.startsWith('http')) {
      mediaElements.push({ type: 'audio', url: src });
    }
  });
  
  // Find iframe elements that might contain media
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    const src = iframe.src;
    if (src) {
      try {
        const url = new URL(src);
        // Check if hostname ends with instructuremedia.com or contains video/media keywords
        if (url.hostname.endsWith('.instructuremedia.com') || 
            url.hostname === 'instructuremedia.com' ||
            url.pathname.includes('/video/') || 
            url.pathname.includes('/media/')) {
          mediaElements.push({ type: 'iframe', url: src });
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });
  
  // Find links to media files
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.href;
    if (href && /\.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|mkv|avi|mov)(\?|$)/i.test(href)) {
      mediaElements.push({ type: 'link', url: href });
    }
  });
  
  return mediaElements;
}

// Send detected media to background script
function reportMedia(mediaElements) {
  mediaElements.forEach(media => {
    // Extract filename from URL
    let filename = 'media';
    try {
      const urlObj = new URL(media.url);
      const pathParts = urlObj.pathname.split('/');
      filename = pathParts[pathParts.length - 1] || 'media';
    } catch (e) {
      console.warn('Invalid URL format:', media.url);
      return; // Skip invalid URLs
    }
    
    chrome.runtime.sendMessage({
      action: 'mediaDetected',
      url: media.url,
      type: media.type,
      filename: filename
    }, (response) => {
      if (response && response.success && response.autoDownloaded) {
        console.log('Media auto-downloaded:', media.url);
      }
    });
  });
}

// Initial scan on page load
function initialScan() {
  const media = detectMediaOnPage();
  if (media.length > 0) {
    console.log('Found media files:', media.length);
    reportMedia(media);
  }
}

// Run initial scan when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialScan);
} else {
  initialScan();
}

// Set up mutation observer to detect dynamically loaded media
const observer = new MutationObserver((mutations) => {
  let shouldScan = false;
  
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        const tagName = node.tagName?.toLowerCase();
        if (tagName === 'video' || tagName === 'audio' || tagName === 'iframe' || tagName === 'source') {
          shouldScan = true;
        } else if (node.querySelector) {
          // Check if added node contains media elements
          if (node.querySelector('video, audio, iframe, source')) {
            shouldScan = true;
          }
        }
      }
    });
  });
  
  if (shouldScan) {
    // Debounce the scan
    clearTimeout(window.mediaScanTimeout);
    window.mediaScanTimeout = setTimeout(() => {
      const media = detectMediaOnPage();
      if (media.length > 0) {
        reportMedia(media);
      }
    }, 500);
  }
});

// Start observing
observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  observer.disconnect();
});
