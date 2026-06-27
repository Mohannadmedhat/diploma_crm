// content.js - Runs on web.whatsapp.com at document_start
// CRITICAL: Capture the URL IMMEDIATELY at document_start before WhatsApp's JS router strips the params

const INITIAL_URL = window.location.href;
const IS_AUTOMATION_TAB = INITIAL_URL.includes("automate=1");

console.log("[WA-Extension] content.js loaded. URL:", INITIAL_URL);
console.log("[WA-Extension] Is automation tab:", IS_AUTOMATION_TAB);

if (!IS_AUTOMATION_TAB) {
  // Not an automation tab - do nothing
  console.log("[WA-Extension] Not an automation tab. Exiting.");
} else {
  console.log("[WA-Extension] AUTOMATION MODE ACTIVE. Waiting for DOM and send button...");

  let attempts = 0;
  const MAX_ATTEMPTS = 180; // 90 seconds max (180 x 500ms)
  let sendTriggered = false;

  const mainLoop = setInterval(() => {
    if (sendTriggered) {
      clearInterval(mainLoop);
      return;
    }

    attempts++;

    // Wait for document.body to exist (might not at document_start)
    if (!document.body) {
      return;
    }

    // Check for invalid phone number dialog
    const bodyText = document.body.innerText || "";
    const invalidPhrases = [
      "isn't on WhatsApp",
      "Phone number shared via link is invalid",
      "The phone number shared via link is invalid",
      "رقم الهاتف غير صالح",
      "رقم غير مسجل",
    ];
    for (const phrase of invalidPhrases) {
      if (bodyText.includes(phrase)) {
        console.log("[WA-Extension] Invalid phone detected. Closing tab...");
        sendTriggered = true;
        clearInterval(mainLoop);
        notifyDone();
        return;
      }
    }

    // Try to find the send button
    const sendButton = findEnabledSendButton();

    if (sendButton) {
      console.log("[WA-Extension] Enabled send button found after", attempts * 0.5, "s! Clicking...");
      sendTriggered = true;
      clearInterval(mainLoop);

      // Small extra delay to ensure message text is fully populated
      setTimeout(() => {
        sendButton.click();
        console.log("[WA-Extension] Click sent!");

        // Wait for message to transmit, then notify and close
        setTimeout(() => {
          console.log("[WA-Extension] Notifying done...");
          notifyDone();
        }, 3000);
      }, 600);

      return;
    }

    // Timeout
    if (attempts >= MAX_ATTEMPTS) {
      console.log("[WA-Extension] TIMEOUT after 90 seconds. Closing tab anyway.");
      clearInterval(mainLoop);
      notifyDone();
    }

  }, 500);
}

function findEnabledSendButton() {
  const selectors = [
    'button[data-tab="11"]',
    'button[data-testid="compose-btn-send"]',
    'button[aria-label="Send"]',
    'button[aria-label="إرسال"]',
    'span[data-icon="send"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;

    const btn = el.tagName === "BUTTON" ? el : (el.closest("button") || el.parentElement);
    if (!btn) continue;

    // Make sure it's not disabled
    if (
      btn.disabled ||
      btn.hasAttribute("disabled") ||
      btn.getAttribute("aria-disabled") === "true"
    ) {
      continue;
    }

    return btn;
  }

  return null;
}

function notifyDone() {
  chrome.runtime.sendMessage({ action: "wa_automation_done" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("[WA-Extension] Error:", chrome.runtime.lastError.message);
    } else {
      console.log("[WA-Extension] Background acknowledged:", response);
    }
  });
}
