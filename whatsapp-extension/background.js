// background.js - Service Worker
console.log("[WA-Extension] Background service worker started.");

// Store opener tab mapping: when a new tab is created, record who opened it
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.openerTabId) {
    console.log("[WA-Extension] New tab:", tab.id, "opened by:", tab.openerTabId);
    chrome.storage.session.set({ [`opener_${tab.id}`]: tab.openerTabId });
  }
});

// Setup background alarms for checking scheduled messages
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("check_schedules", { periodInMinutes: 0.5 });
  console.log("[WA-Extension] Registered check_schedules alarm.");
});

// Startup safety check to ensure alarm is created when service worker wakes up
chrome.alarms.get("check_schedules", (alarm) => {
  if (!alarm) {
    chrome.alarms.create("check_schedules", { periodInMinutes: 0.5 });
    console.log("[WA-Extension] Alarm created on startup.");
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "check_schedules") {
    checkDueSchedules();
  }
});

function checkDueSchedules() {
  chrome.storage.local.get(["scheduledMessages", "lastNotifiedScheduleId"], (result) => {
    const schedules = result.scheduledMessages || [];
    const lastNotified = result.lastNotifiedScheduleId || "";
    const now = new Date();
    
    const due = schedules.find(s => {
      if (s.status !== 'pending') return false;
      const scheduledTime = new Date(s.scheduledAt);
      const diffMs = now.getTime() - scheduledTime.getTime();
      return diffMs >= 0 && diffMs < 30 * 60 * 1000 && s.id !== lastNotified;
    });

    if (due) {
      console.log("[WA-Extension] Due schedule found, showing notification for:", due.id);
      chrome.notifications.create(due.id, {
        type: "basic",
        iconUrl: "logo.png",
        title: "سيد | SAYED CRM ⏰",
        message: `حان موعد إرسال الرسائل المجدولة لدبلوم "${due.diplomaName}". يرجى فتح لوحة التحكم للبدء.`,
        priority: 2
      });
      chrome.storage.local.set({ lastNotifiedScheduleId: due.id });
    }
  });
}

// ============================================================
// SMART NOTIFICATION HELPERS — called from CRM via message
// ============================================================

/** Show a browser notification for smart scenarios */
function showSmartNotification(type, title, message, notifId) {
  chrome.notifications.create(notifId || `smart_${Date.now()}`, {
    type: "basic",
    iconUrl: "logo.png",
    title: title,
    message: message,
    priority: 2
  });
}


// When clicking the notification, open/focus CRM tab
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.query({}, (allTabs) => {
    const crmTab = allTabs.find(tab => {
      const url = tab.url || "";
      return (
        url.includes("localhost") ||
        url.includes("127.0.0.1") ||
        url.includes("diploma-crm.vercel.app")
      );
    });

    if (crmTab) {
      chrome.tabs.update(crmTab.id, { active: true });
      if (crmTab.windowId) {
        chrome.windows.update(crmTab.windowId, { focused: true });
      }
    } else {
      // Default fallback link
      chrome.tabs.create({ url: "https://diploma-crm.vercel.app/" });
    }
  });
  
  chrome.notifications.clear(notificationId);
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

  // ---- Smart Notification: show a browser notification from CRM ----
  if (message.action === "show_smart_notification") {
    const { notifType, title, body } = message;
    console.log("[WA-Extension] Smart notification request:", notifType, title);
    showSmartNotification(notifType, title || "سيد | SAYED CRM", body || "", `smart_${notifType}_${Date.now()}`);
    sendResponse({ ok: true });
    return true;
  }

  // ---- Send complete summary notification ----
  if (message.action === "wa_send_complete") {
    const { totalSent, totalSkipped, diplomaName } = message;
    console.log("[WA-Extension] Send complete:", totalSent, "sent,", totalSkipped, "skipped");
    chrome.notifications.create(`complete_${Date.now()}`, {
      type: "basic",
      iconUrl: "logo.png",
      title: "✅ اكتمل الإرسال — سيد CRM",
      message: `تم إرسال ${totalSent} رسالة بنجاح${totalSkipped > 0 ? ` (تخطي ${totalSkipped})` : ''} لدبلوم "${diplomaName || 'الدبلومة'}".`,
      priority: 1
    });
    sendResponse({ ok: true });
    return true;
  }
});


// Search for any open CRM tab (localhost OR Vercel) and notify it
function notifyCRMTab() {
  chrome.tabs.query({}, (allTabs) => {
    const crmTabs = allTabs.filter(tab => {
      const url = tab.url || "";
      return (
        url.includes("localhost") ||
        url.includes("127.0.0.1") ||
        url.includes("diploma-crm.vercel.app")
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
