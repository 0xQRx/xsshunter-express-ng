// Name: User Interaction Logger
// Description: Tracks user clicks, form inputs, and interactions for session replay analysis. Sends data after collecting multiple events.

(function() {
  try {
    const interactions = {
      clicks: [],
      inputs: [],
      formData: []
    };
    
    // Capture existing form values
    document.querySelectorAll('input, textarea, select').forEach(function(el) {
      if (el.value) {
        interactions.formData.push({
          tag: el.tagName,
          name: el.name || el.id || 'unnamed',
          type: el.type || 'text',
          hasValue: true
        });
      }
    });
    
    // Log clicks with error handling
    document.addEventListener('click', function(e) {
      try {
        interactions.clicks.push({
          target: e.target.tagName || 'unknown',
          id: e.target.id || '',
          className: e.target.className || '',
          text: (e.target.innerText || '').substring(0, 30),
          timestamp: Date.now()
        });
        
        // Send after 5 clicks (reduced from 10 for easier testing)
        if (interactions.clicks.length >= 5) {
          window.addCustomData({
            title: "User Click Interactions",
            data: {
              clicks: interactions.clicks.slice(0, 5)
            }
          });
          interactions.clicks = [];
        }
      } catch (err) {
        console.log('Click tracking error:', err);
      }
    }, true);
    
    // Send initial data immediately
    if (interactions.formData.length > 0) {
      window.addCustomData({
        title: "Form Fields Found",
        data: {
          formCount: document.forms.length,
          fields: interactions.formData
        }
      });
    }
    
    // Also send a summary after a short delay
    setTimeout(function() {
      window.addCustomData({
        title: "Page Interaction Summary",
        data: {
          clicksRecorded: interactions.clicks.length,
          formsFound: document.forms.length,
          inputsFound: document.querySelectorAll('input').length,
          timestamp: new Date().toISOString()
        }
      });
    }, 1000);
    
  } catch (error) {
    // If anything fails, at least try to report the error
    window.addCustomData({
      title: "Interaction Logger Error",
      data: {
        error: error.toString(),
        message: "Failed to set up interaction logging"
      }
    });
  }
})();