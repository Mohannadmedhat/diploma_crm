// bridge.js - Runs on the CRM app page
// Uses window.postMessage for cross-world communication (CSP-safe, no script injection needed)

console.log("[WA-Extension] Bridge content script loaded.");

// postMessage works across Chrome extension isolation boundary → page can receive it
function signalExtensionPresence() {
  window.postMessage({ type: "WA_EXTENSION_LOADED" }, "*");
  console.log("[WA-Extension] Posted WA_EXTENSION_LOADED via postMessage.");
}

// Signal immediately
signalExtensionPresence();

// Re-signal every 1 second for 20 seconds to handle late React SPA mounts
let retryCount = 0;
const retryInterval = setInterval(() => {
  retryCount++;
  signalExtensionPresence();
  if (retryCount >= 20) {
    clearInterval(retryInterval);
  }
}, 1000);

// Forward messages from background → page via postMessage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[WA-Extension] Bridge got message from background:", message);

  if (message.action === "wa_sent_success") {
    console.log("[WA-Extension] Posting WA_SENT_SUCCESS to page...");
    window.postMessage({ type: "WA_SENT_SUCCESS" }, "*");
    sendResponse({ ok: true });
  }
});
