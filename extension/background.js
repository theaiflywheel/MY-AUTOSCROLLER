/**
 * @file background.js
 * @description Background service worker for FlowStream Extension.
 * Handles state initialization and lifecycle hooks inside Chrome.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  ytShorts: true,
  igReels: true,
  xVideo: true,
  threshold: 98, // Percentage completion to scroll (e.g. 98%)
  playbackSpeed: 1.0, // Default playback rate
  pauseOnHover: true,
  pauseOnComments: true
};

// Initialize settings when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (result) => {
    const freshSettings = {};
    for (const key in DEFAULT_SETTINGS) {
      if (result[key] === undefined) {
        freshSettings[key] = DEFAULT_SETTINGS[key];
      }
    }
    if (Object.keys(freshSettings).length > 0) {
      chrome.storage.local.set(freshSettings, () => {
        console.log("FlowStream settings initialized:", freshSettings);
      });
    }
  });
});

// Optionally listen for message events from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    chrome.storage.local.get(null, (settings) => {
      sendResponse({ settings: { ...DEFAULT_SETTINGS, ...settings } });
    });
    return true; // Keep response channel open
  }
});
