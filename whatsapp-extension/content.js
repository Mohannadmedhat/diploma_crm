console.log("[WhatsApp Automation Extension] Active and monitoring...");

// Run immediately to capture the automation flag before WhatsApp Web strips it from the URL
const hasAutomateParam = window.location.href.includes("automate=1");
if (hasAutomateParam) {
  sessionStorage.setItem("wa_automate_active", "true");
  console.log("[WhatsApp Automation Extension] Flag saved to sessionStorage.");
}

// Start checking for the send button if the flag is active
if (sessionStorage.getItem("wa_automate_active") === "true") {
  console.log("[WhatsApp Automation Extension] Automation is ACTIVE. Searching for send button...");
  
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds timeout (WhatsApp Web can take time to load)
  
  const interval = setInterval(() => {
    attempts++;
    
    // Check if there is an error popup (like "Phone number shared via link is invalid")
    const pageText = document.body?.innerText || "";
    if (
      pageText.includes("رقم الهاتف غير صالح") || 
      pageText.includes("Phone number is invalid") || 
      pageText.includes("أدخل رقم هاتف صالح") || 
      pageText.includes("رقم الهاتف غير مسجل") ||
      pageText.includes("isn't on WhatsApp")
    ) {
      console.log("[WhatsApp Automation Extension] Invalid phone number popup detected. Closing tab...");
      clearInterval(interval);
      sessionStorage.removeItem("wa_automate_active");
      setTimeout(() => {
        window.close();
      }, 1000);
      return;
    }
    
    // Find the WhatsApp Web Send button
    const sendButton = document.querySelector('button span[data-icon="send"]')?.parentElement || 
                       document.querySelector('span[data-icon="send"]')?.parentElement || 
                       document.querySelector('button[data-testid="compose-btn-send"]') ||
                       document.querySelector('button[aria-label="Send"]') ||
                       document.querySelector('button[data-tab="11"]');
                       
    if (sendButton) {
      console.log("[WhatsApp Automation Extension] Send button found! Clicking in 1 second...");
      clearInterval(interval);
      
      setTimeout(() => {
        sendButton.click();
        console.log("[WhatsApp Automation Extension] Clicked!");
        
        // Wait 3.5 seconds to ensure the message is sent over WebSocket, then close the tab
        setTimeout(() => {
          sessionStorage.removeItem("wa_automate_active");
          console.log("[WhatsApp Automation Extension] Done. Closing tab...");
          window.close();
        }, 3500);
      }, 1000);
      
    } else if (attempts >= maxAttempts) {
      console.log("[WhatsApp Automation Extension] Timeout waiting for send button.");
      sessionStorage.removeItem("wa_automate_active");
      clearInterval(interval);
    }
  }, 1000);
}
