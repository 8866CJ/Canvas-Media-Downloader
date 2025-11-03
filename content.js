// Content script for Canvas Media Downloader
// Runs on Canvas pages to detect and report media files

const isInIframe = window.self !== window.top;
console.log('Canvas Media Downloader content script loaded', isInIframe ? '(in iframe)' : '(main frame)');

// Function to extract media URLs from the page
function detectMediaOnPage() {
  const mediaElements = [];
  const seenUrls = new Set(); // Track URLs to avoid duplicates
  
  // Debug: Check what elements exist
  console.log('Debug - Scanning from URL:', window.location.href);
  console.log('Debug - Audio elements found:', document.querySelectorAll('audio').length);
  console.log('Debug - Video elements found:', document.querySelectorAll('video').length);
  console.log('Debug - Iframe elements found:', document.querySelectorAll('iframe').length);
  
  // Check for shadow DOM and look inside
  const allElements = document.querySelectorAll('*');
  let shadowRootCount = 0;
  allElements.forEach(el => {
    if (el.shadowRoot) {
      shadowRootCount++;
      // Check for video/audio in shadow DOM
      const shadowAudios = el.shadowRoot.querySelectorAll('audio');
      const shadowVideos = el.shadowRoot.querySelectorAll('video');
      console.log('Debug - Shadow DOM found with audio:', shadowAudios.length, 'video:', shadowVideos.length);
      
      // Process shadow DOM videos
      shadowVideos.forEach(video => {
        let src = video.src || video.getAttribute('src') || video.getAttribute('data-src') || video.currentSrc;
        if (src) {
          if (src.startsWith('/')) {
            src = window.location.origin + src;
          }
          if (src && !seenUrls.has(src)) {
            console.log('Detected video in shadow DOM:', src);
            mediaElements.push({ type: 'video', url: src });
            seenUrls.add(src);
          }
        }
        
        // Check source elements in shadow DOM
        const sources = video.querySelectorAll('source');
        sources.forEach(source => {
          let sourceSrc = source.src || source.getAttribute('src');
          if (sourceSrc) {
            if (sourceSrc.startsWith('/')) {
              sourceSrc = window.location.origin + sourceSrc;
            }
            if (sourceSrc && !seenUrls.has(sourceSrc)) {
              console.log('Detected video source in shadow DOM:', sourceSrc);
              mediaElements.push({ type: 'video', url: sourceSrc });
              seenUrls.add(sourceSrc);
            }
          }
        });
      });
      
      // Process shadow DOM audios
      shadowAudios.forEach(audio => {
        let src = audio.src || audio.getAttribute('src') || audio.getAttribute('data-src') || audio.currentSrc;
        if (src) {
          if (src.startsWith('/')) {
            src = window.location.origin + src;
          }
          if (src && !seenUrls.has(src)) {
            console.log('Detected audio in shadow DOM:', src);
            mediaElements.push({ type: 'audio', url: src });
            seenUrls.add(src);
          }
        }
      });
    }
  });
  console.log('Debug - Shadow roots found:', shadowRootCount);
  
  // Find video elements
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    console.log('Debug - Examining video element:', video);
    console.log('Debug - video.src:', video.src);
    console.log('Debug - video.currentSrc:', video.currentSrc);
    console.log('Debug - video.getAttribute("src"):', video.getAttribute('src'));
    
    // Try multiple possible source attributes on the video element itself
    let src = video.src || video.getAttribute('src') || video.getAttribute('data-src') || video.currentSrc;
    
    if (src) {
  // Skip streaming chunk files and invalid URLs
      if (src.includes('.m4s') || src.includes('.ts') || src.includes('chunk-') || 
          src.includes('.js') || src.includes('.css') || src.includes('.woff')) {
        console.log('Skipping streaming/resource file:', src);
        return;
      }
      
      // ALLOW manifest files (.m3u8, .mpd) - these are the master playlists we can use
      const isManifest = src.includes('.m3u8') || src.includes('.mpd') || src.includes('manifest');
      
      // Convert relative URLs to absolute URLs
      if (src.startsWith('/')) {
        src = window.location.origin + src;
      } else if (!src.startsWith('http') && !src.startsWith('blob:') && !src.startsWith('data:')) {
        // Handle relative paths without leading slash
        try {
          const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
          src = new URL(src, baseUrl).href;
        } catch (e) {
          console.warn('Failed to convert video URL:', src, e);
        }
      }
      
      // Accept http/https URLs and blob/data URLs
      if (src && (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:'))) {
        if (!seenUrls.has(src)) {
          if (isManifest) {
            console.log('Detected video manifest (HLS/DASH playlist):', src);
          } else {
            console.log('Detected video (direct):', src);
          }
          mediaElements.push({ type: isManifest ? 'manifest' : 'video', url: src });
          seenUrls.add(src);
        }
      }
    }
    
    // Also check child <source> elements
    const sources = video.querySelectorAll('source');
    console.log('Debug - Found', sources.length, 'source elements in video');
    sources.forEach(source => {
      console.log('Debug - Examining source element:', source);
      console.log('Debug - source.src:', source.src);
      console.log('Debug - source.getAttribute("src"):', source.getAttribute('src'));
      
      let sourceSrc = source.src || source.getAttribute('src') || source.getAttribute('data-src');
      
      if (sourceSrc) {
        // Skip streaming chunk files
        if (sourceSrc.includes('.m4s') || sourceSrc.includes('.ts') || sourceSrc.includes('chunk-') ||
            sourceSrc.includes('.js') || sourceSrc.includes('.css') || sourceSrc.includes('.woff')) {
          return;
        }
        
        // ALLOW manifest files
        const isManifest = sourceSrc.includes('.m3u8') || sourceSrc.includes('.mpd') || sourceSrc.includes('manifest');
        
        // Convert relative URLs to absolute URLs
        if (sourceSrc.startsWith('/')) {
          sourceSrc = window.location.origin + sourceSrc;
        } else if (!sourceSrc.startsWith('http') && !sourceSrc.startsWith('blob:') && !sourceSrc.startsWith('data:')) {
          try {
            const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
            sourceSrc = new URL(sourceSrc, baseUrl).href;
          } catch (e) {
            console.warn('Failed to convert source URL:', sourceSrc, e);
          }
        }
        
        if (sourceSrc && (sourceSrc.startsWith('http') || sourceSrc.startsWith('blob:') || sourceSrc.startsWith('data:'))) {
          if (!seenUrls.has(sourceSrc)) {
            if (isManifest) {
              console.log('Detected video manifest from source element (HLS/DASH playlist):', sourceSrc);
            } else {
              console.log('Detected video (source element):', sourceSrc);
            }
            mediaElements.push({ type: isManifest ? 'manifest' : 'video', url: sourceSrc });
            seenUrls.add(sourceSrc);
          }
        }
      }
    });
  });
  
  // Find audio elements
  const audios = document.querySelectorAll('audio');
  audios.forEach(audio => {
    // Try multiple possible source attributes on the audio element itself
    let src = audio.src || audio.getAttribute('src') || audio.getAttribute('data-src') || audio.currentSrc;
    
    if (src) {
      // Skip streaming chunk files and invalid URLs
      if (src.includes('.m4s') || src.includes('.ts') || src.includes('chunk-') ||
          src.includes('.js') || src.includes('.css') || src.includes('.woff') ||
          src.includes('manifest') || src.includes('.mpd') || src.includes('.m3u8')) {
        console.log('Skipping streaming/resource file:', src);
        return;
      }
      
      // Convert relative URLs to absolute URLs
      if (src.startsWith('/')) {
        src = window.location.origin + src;
      } else if (!src.startsWith('http') && !src.startsWith('blob:') && !src.startsWith('data:')) {
        // Handle relative paths without leading slash
        try {
          const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
          src = new URL(src, baseUrl).href;
        } catch (e) {
          console.warn('Failed to convert audio URL:', src, e);
        }
      }
      
      // Accept http/https URLs and blob/data URLs
      if (src && (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:'))) {
        if (!seenUrls.has(src)) {
          console.log('Detected audio (direct):', src);
          mediaElements.push({ type: 'audio', url: src });
          seenUrls.add(src);
        }
      }
    }
    
    // Also check child <source> elements
    const sources = audio.querySelectorAll('source');
    sources.forEach(source => {
      let sourceSrc = source.src || source.getAttribute('src') || source.getAttribute('data-src');
      
      if (sourceSrc) {
        // Skip streaming chunk files
        if (sourceSrc.includes('.m4s') || sourceSrc.includes('.ts') || sourceSrc.includes('chunk-') ||
            sourceSrc.includes('.js') || sourceSrc.includes('.css') || sourceSrc.includes('.woff') ||
            sourceSrc.includes('manifest') || sourceSrc.includes('.mpd') || sourceSrc.includes('.m3u8')) {
          return;
        }
        
        // Convert relative URLs to absolute URLs
        if (sourceSrc.startsWith('/')) {
          sourceSrc = window.location.origin + sourceSrc;
        } else if (!sourceSrc.startsWith('http') && !sourceSrc.startsWith('blob:') && !sourceSrc.startsWith('data:')) {
          try {
            const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
            sourceSrc = new URL(sourceSrc, baseUrl).href;
          } catch (e) {
            console.warn('Failed to convert source URL:', sourceSrc, e);
          }
        }
        
        if (sourceSrc && (sourceSrc.startsWith('http') || sourceSrc.startsWith('blob:') || sourceSrc.startsWith('data:'))) {
          if (!seenUrls.has(sourceSrc)) {
            console.log('Detected audio (source element):', sourceSrc);
            mediaElements.push({ type: 'audio', url: sourceSrc });
            seenUrls.add(sourceSrc);
          }
        }
      }
    });
  });
  
  // Find iframe elements that might contain media
  // Note: We detect these for logging but DON'T report them for download
  // The content script running INSIDE the iframe will detect the actual media
  const iframes = document.querySelectorAll('iframe');
  console.log('Debug - Found', iframes.length, 'iframes, examining their src attributes...');
  iframes.forEach((iframe, index) => {
    const src = iframe.src;
    console.log(`Debug - Iframe ${index + 1} src:`, src);
    
    // Don't add iframes to media list - wait for the content script inside the iframe to find the actual media
    // if (src && !seenUrls.has(src)) {
    //   ... removed iframe detection for download
    // }
  });
  
  // Find links to media files
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.href;
    if (href && !seenUrls.has(href) && /\.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|mkv|avi|mov)(\?|$)/i.test(href)) {
      console.log('Detected media link:', href);
      mediaElements.push({ type: 'link', url: href });
      seenUrls.add(href);
    }
  });
  
  return mediaElements;
}

// Track what we've already reported to avoid duplicates
const reportedUrls = new Set();

// Check if URL looks like an actual media file (not API endpoints or metadata)
function isValidMediaUrl(url) {
  // Must be a full URL
  if (!url.startsWith('http') && !url.startsWith('blob:') && !url.startsWith('data:')) {
    return false;
  }
  
  // Blob URLs from video player iframes are NOT valid for download (they're temporary)
  // Skip blob URLs - they can't be downloaded from background script
  if (url.startsWith('blob:')) {
    console.log('Skipping blob URL (temporary, cannot download):', url);
    return false;
  }
  
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
    console.log('Rejecting non-media URL:', url);
    return false;
  }
  
  // Must contain clear media indicators
  const validPatterns = [
    /\.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|mkv|avi|mov|m4v)(\?|$|&)/i,
    /\.(m3u8|mpd)(\?|$|&)/i, // HLS/DASH manifests
    /\/redirect\?bitrate=/i, // Canvas redirect URLs
    /\/download/i,
    /\/media_attachments\/\d+\/redirect/i,
    /\/media\/[^\/]+\.(mp4|mp3|webm|ogg|m4a)/i, // Direct media paths
    /manifest/i, // Manifest files
  ];
  
  return validPatterns.some(pattern => pattern.test(url));
}

// Send detected media to background script
function reportMedia(mediaElements) {
  let newMediaCount = 0;
  
  mediaElements.forEach(media => {
    // Skip if already reported
    if (reportedUrls.has(media.url)) {
      return;
    }
    
    // Validate that this is actually a media URL
    if (!isValidMediaUrl(media.url)) {
      return;
    }
    
    reportedUrls.add(media.url);
    newMediaCount++;
    
    // Extract filename from URL
    let filename = 'media';
    try {
      const urlObj = new URL(media.url);
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1] || 'media';
      
      // If it's a redirect URL, we'll need the background script to resolve it
      if (lastPart === 'redirect' || !lastPart.includes('.')) {
        filename = 'canvas-media'; // Background will add extension after following redirect
      } else {
        filename = lastPart;
      }
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
  
  if (newMediaCount > 0) {
    console.log(`Reported ${newMediaCount} new media file(s)`);
  }
}

// Initial scan on page load
function initialScan() {
  const media = detectMediaOnPage();
  console.log('Canvas Media Downloader - Initial scan complete');
  console.log('Found media elements:', media);
  if (media.length > 0) {
    console.log('Found media files:', media.length);
    reportMedia(media);
  } else {
    console.log('No media files detected on initial scan');
  }
}

// Run initial scan when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialScan);
} else {
  initialScan();
}

// For video player iframes, do additional delayed scans since videos load dynamically
if (isInIframe && window.location.href.includes('instructuremedia.com')) {
  console.log('Video player iframe detected - scheduling additional scans');
  
  // Intercept when video src is set
  const originalSetAttribute = HTMLMediaElement.prototype.setAttribute;
  HTMLMediaElement.prototype.setAttribute = function(name, value) {
    if ((name === 'src' || name === 'data-src') && value) {
      console.log('Video src being set:', value);
      if (value.includes('manifest.mpd') || value.includes('.m3u8')) {
        console.log('MANIFEST DETECTED:', value);
        setTimeout(() => {
          reportMedia([{ type: 'manifest', url: value }]);
        }, 100);
      }
    }
    return originalSetAttribute.call(this, name, value);
  };
  
  // Also intercept direct src property assignment
  const videoElements = document.getElementsByTagName('video');
  for (let video of videoElements) {
    const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (originalSrcDescriptor && originalSrcDescriptor.set) {
      Object.defineProperty(video, 'src', {
        set: function(value) {
          console.log('Video src property being set:', value);
          if (value && (value.includes('manifest.mpd') || value.includes('.m3u8'))) {
            console.log('MANIFEST DETECTED via property:', value);
            setTimeout(() => {
              reportMedia([{ type: 'manifest', url: value }]);
            }, 100);
          }
          return originalSrcDescriptor.set.call(this, value);
        },
        get: originalSrcDescriptor.get
      });
    }
  }
  
  // Try to extract the media ID from the URL
  const urlMatch = window.location.href.match(/perspective\/([^\/\?]+)/);
  const mediaIdMatch = window.location.href.match(/custom_arc_media_id=([^&]+)/);
  
  if (urlMatch || mediaIdMatch) {
    const perspectiveId = urlMatch ? urlMatch[1] : null;
    const mediaId = mediaIdMatch ? mediaIdMatch[1] : null;
    
    console.log('Arc Media detected - Perspective ID:', perspectiveId, 'Media ID:', mediaId);
    
    // Try to find the download URL via Arc's API
    if (perspectiveId) {
      setTimeout(() => {
        // Look for the Arc player's data
        const arcData = window.__INITIAL_STATE__ || window.__arc_data__;
        if (arcData) {
          console.log('Arc player data found:', arcData);
        }
        
        // Try to intercept fetch requests to find the actual media URL
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
          const response = await originalFetch.apply(this, args);
          const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
          
          // Log API calls that might contain media URLs
          if (url && (url.includes('media') || url.includes('download') || url.includes('stream'))) {
            console.log('Arc API call detected:', url);
            
            // Clone the response to read it
            const clonedResponse = response.clone();
            try {
              const data = await clonedResponse.json();
              console.log('Arc API response:', data);
              
              // Look for download URLs in the response
              if (data.download_url || data.downloadUrl || data.url) {
                const downloadUrl = data.download_url || data.downloadUrl || data.url;
                console.log('Found potential download URL:', downloadUrl);
                reportMedia([{ type: 'video', url: downloadUrl }]);
              }
            } catch (e) {
              // Not JSON, ignore
            }
          }
          
          return response;
        };
      }, 1000);
    }
  }
  
  // Scan at 2, 5, and 10 seconds for dynamic video players
  [2000, 5000, 10000].forEach(delay => {
    setTimeout(() => {
      console.log(`Video player scan at ${delay}ms`);
      const media = detectMediaOnPage();
      if (media.length > 0) {
        console.log(`Found ${media.length} media file(s) in video player:`, media);
        reportMedia(media);
      }
    }, delay);
  });
}

// Set up mutation observer to detect dynamically loaded media
const observer = new MutationObserver((mutations) => {
  let foundNewMedia = false;
  
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        const tagName = node.tagName?.toLowerCase();
        // Check for media elements or iframes
        if (tagName === 'video' || tagName === 'audio' || tagName === 'iframe' || tagName === 'source') {
          foundNewMedia = true;
        } else if (node.querySelector) {
          // Check if added node contains media elements
          if (node.querySelector('video, audio, iframe, source')) {
            foundNewMedia = true;
          }
        }
      }
    });
  });
  
  if (foundNewMedia) {
    // Debounce the scan - wait 2 seconds after last change before scanning
    clearTimeout(window.mediaScanTimeout);
    window.mediaScanTimeout = setTimeout(() => {
      console.log('Mutation detected - scanning for new media...');
      const media = detectMediaOnPage();
      if (media.length > 0) {
        reportMedia(media);
      }
    }, 2000);
  }
});

// Start observing the DOM for changes
if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
} else {
  // If body doesn't exist yet, wait for it
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  observer.disconnect();
});
