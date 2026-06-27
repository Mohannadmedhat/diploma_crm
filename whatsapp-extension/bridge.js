// bridge.js - Runs on localhost (the CRM app)
console.log("[WA-Extension] Bridge script loaded on CRM page.");

// Notify the page (React app) that the extension is installed and active
// We do this by dispatching a custom event on the window object
function signalExtensionLoaded() {
  window.isWAExtensionInstalled = true;
  window.dispatchEvent(new CustomEvent("WA_EXTENSION_LOADED"));
  console.log("[WA-Extension] Dispatched WA_EXTENSION_LOADED to page.");
}

// Run immediately - document_idle means DOM is ready
signalExtensionLoaded();

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[WA-Extension] Bridge received message:", message);

  if (message.action === "wa_sent_success") {
    console.log("[WA-Extension] Forwarding WA_SENT_SUCCESS event to React app...");
    window.dispatchEvent(new CustomEvent("WA_SENT_SUCCESS"));
    sendResponse({ ok: true });
  }
});
