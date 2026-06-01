/**
 * @file content_script.js
 * @description FlowStream Content Script for DOM-level video monitoring, UI overlay injection,
 * and automated platform-specific scrolling behaviors.
 */

(function () {
  'use strict';

  // State configurations
  let settings = {
    enabled: true,
    ytShorts: true,
    igReels: true,
    xVideo: true,
    threshold: 98,
    playbackSpeed: 1.0,
    pauseOnHover: true,
    pauseOnComments: true
  };

  let activeVideo = null;
  let activePlatform = null;
  let overlayContainer = null;
  let isHovering = false;
  let isCommentsOpen = false;
  let autoScrollActive = true; // Manual toggle within overlay
  let scrollPending = false;

  // Platform Definitions
  const PLATFORMS = {
    YOUTUBE: 'youtube',
    INSTAGRAM: 'instagram',
    TWITTER: 'twitter'
  };

  // Determine current platform
  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('youtube.com')) return PLATFORMS.YOUTUBE;
    if (host.includes('instagram.com')) return PLATFORMS.INSTAGRAM;
    if (host.includes('twitter.com') || host.includes('x.com')) return PLATFORMS.TWITTER;
    return null;
  }

  activePlatform = detectPlatform();
  if (!activePlatform) return;

  // Load state and listen for storage updates
  function loadSettings() {
    chrome.storage.local.get(Object.keys(settings), (data) => {
      Object.assign(settings, data);
      applySettings();
    });
  }

  function applySettings() {
    if (activeVideo) {
      activeVideo.playbackRate = settings.playbackSpeed;
    }
    updateOverlayVisibility();
  }

  chrome.storage.onChanged.addListener((changes) => {
    for (const key in changes) {
      settings[key] = changes[key].newValue;
    }
    applySettings();
  });

  loadSettings();

  // === Dynamic Comments Detection ===
  function checkCommentsSection() {
    if (!settings.pauseOnComments) {
      isCommentsOpen = false;
      return;
    }

    if (activePlatform === PLATFORMS.YOUTUBE) {
      // YouTube Shorts comments panel selector
      const engagementPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="reels-comments-panel"]');
      const isVisible = engagementPanel && (
        engagementPanel.hasAttribute('visibility') && engagementPanel.getAttribute('visibility') !== 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN' ||
        engagementPanel.classList.contains('opened') || 
        engagementPanel.getBoundingClientRect().width > 10
      );
      isCommentsOpen = !!isVisible;
    } else if (activePlatform === PLATFORMS.INSTAGRAM) {
      // Instagram comment dialogs or sidebars for reels
      const commentSections = document.querySelectorAll('div[role="dialog"], section[role="presentation"], div._a9zs');
      let open = false;
      commentSections.forEach(el => {
        const bbox = el.getBoundingClientRect();
        if (bbox.width > 200 && bbox.height > 200) {
          // Verify if it contains terms indicating comments or is a side drawer
          if (el.textContent.includes('Comment') || el.textContent.includes('Reply') || el.querySelector('textarea')) {
            open = true;
          }
        }
      });
      isCommentsOpen = open;
    } else if (activePlatform === PLATFORMS.TWITTER) {
      // Twitter overlay timeline splits / comment section
      const cellReplies = document.querySelector('article[data-testid="tweet"]') || document.querySelector('div[aria-label="Timeline: Conversation"]');
      const hasSplitView = !!cellReplies && window.innerWidth > 1000;
      isCommentsOpen = hasSplitView;
    }
  }

  // === Platform Specific Scrolling Mechanisms ===
  function performScrollNext() {
    if (scrollPending) return;
    scrollPending = true;

    console.log(`[FlowStream] Auto-scrolling to next video on ${activePlatform}...`);

    try {
      if (activePlatform === PLATFORMS.YOUTUBE) {
        // Try locating next short element inside YouTube Shorts
        const currentShort = document.querySelector('ytd-reel-video-renderer[is-active]');
        if (currentShort) {
          // Method 1: Locate "down arrow button" in shorts player
          const downBtn = currentShort.querySelector('#navigation-button-down button, ytd-reel-video-renderer[is-active] #navigation-button-down');
          if (downBtn) {
            downBtn.click();
            finalizeScroll();
            return;
          }

          // Method 2: Sibling elements
          const nextShort = currentShort.nextElementSibling;
          if (nextShort && nextShort.tagName === 'YTD-REEL-VIDEO-RENDERER') {
            nextShort.scrollIntoView({ behavior: 'smooth', block: 'start' });
            finalizeScroll();
            return;
          }
        }

        // Method 3: Simulate Down Arrow keypress event on window level
        simulateKeyPress(40); // 40 = ArrowDown code
      } 
      else if (activePlatform === PLATFORMS.INSTAGRAM) {
        // Find current reel viewport element
        const videos = document.querySelectorAll('video');
        let currentReelContainer = null;
        
        videos.forEach(v => {
          const rect = v.getBoundingClientRect();
          // Find video currently occupying center viewport height
          if (rect.top >= -100 && rect.top <= window.innerHeight / 2) {
            // Traverse up to find container (usually an article or dynamic div)
            let parent = v.parentElement;
            while (parent && parent.tagName !== 'ARTICLE' && parent !== document.body) {
              parent = parent.parentElement;
            }
            currentReelContainer = parent === document.body ? null : parent;
          }
        });

        if (currentReelContainer) {
          const nextReel = currentReelContainer.nextElementSibling;
          if (nextReel) {
            nextReel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            finalizeScroll();
            return;
          }
        }
        
        // Fallback: Dispatch arrow down event or mouse wheel
        simulateKeyPress(40);
      } 
      else if (activePlatform === PLATFORMS.TWITTER) {
        // Match active X/Twitter vertical modal timeline or status video selector
        const overlayClose = document.querySelector('div[aria-label="Close"]') || document.querySelector('[data-testid="app-bar-back"]');
        if (overlayClose) {
          // Inside modal presentation player
          simulateKeyPress(40); // Native behavior for modal feeds is Down Arrow
        } else {
          // Main timeline - skip doing anything to protect user stream reading!
          console.log("[FlowStream] On main timeline. Auto-scroll paused to prevent timeline disruption.");
        }
      }
    } catch (e) {
      console.error("[FlowStream] Scroll attempt failed:", e);
    }

    finalizeScroll();
  }

  function simulateKeyPress(keyCode) {
    const events = ['keydown', 'keypress', 'keyup'];
    events.forEach(type => {
      const e = new KeyboardEvent(type, {
        key: 'ArrowDown',
        keyCode: keyCode,
        which: keyCode,
        code: 'ArrowDown',
        bubbles: true,
        cancelable: true,
        view: window
      });
      document.dispatchEvent(e);
      window.dispatchEvent(e);
    });
  }

  function finalizeScroll() {
    setTimeout(() => {
      scrollPending = false;
    }, 1200); // Debounce trigger to allow scroll animation to settle
  }

  // === Embedded UI HUD Overlay (Scoped using Shadow DOM) ===
  function injectOverlay() {
    if (overlayContainer) return;

    overlayContainer = document.createElement('div');
    overlayContainer.id = 'flowstream-hud-root';
    overlayContainer.style.position = 'fixed';
    overlayContainer.style.top = '40%';
    overlayContainer.style.right = '20px';
    overlayContainer.style.width = '74px';
    overlayContainer.style.zIndex = '2147483647'; // Maximum possible z-index
    overlayContainer.style.pointerEvents = 'none';

    const shadow = overlayContainer.attachShadow({ mode: 'open' });

    const styles = `
      .hud-card {
        background: rgba(15, 15, 20, 0.45);
        backdrop-filter: blur(14px) saturate(180%);
        -webkit-backdrop-filter: blur(14px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 12px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        pointer-events: auto;
        font-family: system-ui, -apple-system, sans-serif;
        color: #fff;
        user-select: none;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      }
      .hud-card:hover {
        transform: scale(1.04);
        border-color: rgba(6, 182, 212, 0.5); /* Cyan glow */
        box-shadow: 0 10px 35px rgba(6, 182, 212, 0.2);
      }
      .progress-container {
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      svg {
        transform: rotate(-90deg);
        width: 48px;
        height: 48px;
      }
      .bg-circle {
        fill: none;
        stroke: rgba(255, 255, 255, 0.1);
        stroke-width: 4px;
      }
      .progress-circle {
        fill: none;
        stroke: #06b6d4; /* vibrant neon cyan */
        stroke-width: 4px;
        stroke-linecap: round;
        stroke-dasharray: 138.2; /* 2 * PI * r (r=22) -> ~138.2 */
        stroke-dashoffset: 138.2;
        transition: stroke-dashoffset 0.1s linear;
      }
      .percentage-text {
        position: absolute;
        font-size: 10px;
        font-weight: 700;
        color: #e2e8f0;
        font-family: inherit;
      }
      .action-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #cbd5e1;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .action-btn:hover {
        background: #06b6d4;
        color: #000;
        border-color: #06b6d4;
        box-shadow: 0 0 12px rgba(6, 182, 212, 0.6);
        transform: scale(1.1);
      }
      .action-btn.active {
        background: rgba(6, 182, 212, 0.15);
        color: #22d3ee;
        border-color: rgba(6, 182, 212, 0.4);
      }
      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #ef4444; /* red */
        transition: background-color 0.3s ease;
      }
      .status-dot.active {
        background-color: #22c55e; /* green */
        box-shadow: 0 0 8px #22c55e;
      }
      .tooltip {
        position: absolute;
        right: 80px;
        background: #1e293b;
        color: #f1f5f9;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }
      .hud-card *:hover > .tooltip {
        opacity: 1;
      }
    `;

    const html = `
      <div class="hud-card" id="hudCard">
        <!-- Circular Progress Tracker -->
        <div class="progress-container">
          <svg>
            <circle class="bg-circle" cx="24" cy="24" r="22"></circle>
            <circle class="progress-circle" id="progBar" cx="24" cy="24" r="22"></circle>
          </svg>
          <span class="percentage-text" id="progText">0%</span>
          <div class="tooltip">Video Progress</div>
        </div>

        <!-- Toggle Auto Scroll Play/Pause -->
        <button class="action-btn active" id="toggleScrollBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play"><polygon points="6 3 20 12 16 15 6 21 6 3"/></svg>
          <div class="tooltip" id="toggleTooltip">Pause Auto-Scroll</div>
        </button>

        <!-- Skip Now Button -->
        <button class="action-btn" id="skipBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-skip-forward"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
          <div class="tooltip">Skip Video (Force Next)</div>
        </button>

        <!-- Mode Indicator / Live Status -->
        <div style="display: flex; align-items: center; gap: 4px; font-size: 8px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">
          <div class="status-dot active" id="statusDot"></div>
          <span>Active</span>
        </div>
      </div>
    `;

    shadow.innerHTML = `<style>${styles}</style>${html}`;
    document.body.appendChild(overlayContainer);

    // Event Wire-up inside Shadow DOM
    const card = shadow.getElementById('hudCard');
    const toggleBtn = shadow.getElementById('toggleScrollBtn');
    const toggleTooltip = shadow.getElementById('toggleTooltip');
    const skipBtn = shadow.getElementById('skipBtn');
    const statusDot = shadow.getElementById('statusDot');

    // Hover Over Card Events
    card.addEventListener('mouseenter', () => { isHovering = true; });
    card.addEventListener('mouseleave', () => { isHovering = false; });

    toggleBtn.addEventListener('click', () => {
      autoScrollActive = !autoScrollActive;
      if (autoScrollActive) {
        toggleBtn.classList.add('active');
        toggleBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>
          <div class="tooltip" id="toggleTooltip">Pause Auto-Scroll</div>
        `;
        statusDot.classList.add('active');
      } else {
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          <div class="tooltip" id="toggleTooltip">Resume Auto-Scroll</div>
        `;
        statusDot.classList.remove('active');
      }
    });

    skipBtn.addEventListener('click', () => {
      performScrollNext();
    });
  }

  function updateOverlayVisibility() {
    if (!settings.enabled) {
      if (overlayContainer) {
        overlayContainer.style.display = 'none';
      }
      return;
    }

    // Platform-specific active checks
    const activeOnThisSite = 
      (activePlatform === PLATFORMS.YOUTUBE && settings.ytShorts) ||
      (activePlatform === PLATFORMS.INSTAGRAM && settings.igReels) ||
      (activePlatform === PLATFORMS.TWITTER && settings.xVideo);

    if (activeOnThisSite) {
      injectOverlay();
      if (overlayContainer) overlayContainer.style.display = 'block';
    } else {
      if (overlayContainer) overlayContainer.style.display = 'none';
    }
  }

  function updateVisualHUD(currentTime, duration) {
    if (!overlayContainer || !settings.enabled) return;

    const shadow = overlayContainer.shadowRoot;
    if (!shadow) return;

    const progBar = shadow.getElementById('progBar');
    const progText = shadow.getElementById('progText');
    const statusDot = shadow.getElementById('statusDot');

    if (duration > 0) {
      const percentage = (currentTime / duration) * 100;
      const progressFraction = percentage / 100;
      
      // Calculate SVG dash offset
      const circum = 2 * Math.PI * 22; // ~138.2
      const offset = circum - (progressFraction * circum);
      
      if (progBar) progBar.style.strokeDashoffset = offset;
      if (progText) progText.style.textContent = `${Math.floor(percentage)}%`;

      // Visual pulse indicator if paused for hover or comments
      const isPaused = !autoScrollActive || (settings.pauseOnHover && isHovering) || (settings.pauseOnComments && isCommentsOpen);
      if (isPaused) {
        statusDot.classList.remove('active');
        if (progBar) progBar.style.stroke = '#ef4444'; // Red for paused
      } else {
        statusDot.classList.add('active');
        if (progBar) progBar.style.stroke = '#06b6d4'; // Cyan for running
      }
    }
  }

  // === Video Element Monitoring ===
  function scanForVideoElements() {
    if (!settings.enabled) return;

    // Platform-specific active checks
    const activeOnThisSite = 
      (activePlatform === PLATFORMS.YOUTUBE && settings.ytShorts) ||
      (activePlatform === PLATFORMS.INSTAGRAM && settings.igReels) ||
      (activePlatform === PLATFORMS.TWITTER && settings.xVideo);

    if (!activeOnThisSite) return;

    let targetVideo = null;

    if (activePlatform === PLATFORMS.YOUTUBE) {
      // Look for the active video playing in shorts panel
      const currentShort = document.querySelector('ytd-reel-video-renderer[is-active]');
      if (currentShort) {
        targetVideo = currentShort.querySelector('video');
      } else {
        // Fallback to first visible playing video
        targetVideo = Array.from(document.querySelectorAll('video')).find(v => {
          const rect = v.getBoundingClientRect();
          return rect.width > 100 && rect.height > 100 && !v.paused;
        });
      }
    } 
    else if (activePlatform === PLATFORMS.INSTAGRAM) {
      // Find the running video that's active in the viewport
      targetVideo = Array.from(document.querySelectorAll('video')).find(v => {
        const rect = v.getBoundingClientRect();
        return rect.top >= -100 && rect.top <= window.innerHeight / 2 && !v.paused;
      }) || document.querySelector('video');
    } 
    else if (activePlatform === PLATFORMS.TWITTER) {
      // Capture open Twitter video feeds
      targetVideo = Array.from(document.querySelectorAll('video')).find(v => {
        const rect = v.getBoundingClientRect();
        return rect.width > 200 && rect.height > 200;
      });
    }

    if (targetVideo && targetVideo !== activeVideo) {
      hookVideo(targetVideo);
    }
  }

  function hookVideo(video) {
    if (activeVideo) {
      unhookVideo(activeVideo);
    }

    activeVideo = video;
    console.log("[FlowStream] Monitor hooked into new video player element:", video);
    
    // Apply speed preference on mount
    video.playbackRate = settings.playbackSpeed;

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleVideoEnded);
    
    // Scrape container to check for hover events
    let hoverContainer = video;
    let parent = video.parentElement;
    // Walk up a few elements to hook mouse listeners on the player wrapper
    for (let i = 0; i < 4 && parent && parent !== document.body; i++) {
      hoverContainer = parent;
      parent = parent.parentElement;
    }

    hoverContainer.addEventListener('mouseenter', handleMouseEnter);
    hoverContainer.addEventListener('mouseleave', handleMouseLeave);
  }

  function unhookVideo(video) {
    try {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleVideoEnded);
    } catch (err) {}
  }

  function handleMouseEnter() {
    isHovering = true;
  }

  function handleMouseLeave() {
    isHovering = false;
  }

  function handleTimeUpdate(e) {
    const video = e.target;
    const dur = video.duration;
    const cur = video.currentTime;

    if (!dur) return;

    // Check comments section panel dynamically during play
    checkCommentsSection();

    // Refresh overlay statistics
    updateVisualHUD(cur, dur);

    // Automation checking
    if (!autoScrollActive) return;
    if (settings.pauseOnHover && isHovering) return;
    if (settings.pauseOnComments && isCommentsOpen) return;

    const progressPercent = (cur / dur) * 100;
    if (progressPercent >= settings.threshold) {
      // Threshold hit - auto scroll immediately (to prevent end-of-video buffering lag)
      performScrollNext();
    }
  }

  function handleVideoEnded() {
    // Standard backup fallback if ended event triggers and threshold wasn't met for some reason
    if (autoScrollActive && !(settings.pauseOnHover && isHovering) && !(settings.pauseOnComments && isCommentsOpen)) {
      performScrollNext();
    }
  }

  // === MutationObserver for SPA support ===
  const domObserver = new MutationObserver((mutations) => {
    // Scan for new playing videos upon DOM mutations
    scanForVideoElements();
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Loop checking as absolute safety fallback
  const fallbackInterval = setInterval(() => {
    scanForVideoElements();
  }, 1000);

  // Clean-up hook (useful on extension reloads)
  window.addEventListener('unload', () => {
    clearInterval(fallbackInterval);
    domObserver.disconnect();
    if (activeVideo) unhookVideo(activeVideo);
  });

})();
