export const EXTENSION_FILES = [
  {
    name: "manifest.json",
    language: "json",
    path: "manifest.json",
    description: "Chrome Extension Configuration (Manifest V3)",
    content: `{
  "manifest_version": 3,
  "name": "FlowStream Auto-Scroll",
  "version": "1.0.0",
  "description": "Automatically scrolls to the next video on YouTube Shorts, Instagram Reels, and Twitter (X) Video Feed once the current video ends.",
  "permissions": [
    "storage"
  ],
  "host_permissions": [
    "https://*.youtube.com/*",
    "https://*.instagram.com/*",
    "https://*.x.com/*",
    "https://*.twitter.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://*.youtube.com/shorts*",
        "https://*.instagram.com/reels*",
        "https://*.instagram.com/reel*",
        "https://*.x.com/*/status/*/video*",
        "https://*.x.com/i/spaces*",
        "https://*.x.com/*",
        "https://*.twitter.com/*"
      ],
      "js": ["content_script.js"],
      "css": ["styles.css"]
    }
  ],
  "action": {
    "default_popup": "popup.html"
  }
}`
  },
  {
    name: "content_script.js",
    language: "javascript",
    path: "content_script.js",
    description: "DOM Automation, Progression Ring HUD, & Scrolling triggers",
    content: `/**
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

  const PLATFORMS = {
    YOUTUBE: 'youtube',
    INSTAGRAM: 'instagram',
    TWITTER: 'twitter'
  };

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('youtube.com')) return PLATFORMS.YOUTUBE;
    if (host.includes('instagram.com')) return PLATFORMS.INSTAGRAM;
    if (host.includes('twitter.com') || host.includes('x.com')) return PLATFORMS.TWITTER;
    return null;
  }

  activePlatform = detectPlatform();
  if (!activePlatform) return;

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

  function checkCommentsSection() {
    if (!settings.pauseOnComments) {
      isCommentsOpen = false;
      return;
    }

    if (activePlatform === PLATFORMS.YOUTUBE) {
      const engagementPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="reels-comments-panel"]');
      const isVisible = engagementPanel && (
        engagementPanel.hasAttribute('visibility') && engagementPanel.getAttribute('visibility') !== 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN' ||
        engagementPanel.classList.contains('opened') || 
        engagementPanel.getBoundingClientRect().width > 10
      );
      isCommentsOpen = !!isVisible;
    } else if (activePlatform === PLATFORMS.INSTAGRAM) {
      const commentSections = document.querySelectorAll('div[role="dialog"], section[role="presentation"], div._a9zs');
      let open = false;
      commentSections.forEach(el => {
        const bbox = el.getBoundingClientRect();
        if (bbox.width > 200 && bbox.height > 200) {
          if (el.textContent.includes('Comment') || el.textContent.includes('Reply') || el.querySelector('textarea')) {
            open = true;
          }
        }
      });
      isCommentsOpen = open;
    } else if (activePlatform === PLATFORMS.TWITTER) {
      const cellReplies = document.querySelector('article[data-testid="tweet"]') || document.querySelector('div[aria-label="Timeline: Conversation"]');
      const hasSplitView = !!cellReplies && window.innerWidth > 1000;
      isCommentsOpen = hasSplitView;
    }
  }

  function performScrollNext() {
    if (scrollPending) return;
    scrollPending = true;

    console.log(\`[FlowStream] Auto-scrolling to next video on \${activePlatform}...\`);

    try {
      if (activePlatform === PLATFORMS.YOUTUBE) {
        const currentShort = document.querySelector('ytd-reel-video-renderer[is-active]');
        if (currentShort) {
          const downBtn = currentShort.querySelector('#navigation-button-down button, ytd-reel-video-renderer[is-active] #navigation-button-down');
          if (downBtn) {
            downBtn.click();
            finalizeScroll();
            return;
          }

          const nextShort = currentShort.nextElementSibling;
          if (nextShort && nextShort.tagName === 'YTD-REEL-VIDEO-RENDERER') {
            nextShort.scrollIntoView({ behavior: 'smooth', block: 'start' });
            finalizeScroll();
            return;
          }
        }
        simulateKeyPress(40);
      } 
      else if (activePlatform === PLATFORMS.INSTAGRAM) {
        const videos = document.querySelectorAll('video');
        let currentReelContainer = null;
        
        videos.forEach(v => {
          const rect = v.getBoundingClientRect();
          if (rect.top >= -100 && rect.top <= window.innerHeight / 2) {
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
        simulateKeyPress(40);
      } 
      else if (activePlatform === PLATFORMS.TWITTER) {
        const overlayClose = document.querySelector('div[aria-label="Close"]') || document.querySelector('[data-testid="app-bar-back"]');
        if (overlayClose) {
          simulateKeyPress(40);
        } else {
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
    }, 1200);
  }

  function injectOverlay() {
    if (overlayContainer) return;

    overlayContainer = document.createElement('div');
    overlayContainer.id = 'flowstream-hud-root';
    overlayContainer.style.position = 'fixed';
    overlayContainer.style.top = '40%';
    overlayContainer.style.right = '20px';
    overlayContainer.style.width = '74px';
    overlayContainer.style.zIndex = '2147483647';
    overlayContainer.style.pointerEvents = 'none';

    const shadow = overlayContainer.attachShadow({ mode: 'open' });

    const styles = \`
      .hud-card {
        background: rgba(15, 15, 20, 0.45);
        backdrop-filter: blur(14px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 12px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        pointer-events: auto;
        font-family: system-ui, sans-serif;
        color: #fff;
        user-select: none;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      }
      .hud-card:hover {
        transform: scale(1.04);
        border-color: rgba(6, 182, 212, 0.5);
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
        stroke: #06b6d4;
        stroke-width: 4px;
        stroke-linecap: round;
        stroke-dasharray: 138.2;
        stroke-dashoffset: 138.2;
        transition: stroke-dashoffset 0.1s linear;
      }
      .percentage-text {
        position: absolute;
        font-size: 10px;
        font-weight: 700;
        color: #e2e8f0;
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
        background-color: #ef4444;
        transition: background-color 0.3s ease;
      }
      .status-dot.active {
        background-color: #22c55e;
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
    \`;

    const html = \`
      <div class="hud-card" id="hudCard">
        <div class="progress-container">
          <svg>
            <circle class="bg-circle" cx="24" cy="24" r="22"></circle>
            <circle class="progress-circle" id="progBar" cx="24" cy="24" r="22"></circle>
          </svg>
          <span class="percentage-text" id="progText">0%</span>
          <div class="tooltip">Video Progress</div>
        </div>

        <button class="action-btn active" id="toggleScrollBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>
          <div class="tooltip" id="toggleTooltip">Pause Auto-Scroll</div>
        </button>

        <button class="action-btn" id="skipBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
          <div class="tooltip">Skip Video (Force Next)</div>
        </button>

        <div style="display: flex; align-items: center; gap: 4px; font-size: 8px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">
          <div class="status-dot active" id="statusDot"></div>
          <span>Active</span>
        </div>
      </div>
    \`;

    shadow.innerHTML = \`<style>\${styles}</style>\${html}\`;
    document.body.appendChild(overlayContainer);

    const card = shadow.getElementById('hudCard');
    const toggleBtn = shadow.getElementById('toggleScrollBtn');
    const skipBtn = shadow.getElementById('skipBtn');
    const statusDot = shadow.getElementById('statusDot');

    card.addEventListener('mouseenter', () => { isHovering = true; });
    card.addEventListener('mouseleave', () => { isHovering = false; });

    toggleBtn.addEventListener('click', () => {
      autoScrollActive = !autoScrollActive;
      if (autoScrollActive) {
        toggleBtn.classList.add('active');
        toggleBtn.innerHTML = \`
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>
          <div class="tooltip">Pause Auto-Scroll</div>
        \`;
        statusDot.classList.add('active');
      } else {
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = \`
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          <div class="tooltip">Resume Auto-Scroll</div>
        \`;
        statusDot.classList.remove('active');
      }
    });

    skipBtn.addEventListener('click', () => {
      performScrollNext();
    });
  }

  function updateOverlayVisibility() {
    if (!settings.enabled) {
      if (overlayContainer) overlayContainer.style.display = 'none';
      return;
    }

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
      
      const circum = 2 * Math.PI * 22;
      const offset = circum - (progressFraction * circum);
      
      if (progBar) progBar.style.strokeDashoffset = offset;
      if (progText) progText.style.textContent = \`\${Math.floor(percentage)}%\`;

      const isPaused = !autoScrollActive || (settings.pauseOnHover && isHovering) || (settings.pauseOnComments && isCommentsOpen);
      if (isPaused) {
        statusDot.classList.remove('active');
        if (progBar) progBar.style.stroke = '#ef4444';
      } else {
        statusDot.classList.add('active');
        if (progBar) progBar.style.stroke = '#06b6d4';
      }
    }
  }

  function scanForVideoElements() {
    if (!settings.enabled) return;

    const activeOnThisSite = 
      (activePlatform === PLATFORMS.YOUTUBE && settings.ytShorts) ||
      (activePlatform === PLATFORMS.INSTAGRAM && settings.igReels) ||
      (activePlatform === PLATFORMS.TWITTER && settings.xVideo);

    if (!activeOnThisSite) return;

    let targetVideo = null;

    if (activePlatform === PLATFORMS.YOUTUBE) {
      const currentShort = document.querySelector('ytd-reel-video-renderer[is-active]');
      if (currentShort) {
        targetVideo = currentShort.querySelector('video');
      } else {
        targetVideo = Array.from(document.querySelectorAll('video')).find(v => {
          const rect = v.getBoundingClientRect();
          return rect.width > 100 && rect.height > 100 && !v.paused;
        });
      }
    } 
    else if (activePlatform === PLATFORMS.INSTAGRAM) {
      targetVideo = Array.from(document.querySelectorAll('video')).find(v => {
        const rect = v.getBoundingClientRect();
        return rect.top >= -100 && rect.top <= window.innerHeight / 2 && !v.paused;
      }) || document.querySelector('video');
    } 
    else if (activePlatform === PLATFORMS.TWITTER) {
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
    if (activeVideo) unhookVideo(activeVideo);
    activeVideo = video;
    
    video.playbackRate = settings.playbackSpeed;
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleVideoEnded);
    
    let hoverContainer = video;
    let parent = video.parentElement;
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

  function handleMouseEnter() { isHovering = true; }
  function handleMouseLeave() { isHovering = false; }

  function handleTimeUpdate(e) {
    const video = e.target;
    const dur = video.duration;
    const cur = video.currentTime;
    if (!dur) return;

    checkCommentsSection();
    updateVisualHUD(cur, dur);

    if (!autoScrollActive) return;
    if (settings.pauseOnHover && isHovering) return;
    if (settings.pauseOnComments && isCommentsOpen) return;

    const progressPercent = (cur / dur) * 100;
    if (progressPercent >= settings.threshold) {
      performScrollNext();
    }
  }

  function handleVideoEnded() {
    if (autoScrollActive && !(settings.pauseOnHover && isHovering) && !(settings.pauseOnComments && isCommentsOpen)) {
      performScrollNext();
    }
  }

  const domObserver = new MutationObserver(() => {
    scanForVideoElements();
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  const fallbackInterval = setInterval(() => {
    scanForVideoElements();
  }, 1000);

  window.addEventListener('unload', () => {
    clearInterval(fallbackInterval);
    domObserver.disconnect();
    if (activeVideo) unhookVideo(activeVideo);
  });

})();`
  },
  {
    name: "styles.css",
    language: "css",
    path: "styles.css",
    description: "Injected page stylesheet with smooth-scroll hooks & CSS keyframes",
    content: `/**
 * @file styles.css
 * @description Injected styles for FlowStream Auto-Scroll.
 * This styles any elements inserted into the main host page or scroll tweaks.
 */

/* Smooth scrolling override on reels-containers */
#shorts-container,
.reels-container,
div[role="menuitem"] {
  scroll-behavior: smooth !important;
}

@keyframes flowstreamTooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes flowstreamNeonPulse {
  0% { box-shadow: 0 0 4px rgba(6, 182, 212, 0.4); }
  50% { box-shadow: 0 0 12px rgba(6, 182, 212, 0.8); }
  100% { box-shadow: 0 0 4px rgba(6, 182, 212, 0.4); }
}`
  },
  {
    name: "popup.html",
    language: "html",
    path: "popup.html",
    description: "Dashboard Control Panel Popup interface (HTML5/CSS3 Grid)",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FlowStream Settings Dashboard</title>
  <style>
    :root {
      --bg-dark: #09090b;
      --bg-panel: #18181b;
      --border-color: #27272a;
      --cyan-light: #22d3ee;
      --cyan-primary: #06b6d4;
      --cyan-dark: #083344;
      --text-main: #f4f4f5;
      --text-muted: #a1a1aa;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 340px;
      padding: 16px;
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-container {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--cyan-light), var(--cyan-primary));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(6, 182, 212, 0.4);
    }

    .logo-text {
      font-family: inherit;
      font-weight: 700;
      font-size: 16px;
      letter-spacing: -0.5px;
      background: linear-gradient(to right, #ffffff, var(--cyan-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #27272a;
      transition: .3s cubic-bezier(0.16, 1, 0.3, 1);
      border-radius: 24px;
      border: 1px solid var(--border-color);
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: #9ca3af;
      transition: .3s cubic-bezier(0.16, 1, 0.3, 1);
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--cyan-dark);
      border-color: rgba(6, 182, 212, 0.5);
    }

    input:checked + .slider:before {
      transform: translateX(20px);
      background-color: var(--cyan-light);
    }

    .card {
      background-color: var(--bg-panel);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .row-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .row-title {
      font-weight: 500;
    }

    .row-desc {
      font-size: 11px;
      color: var(--text-muted);
    }

    .site-toggle {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .control-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .control-val {
      color: var(--cyan-light);
      font-weight: 700;
    }

    input[type="range"] {
      -webkit-appearance: none;
      width: 100%;
      height: 6px;
      background: #27272a;
      border-radius: 3px;
      outline: none;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--cyan-light);
      cursor: pointer;
      box-shadow: 0 0 6px rgba(6, 182, 212, 0.8);
      transition: transform 0.1s;
    }

    input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.25);
    }

    select {
      background-color: #27272a;
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 4px 8px;
      border-radius: 6px;
      outline: none;
      font-size: 12px;
      cursor: pointer;
    }

    select:focus {
      border-color: var(--cyan-light);
    }

    footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      border-top: 1px solid var(--border-color);
      padding-top: 12px;
      font-size: 11px;
      color: var(--text-muted);
    }

    .indicator-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .blink-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--cyan-light);
      box-shadow: 0 0 8px var(--cyan-light);
      animation: pulseBlink 2s infinite ease-in-out;
    }

    @keyframes pulseBlink {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="logo-container">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46L12.1 9H20a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46L11.9 15z"/></svg>
      </div>
      <span class="logo-text">FlowStream</span>
    </div>
    <label class="switch">
      <input type="checkbox" id="masterEnableCheck" checked>
      <span class="slider"></span>
    </label>
  </header>

  <div class="card">
    <div class="section-title">Active Domains</div>
    
    <div class="site-toggle">
      <div class="row-meta">
        <div class="row-title">YouTube Shorts</div>
        <div class="row-desc">youtube.com/shorts</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="ytShortsCheck" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="site-toggle">
      <div class="row-meta">
        <div class="row-title">Instagram Reels</div>
        <div class="row-desc">instagram.com/reels</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="igReelsCheck" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="site-toggle">
      <div class="row-meta">
        <div class="row-title">Twitter (X) Feeds</div>
        <div class="row-desc">x.com & twitter.com</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="xVideoCheck" checked>
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Autopilot Preferences</div>

    <div class="control-group">
      <div class="control-header">
        <span>Completion Threshold</span>
        <span class="control-val" id="thresholdVal">98%</span>
      </div>
      <input type="range" id="thresholdRange" min="80" max="100" value="98" step="1">
    </div>

    <div class="row" style="margin-top: 4px;">
      <div class="row-meta">
        <div class="row-title">Playback Velocity</div>
        <div class="row-desc">Default speed rate</div>
      </div>
      <select id="playbackSpeedSelect">
        <option value="1">1.0x (Normal)</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="2">2.0x</option>
      </select>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Smart Safety Overrides</div>

    <div class="row">
      <div class="row-meta">
        <div class="row-title">Pause on Hover</div>
        <div class="row-desc">Hold scroller on mouse entry</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="pauseHoverCheck" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div class="row">
      <div class="row-meta">
        <div class="row-title">Wait for Comments</div>
        <div class="row-desc">Pause if comments section is open</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="pauseCommentsCheck" checked>
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <footer>
    <div class="indicator-group">
      <div class="blink-dot" id="statusBlink"></div>
      <span id="statusMessage">Running ...</span>
    </div>
    <div style="font-size: 10px; opacity: 0.6;">Version 1.0.0 (Manifest V3)</div>
  </footer>

  <script src="popup.js"></script>
</body>
</html>`
  },
  {
    name: "popup.js",
    language: "javascript",
    path: "popup.js",
    description: "Popup interactions, local storage bindings & state reactive changes",
    content: `/**
 * @file popup.js
 * @description Settings controller for the FlowStream Extension popup.
 * Handles reading and writing user preferences to chrome.storage.local.
 */

document.addEventListener('DOMContentLoaded', () => {

  const masterCheck = document.getElementById('masterEnableCheck');
  const ytCheck = document.getElementById('ytShortsCheck');
  const igCheck = document.getElementById('igReelsCheck');
  const xCheck = document.getElementById('xVideoCheck');
  const thresholdRange = document.getElementById('thresholdRange');
  const thresholdVal = document.getElementById('thresholdVal');
  const speedSelect = document.getElementById('playbackSpeedSelect');
  const pauseHoverCheck = document.getElementById('pauseHoverCheck');
  const pauseCommentsCheck = document.getElementById('pauseCommentsCheck');
  
  const statusBlink = document.getElementById('statusBlink');
  const statusMsg = document.getElementById('statusMessage');

  chrome.storage.local.get({
    enabled: true,
    ytShorts: true,
    igReels: true,
    xVideo: true,
    threshold: 98,
    playbackSpeed: 1.0,
    pauseOnHover: true,
    pauseOnComments: true
  }, (settings) => {
    masterCheck.checked = settings.enabled;
    ytCheck.checked = settings.ytShorts;
    igCheck.checked = settings.igReels;
    xCheck.checked = settings.xVideo;
    thresholdRange.value = settings.threshold;
    thresholdVal.textContent = \`\${settings.threshold}%\`;
    speedSelect.value = settings.playbackSpeed.toString();
    pauseHoverCheck.checked = settings.pauseOnHover;
    pauseCommentsCheck.checked = settings.pauseOnComments;

    updateUIStates(settings.enabled);
  });

  masterCheck.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ enabled: isEnabled });
    updateUIStates(isEnabled);
  });

  ytCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ ytShorts: e.target.checked });
  });

  igCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ igReels: e.target.checked });
  });

  xCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ xVideo: e.target.checked });
  });

  thresholdRange.addEventListener('input', (e) => {
    const val = e.target.value;
    thresholdVal.textContent = \`\${val}%\`;
  });

  thresholdRange.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    chrome.storage.local.set({ threshold: val });
  });

  speedSelect.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    chrome.storage.local.set({ playbackSpeed: val });
  });

  pauseHoverCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ pauseOnHover: e.target.checked });
  });

  pauseCommentsCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ pauseOnComments: e.target.checked });
  });

  function updateUIStates(isEnabled) {
    const interactiveElements = [ytCheck, igCheck, xCheck, thresholdRange, speedSelect, pauseHoverCheck, pauseCommentsCheck];
    interactiveElements.forEach(el => {
      el.disabled = !isEnabled;
      const parentRow = el.closest('.row') || el.closest('.site-toggle') || el.closest('.control-group');
      if (parentRow) parentRow.style.opacity = isEnabled ? '1' : '0.45';
    });

    if (isEnabled) {
      statusBlink.style.backgroundColor = '#22d3ee';
      statusBlink.style.boxShadow = '0 0 8px #22d3ee';
      statusMsg.textContent = 'FlowStream active and monitoring';
    } else {
      statusBlink.style.backgroundColor = '#ef4444';
      statusBlink.style.boxShadow = '0 0 8px #ef4444';
      statusMsg.textContent = 'FlowStream auto-scrolling is paused';
    }
  }

});`
  },
  {
    name: "background.js",
    language: "javascript",
    path: "background.js",
    description: "Extension Service Worker & State Synchronization lifecycle hooks",
    content: `/**
 * @file background.js
 * @description Background service worker for FlowStream Extension.
 * Handles state initialization and lifecycle hooks inside Chrome.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  ytShorts: true,
  igReels: true,
  xVideo: true,
  threshold: 98,
  playbackSpeed: 1.0,
  pauseOnHover: true,
  pauseOnComments: true
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (result) => {
    const freshSettings = {};
    for (const key in DEFAULT_SETTINGS) {
      if (result[key] === undefined) freshSettings[key] = DEFAULT_SETTINGS[key];
    }
    if (Object.keys(freshSettings).length > 0) {
      chrome.storage.local.set(freshSettings, () => {
        console.log("FlowStream settings initialized:", freshSettings);
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    chrome.storage.local.get(null, (settings) => {
      sendResponse({ settings: { ...DEFAULT_SETTINGS, ...settings } });
    });
    return true;
  }
});`
  }
];
