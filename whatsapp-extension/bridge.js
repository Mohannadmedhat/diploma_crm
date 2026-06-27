// bridge.js - Runs on the CRM app page (localhost or diploma-crm.vercel.app)
// Content scripts run in an isolated JS world separate from the page's React code.
// To communicate with React, we must inject a <script> tag into the page's main world.

console.log("[WA-Extension] Bridge content script loaded.");

// --- Inject signal into the PAGE's main JS world ---
function injectIntoPageWorld(code) {
  try {
    const script = document.createElement("script");
    script.textContent = code;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (e) {
    console.error("[WA-Extension] Failed to inject script into page world:", e);
  }
}

// Signal the React app that the extension is present
function signalExtensionPresence() {
  injectIntoPageWorld(`
    window.isWAExtensionInstalled = true;
    window.dispatchEvent(new CustomEvent('WA_EXTENSION_LOADED'));
    console.log('[WA-Extension] Signal injected into page world.');
  `);
}

// Signal immediately
signalExtensionPresence();

// Also re-signal every 2 seconds for 30 seconds (handles SPA navigation / late React mount)
let retryCount = 0;
const retryInterval = setInterval(() => {
  retryCount++;
  signalExtensionPresence();
  if (retryCount >= 15) { // 15 x 2s = 30 seconds
    clearInterval(retryInterval);
  }
}, 2000);

// Listen for messages from the background service worker and forward to React
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[WA-Extension] Bridge received message from background:", message);

  if (message.action === "wa_sent_success") {
    console.log("[WA-Extension] Forwarding WA_SENT_SUCCESS to React app...");
    // Inject into page world so React's window.addEventListener can receive it
    injectIntoPageWorld(`
      window.dispatchEvent(new CustomEvent('WA_SENT_SUCCESS'));
      console.log('[WA-Extension] WA_SENT_SUCCESS dispatched to page world.');
    `);
    sendResponse({ ok: true });
  }
});
