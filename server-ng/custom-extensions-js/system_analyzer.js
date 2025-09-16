// Name: System & Framework Analyzer
// Description: Comprehensive system fingerprinting, browser analysis, and framework detection including React, Vue, Angular, and other frontend technologies

(function() {
  const analysis = {
    frameworks: {},
    browser: {},
    hardware: {},
    security: {},
    performance: {},
    dom: {}
  };

  // === Framework Detection ===
  function detectFrameworks() {
    // React Detection
    if (window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector('[data-reactroot], [data-reactid]')) {
      analysis.frameworks.react = {
        detected: true,
        version: window.React?.version || 'unknown',
        devMode: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
        fiber: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers,
        components: []
      };

      // Try to find React components
      try {
        const reactRoot = document.querySelector('#root, #app, [data-reactroot]');
        if (reactRoot && reactRoot._reactRootContainer) {
          analysis.frameworks.react.rootElement = reactRoot.id || reactRoot.className;
        }

        // Check for Next.js
        if (window.__NEXT_DATA__) {
          analysis.frameworks.nextjs = {
            detected: true,
            buildId: window.__NEXT_DATA__.buildId,
            page: window.__NEXT_DATA__.page,
            props: Object.keys(window.__NEXT_DATA__.props || {})
          };
        }
      } catch (e) {}
    }

    // Vue Detection
    if (window.Vue || window.__VUE__ || document.querySelector('[data-v-]')) {
      analysis.frameworks.vue = {
        detected: true,
        version: window.Vue?.version || (window.__VUE__ ? '3.x' : 'unknown'),
        devMode: window.__VUE_DEVTOOLS_GLOBAL_HOOK__ !== undefined,
        apps: []
      };

      // Vue 3 app detection
      try {
        if (window.__VUE__) {
          document.querySelectorAll('[data-v-]').forEach(el => {
            if (el.__vueParentComponent) {
              analysis.frameworks.vue.apps.push({
                element: el.id || el.className || 'anonymous',
                hasRouter: !!el.__vueParentComponent.appContext.config.globalProperties.$router
              });
            }
          });
        }

        // Nuxt detection
        if (window.$nuxt || window.__NUXT__) {
          analysis.frameworks.nuxt = {
            detected: true,
            version: window.$nuxt?.nuxt?.version || 'unknown',
            target: window.__NUXT__?.target,
            ssr: window.__NUXT__?.serverRendered
          };
        }
      } catch (e) {}
    }

    // Angular Detection
    if (window.ng || window.angular || document.querySelector('[ng-app], [data-ng-app], [ng-controller]')) {
      analysis.frameworks.angular = {
        detected: true,
        version: window.angular?.version?.full || window.ng?.VERSION?.full || 'unknown',
        isAngularJS: !!window.angular && !window.ng,
        modules: []
      };

      try {
        if (window.angular?.module) {
          analysis.frameworks.angular.type = 'AngularJS';
        } else if (window.ng?.getComponent) {
          analysis.frameworks.angular.type = 'Angular 2+';
        }

        // Check for Angular Universal
        if (window.ngDevMode !== undefined) {
          analysis.frameworks.angular.devMode = window.ngDevMode;
        }
      } catch (e) {}
    }

    // jQuery Detection
    if (window.jQuery || window.$) {
      analysis.frameworks.jquery = {
        detected: true,
        version: window.jQuery?.fn?.jquery || 'unknown',
        plugins: []
      };

      // Detect common jQuery plugins
      if (window.jQuery) {
        ['ui', 'mobile', 'validator', 'datepicker'].forEach(plugin => {
          if (window.jQuery[plugin] || window.jQuery.fn[plugin]) {
            analysis.frameworks.jquery.plugins.push(plugin);
          }
        });
      }
    }

    // Other Framework Detection
    const frameworkChecks = {
      ember: window.Ember,
      backbone: window.Backbone,
      knockout: window.ko,
      polymer: window.Polymer,
      aurelia: window.aurelia,
      svelte: window.__svelte,
      alpine: window.Alpine,
      stimulus: window.Stimulus,
      meteor: window.Meteor,
      express: window.__express,
      wordpress: document.querySelector('meta[name="generator"][content*="WordPress"]'),
      drupal: window.Drupal,
      joomla: window.Joomla
    };

    for (const [name, check] of Object.entries(frameworkChecks)) {
      if (check) {
        analysis.frameworks[name] = {
          detected: true,
          version: typeof check === 'object' ? check.version || check.VERSION || 'detected' : 'detected'
        };
      }
    }

    // Build tools and bundlers
    if (window.webpackJsonp || window.webpackChunk || window.__webpack_require__) {
      analysis.frameworks.webpack = { detected: true };
    }
    if (window.parcelRequire) {
      analysis.frameworks.parcel = { detected: true };
    }
    if (window.__vite_is_modern_browser) {
      analysis.frameworks.vite = { detected: true };
    }
  }

  // === Browser & System Information ===
  function analyzeBrowser() {
    const nav = navigator;
    const screen = window.screen;

    // Basic browser info
    analysis.browser = {
      userAgent: nav.userAgent,
      platform: nav.platform,
      language: nav.language,
      languages: nav.languages || [],
      cookieEnabled: nav.cookieEnabled,
      onLine: nav.onLine,
      doNotTrack: nav.doNotTrack,
      vendor: nav.vendor,
      appName: nav.appName,
      appVersion: nav.appVersion,
      product: nav.product
    };

    // Hardware and device info
    analysis.hardware = {
      cores: nav.hardwareConcurrency || 'unknown',
      memory: nav.deviceMemory || 'unknown',
      maxTouchPoints: nav.maxTouchPoints || 0,
      screenResolution: screen.width + 'x' + screen.height,
      availableScreenSize: screen.availWidth + 'x' + screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation?.type || 'unknown'
    };

    // Connection info
    if (nav.connection) {
      analysis.hardware.connection = {
        type: nav.connection.effectiveType,
        downlink: nav.connection.downlink,
        rtt: nav.connection.rtt,
        saveData: nav.connection.saveData
      };
    }

    // Battery info
    if (nav.getBattery) {
      nav.getBattery().then(battery => {
        analysis.hardware.battery = {
          level: battery.level,
          charging: battery.charging
        };
      }).catch(() => {});
    }

    // Media capabilities
    analysis.browser.media = {
      webRTC: !!(nav.mediaDevices && nav.mediaDevices.getUserMedia),
      midi: !!nav.requestMIDIAccess,
      gamepad: !!nav.getGamepads,
      vibrate: !!nav.vibrate,
      bluetooth: !!nav.bluetooth,
      usb: !!nav.usb
    };

    // Storage estimates
    if (nav.storage && nav.storage.estimate) {
      nav.storage.estimate().then(estimate => {
        analysis.browser.storage = {
          quota: estimate.quota,
          usage: estimate.usage,
          persisted: nav.storage.persisted ? nav.storage.persisted() : false
        };
      }).catch(() => {});
    }
  }

  // === Security Configuration ===
  function analyzeSecuritySetup() {
    // Permissions API
    analysis.security.permissions = {};
    const permissionsToCheck = ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write'];

    if (nav.permissions && nav.permissions.query) {
      permissionsToCheck.forEach(permission => {
        nav.permissions.query({ name: permission }).then(result => {
          analysis.security.permissions[permission] = result.state;
        }).catch(() => {
          analysis.security.permissions[permission] = 'denied';
        });
      });
    }

    // CSP Detection
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      analysis.security.csp = cspMeta.content.substring(0, 200);
    }

    // Security headers and features
    analysis.security.features = {
      https: location.protocol === 'https:',
      serviceWorker: 'serviceWorker' in navigator,
      secureContext: window.isSecureContext,
      crossOriginIsolated: window.crossOriginIsolated || false,
      credentialManagement: !!navigator.credentials,
      webAuthn: !!navigator.credentials?.create
    };

    // Check for common security headers via fetch
    try {
      fetch(location.origin, { method: 'HEAD' }).then(response => {
        analysis.security.headers = {
          xFrameOptions: response.headers.get('X-Frame-Options'),
          xContentType: response.headers.get('X-Content-Type-Options'),
          xXssProtection: response.headers.get('X-XSS-Protection'),
          strictTransport: response.headers.get('Strict-Transport-Security')
        };
      }).catch(() => {});
    } catch (e) {}
  }

  // === Performance Metrics ===
  function analyzePerformance() {
    const perf = window.performance;

    if (perf) {
      // Navigation timing
      const timing = perf.timing;
      if (timing) {
        analysis.performance.timing = {
          pageLoadTime: timing.loadEventEnd - timing.fetchStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.fetchStart,
          dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
          tcpConnection: timing.connectEnd - timing.connectStart,
          serverResponse: timing.responseEnd - timing.requestStart,
          domProcessing: timing.domComplete - timing.domLoading
        };
      }

      // Memory usage
      if (perf.memory) {
        analysis.performance.memory = {
          usedJSHeap: Math.round(perf.memory.usedJSHeapSize / 1048576) + ' MB',
          totalJSHeap: Math.round(perf.memory.totalJSHeapSize / 1048576) + ' MB',
          limit: Math.round(perf.memory.jsHeapSizeLimit / 1048576) + ' MB'
        };
      }

      // Resource timing summary
      const resources = perf.getEntriesByType('resource');
      if (resources.length > 0) {
        const resourceTypes = {};
        resources.forEach(resource => {
          const type = resource.initiatorType;
          if (!resourceTypes[type]) {
            resourceTypes[type] = { count: 0, totalSize: 0, totalDuration: 0 };
          }
          resourceTypes[type].count++;
          resourceTypes[type].totalDuration += resource.duration;
          resourceTypes[type].totalSize += resource.transferSize || 0;
        });
        analysis.performance.resources = resourceTypes;
      }
    }
  }

  // === DOM Analysis ===
  function analyzeDOMStructure() {
    analysis.dom = {
      totalElements: document.getElementsByTagName('*').length,
      forms: document.forms.length,
      images: document.images.length,
      links: document.links.length,
      scripts: document.scripts.length,
      stylesheets: document.styleSheets.length,
      iframes: document.getElementsByTagName('iframe').length,
      videos: document.getElementsByTagName('video').length,
      audios: document.getElementsByTagName('audio').length,
      canvas: document.getElementsByTagName('canvas').length,
      webComponents: document.querySelectorAll('*').length - document.querySelectorAll('*:not(:defined)').length
    };

    // Form analysis
    if (document.forms.length > 0) {
      analysis.dom.formDetails = [];
      Array.from(document.forms).forEach((form, index) => {
        analysis.dom.formDetails.push({
          index: index,
          id: form.id,
          action: form.action,
          method: form.method,
          inputs: form.elements.length
        });
      });
    }

    // Check for shadow DOM
    analysis.dom.hasShadowDOM = !!document.querySelector('*').shadowRoot;

    // Check for web components
    analysis.dom.customElements = [];
    document.querySelectorAll(':not(:defined)').forEach(el => {
      const tagName = el.tagName.toLowerCase();
      if (!analysis.dom.customElements.includes(tagName)) {
        analysis.dom.customElements.push(tagName);
      }
    });
  }

  // === Execute all analysis ===
  try {
    detectFrameworks();
    analyzeBrowser();
    analyzeSecuritySetup();
    analyzePerformance();
    analyzeDOMStructure();

    // Create summary
    const summary = {
      mainFramework: Object.keys(analysis.frameworks).find(f => analysis.frameworks[f].detected) || 'none',
      totalFrameworks: Object.keys(analysis.frameworks).filter(f => analysis.frameworks[f].detected).length,
      isSecure: location.protocol === 'https:',
      browserEngine: navigator.userAgent.includes('Chrome') ? 'Chromium' :
                     navigator.userAgent.includes('Firefox') ? 'Gecko' :
                     navigator.userAgent.includes('Safari') ? 'WebKit' : 'Unknown',
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      timestamp: new Date().toISOString()
    };

    window.addCustomData({
      title: "System & Framework Analysis",
      data: {
        summary: summary,
        frameworks: analysis.frameworks,
        browser: analysis.browser,
        hardware: analysis.hardware,
        security: analysis.security,
        performance: analysis.performance,
        dom: analysis.dom
      }
    });

  } catch (err) {
    window.addCustomData({
      title: "System Analysis Error",
      data: {
        error: err.message,
        partialData: analysis
      }
    });
  }
})();