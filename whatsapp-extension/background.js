// background.js - Service Worker
console.log("[WA-Extension] Background service worker started.");

// Store opener tab mapping: when a new tab is created, record who opened it
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.openerTabId) {
    console.log("[WA-Extension] New tab:", tab.id, "opened by:", tab.openerTabId);
    chrome.storage.session.set({ [`opener_${tab.id}`]: tab.openerTabId });
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "wa_automation_done") {
    const waTabId = sender.tab?.id;
    console.log("[WA-Extension] Automation done from tab:", waTabId);

    if (!waTabId) {
      sendResponse({ ok: false });
      return;
    }

    // Look up which CRM tab opened this WhatsApp tab
    chrome.storage.session.get(`opener_${waTabId}`, (result) => {
      const crmTabId = result[`opener_${waTabId}`];
      console.log("[WA-Extension] Stored CRM tab ID:", crmTabId);

      // Close the WhatsApp tab first
      chrome.tabs.remove(waTabId, () => {
        if (chrome.runtime.lastError) {
          console.warn("[WA-Extension] Could not close tab:", chrome.runtime.lastError.message);
        } else {
          console.log("[WA-Extension] WhatsApp tab closed.");
        }

        // Try to notify the stored opener tab first
        if (crmTabId) {
          chrome.tabs.sendMessage(crmTabId, { action: "wa_sent_success" }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn("[WA-Extension] Could not notify stored CRM tab:", chrome.runtime.lastError.message);
              // Fallback: search all CRM tabs
              notifyCRMTab();
            } else {
              console.log("[WA-Extension] Notified stored CRM tab successfully.");
            }
          });
        } else {
          // No stored opener (COOP severed the reference) - search all CRM tabs
          console.log("[WA-Extension] No stored opener. Searching all CRM tabs...");
          notifyCRMTab();
        }

        // Cleanup
        chrome.storage.session.remove(`opener_${waTabId}`);
      });
    });

    sendResponse({ ok: true });
    return true;
  }
});

// Search for any open CRM tab (localhost OR Vercel) and notify it
function notifyCRMTab() {
  // Search across all possible CRM URLs
  const crmPatterns = [
    "http://localhost/*",
    "http://127.0.0.1/*",
    "https://diploma-crm.vercel.app/*"
  ];

  chrome.tabs.query({}, (allTabs) => {
    const crmTabs = allTabs.filter(tab => {
      const url = tab.url || "";
      return (
        url.startsWith("http://localhost") ||
        url.startsWith("http://127.0.0.1") ||
        url.startsWith("https://diploma-crm.vercel.app")
      );
    });

    console.log("[WA-Extension] Found CRM tabs:", crmTabs.map(t => t.url));

    if (crmTabs.length === 0) {
      console.warn("[WA-Extension] No CRM tabs found!");
      return;
    }

    crmTabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: "wa_sent_success" }, () => {
        if (chrome.runtime.lastError) {
          console.warn("[WA-Extension] Could not send to tab", tab.id, ":", chrome.runtime.lastError.message);
        } else {
          console.log("[WA-Extension] Successfully notified CRM tab:", tab.url);
        }
      });
    });
  });
}
