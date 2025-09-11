// Name: API Endpoint Discovery
// Description: Discovers API endpoints, GraphQL endpoints, WebSocket connections, and potential API keys from scripts, window objects, and network traffic

function discoverAPIs() {
  const discovered = {
    endpoints: new Set(),
    graphqlEndpoints: new Set(),
    websockets: new Set(),
    apiKeys: new Set()
  };
  
  // 1. Parse inline scripts for API calls
  Array.from(document.scripts).forEach(script => {
    if (script.innerHTML) {
      // API endpoints
      const apiPattern = /["'](\/api\/[^"']+|https?:\/\/[^"']*api[^"']*\/[^"']+)["']/gi;
      (script.innerHTML.match(apiPattern) || []).forEach(match => {
        discovered.endpoints.add(match.slice(1, -1));
      });
      
      // GraphQL endpoints
      const gqlPattern = /["'](\/graphql|\/gql|[^"']*graphql[^"']*)["']/gi;
      (script.innerHTML.match(gqlPattern) || []).forEach(match => {
        discovered.graphqlEndpoints.add(match.slice(1, -1));
      });
      
      // WebSocket URLs
      const wsPattern = /["'](wss?:\/\/[^"']+)["']/gi;
      (script.innerHTML.match(wsPattern) || []).forEach(match => {
        discovered.websockets.add(match.slice(1, -1));
      });
      
      // API Keys (common patterns)
      const keyPattern = /["']([A-Za-z0-9]{32,}|sk_[a-zA-Z0-9]{32,}|pk_[a-zA-Z0-9]{32,})["']/g;
      (script.innerHTML.match(keyPattern) || []).forEach(match => {
        discovered.apiKeys.add(match.slice(1, -1));
      });
    }
  });
  
  // 2. Check window object for API configurations
  const checkWindowKeys = ['API_URL', 'API_BASE', 'GRAPHQL_ENDPOINT', 'WS_URL'];
  checkWindowKeys.forEach(key => {
    if (window[key]) discovered.endpoints.add(window[key]);
    if (window.config && window.config[key]) discovered.endpoints.add(window.config[key]);
    if (window.env && window.env[key]) discovered.endpoints.add(window.env[key]);
  });
  
  // 3. Intercept XHR/Fetch to discover runtime endpoints
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (url.includes('api')) discovered.endpoints.add(url);
    return originalOpen.apply(this, arguments);
  };
  
  addCustomData({
    title: "API Discovery Results",
    data: {
      endpoints: Array.from(discovered.endpoints),
      graphql: Array.from(discovered.graphqlEndpoints),
      websockets: Array.from(discovered.websockets),
      possibleApiKeys: Array.from(discovered.apiKeys).map(k => k.substring(0, 10) + '...')
    }
  });
}
discoverAPIs();