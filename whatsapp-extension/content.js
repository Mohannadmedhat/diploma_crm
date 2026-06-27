// content.js - Runs on web.whatsapp.com
console.log("[WA-Extension] Content script loaded on WhatsApp Web.");

let automationTriggered = false;
let attempts = 0;
const MAX_ATTEMPTS = 150; // 75 seconds max (150 x 500ms)

// Main loop - runs every 500ms
const mainLoop = setInterval(() => {
  attempts++;

  // Check if we should be in automation mode
  // The URL will contain automate=1 when first opened, even if WhatsApp later changes it
  if (!automationTriggered) {
    const url = window.location.href;
    if (url.includes("automate=1")) {
      automationTriggered = true;
      console.log("[WA-Extension] Automation mode ACTIVATED. URL:", url);
    }
  }

  if (!automationTriggered) {
    if (attempts >= MAX_ATTEMPTS) {
      clearInterval(mainLoop);
      console.log("[WA-Extension] Timed out waiting for automate flag in URL.");
    }
    return;
  }

  // --- AUTOMATION MODE ---

  // Check for "invalid phone number" dialog
  const bodyText = document.body ? document.body.innerText : "";
  const invalidPhrases = [
    "isn't on WhatsApp",
    "Phone number shared via link is invalid",
    "رقم الهاتف غير صالح",
    "رقم غير مسجل",
    "The phone number shared via link is invalid",
  ];
  for (const phrase of invalidPhrases) {
    if (bodyText.includes(phrase)) {
      console.log("[WA-Extension] Invalid phone detected. Closing tab...");
      clearInterval(mainLoop);
      notifyDone();
      return;
    }
  }

  // Try to find the send button - WhatsApp Web uses multiple selectors across versions
  const sendButton = findSendButton();

  if (sendButton) {
    // Make sure it's not disabled
    if (isButtonDisabled(sendButton)) {
      console.log("[WA-Extension] Send button found but disabled. Waiting...");
      return;
    }

    console.log("[WA-Extension] Send button found and enabled! Clicking...");
    clearInterval(mainLoop);

    // Small delay to ensure message text is fully loaded in the input box
    setTimeout(() => {
      sendButton.click();
      console.log("[WA-Extension] Message sent! Waiting 3s before closing...");

      // Wait for the message to actually transmit, then close
      setTimeout(() => {
        notifyDone();
      }, 3000);
    }, 800);

    return;
  }

  // Timeout fallback
  if (attempts >= MAX_ATTEMPTS) {
    console.log("[WA-Extension] TIMEOUT. Closing tab without confirmed send.");
    clearInterval(mainLoop);
    notifyDone();
  }

}, 500);

function findSendButton() {
  // Try many possible selectors - WhatsApp updates their DOM frequently
  const selectors = [
    'button[data-tab="11"]',
    'button[data-testid="compose-btn-send"]',
    'button[aria-label="Send"]',
    'button[aria-label="إرسال"]',
    'span[data-icon="send"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      // If it's a span, get the parent button
      return el.tagName === "BUTTON" ? el : el.closest("button") || el.parentElement;
    }
  }
  return null;
}

function isButtonDisabled(btn) {
  return (
    btn.disabled === true ||
    btn.hasAttribute("disabled") ||
    btn.getAttribute("aria-disabled") === "true"
  );
}

function notifyDone() {
  console.log("[WA-Extension] Sending automation_done signal to background...");
  chrome.runtime.sendMessage({ action: "wa_automation_done" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("[WA-Extension] Error sending message:", chrome.runtime.lastError.message);
    } else {
      console.log("[WA-Extension] Background acknowledged:", response);
    }
  });
}
