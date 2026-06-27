// background.js - Service Worker
console.log("[WA-Extension] Background service worker started.");

// When a WhatsApp tab is created from our CRM, store its ID mapped to the CRM tab ID
// We use chrome.storage.session to track: { waTabId -> crmTabId }

chrome.tabs.onCreated.addListener((tab) => {
  // When a new tab is created, if it has an opener, record the mapping
  if (tab.openerTabId) {
    console.log("[WA-Extension] New tab created:", tab.id, "opened by:", tab.openerTabId);
    chrome.storage.session.set({ [`opener_${tab.id}`]: tab.openerTabId });
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "wa_automation_done") {
    const waTabId = sender.tab?.id;
    console.log("[WA-Extension] Automation done signal from tab:", waTabId);
    
    if (!waTabId) {
      sendResponse({ ok: false });
      return;
    }

    // Look up which CRM tab opened this WhatsApp tab
    chrome.storage.session.get(`opener_${waTabId}`, (result) => {
      const crmTabId = result[`opener_${waTabId}`];
      console.log("[WA-Extension] CRM tab ID:", crmTabId);

      // Close the WhatsApp tab first
      chrome.tabs.remove(waTabId, () => {
        console.log("[WA-Extension] WhatsApp tab closed.");
        
        if (crmTabId) {
          // Notify the CRM tab
          chrome.tabs.sendMessage(crmTabId, { action: "wa_sent_success" }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn("[WA-Extension] Could not notify CRM tab:", chrome.runtime.lastError.message);
              // Fallback: find localhost tab and notify it
              notifyAnyLocalhostTab();
            } else {
              console.log("[WA-Extension] CRM tab notified successfully.");
            }
          });
        } else {
          // No stored opener - search for localhost tabs
          console.log("[WA-Extension] No stored opener. Searching for localhost tab...");
          notifyAnyLocalhostTab();
        }

        // Cleanup storage
        chrome.storage.session.remove(`opener_${waTabId}`);
      });
    });

    sendResponse({ ok: true });
    return true; // Keep message channel open for async
  }
});

function notifyAnyLocalhostTab() {
  chrome.tabs.query({ url: ["http://localhost/*", "http://127.0.0.1/*"] }, (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: "wa_sent_success" }, () => {
          if (chrome.runtime.lastError) {
            console.warn("[WA-Extension] Could not send to tab", tab.id, ":", chrome.runtime.lastError.message);
          } else {
            console.log("[WA-Extension] Notified localhost tab:", tab.id);
          }
        });
      });
    } else {
      console.warn("[WA-Extension] No localhost tabs found to notify.");
    }
  });
}
