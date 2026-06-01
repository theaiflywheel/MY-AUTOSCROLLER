/**
 * @file popup.js
 * @description Settings controller for the FlowStream Extension popup.
 * Handles reading and writing user preferences to chrome.storage.local.
 */

document.addEventListener('DOMContentLoaded', () => {

  // Control Elements
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

  // Load saved preferences
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
    thresholdVal.textContent = `${settings.threshold}%`;
    speedSelect.value = settings.playbackSpeed.toString();
    pauseHoverCheck.checked = settings.pauseOnHover;
    pauseCommentsCheck.checked = settings.pauseOnComments;

    updateUIStates(settings.enabled);
  });

  // Master switch modification handlers
  masterCheck.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ enabled: isEnabled });
    updateUIStates(isEnabled);
  });

  // Site-specific toggles
  ytCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ ytShorts: e.target.checked });
  });

  igCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ igReels: e.target.checked });
  });

  xCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ xVideo: e.target.checked });
  });

  // Threshold range change
  thresholdRange.addEventListener('input', (e) => {
    const val = e.target.value;
    thresholdVal.textContent = `${val}%`;
  });

  thresholdRange.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    chrome.storage.local.set({ threshold: val });
  });

  // Playback Speed dropdown change
  speedSelect.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    chrome.storage.local.set({ playbackSpeed: val });
  });

  // Overrides checkbox entries
  pauseHoverCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ pauseOnHover: e.target.checked });
  });

  pauseCommentsCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ pauseOnComments: e.target.checked });
  });

  // Dynamically gray out controls if master switch is disabled
  function updateUIStates(isEnabled) {
    const interactiveElements = [ytCheck, igCheck, xCheck, thresholdRange, speedSelect, pauseHoverCheck, pauseCommentsCheck];
    interactiveElements.forEach(el => {
      el.disabled = !isEnabled;
      // Fade out parents a bit
      const parentRow = el.closest('.row') || el.closest('.site-toggle') || el.closest('.control-group');
      if (parentRow) {
        parentRow.style.opacity = isEnabled ? '1' : '0.45';
      }
    });

    if (isEnabled) {
      statusBlink.style.backgroundColor = '#22d3ee'; // cyan
      statusBlink.style.boxShadow = '0 0 8px #22d3ee';
      statusMsg.textContent = 'FlowStream active and monitoring';
    } else {
      statusBlink.style.backgroundColor = '#ef4444'; // red
      statusBlink.style.boxShadow = '0 0 8px #ef4444';
      statusMsg.textContent = 'FlowStream auto-scrolling is paused';
    }
  }

});
