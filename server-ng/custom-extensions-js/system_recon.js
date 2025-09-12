// Name: Complete System Reconnaissance
// Description: Performs comprehensive system fingerprinting including browser info, hardware details, security configuration, and DOM statistics

(function() {
  // System fingerprint
  addCustomData({
    title: "System Fingerprint",
    data: {
      browser: {
        vendor: navigator.vendor,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        plugins: Array.from(navigator.plugins).map(p => p.name)
      },
      hardware: {
        cores: navigator.hardwareConcurrency,
        memory: navigator.deviceMemory,
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
          pixelRatio: window.devicePixelRatio
        }
      },
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    }
  });
  
  // Security headers and policies
  addCustomData({
    title: "Security Configuration",
    data: {
      protocols: {
        https: location.protocol === 'https:',
        hostname: location.hostname,
        port: location.port || 'default'
      },
      headers: {
        csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,
        xframe: document.querySelector('meta[http-equiv="X-Frame-Options"]')?.content
      },
      cookies: {
        count: document.cookie.split(';').length,
        httpOnly: document.cookie.includes('HttpOnly'),
        secure: document.cookie.includes('Secure'),
        sameSite: document.cookie.includes('SameSite')
      }
    }
  });
  
  // Quick DOM statistics
  addCustomData({
    title: "DOM Statistics",
    data: {
      elements: document.querySelectorAll('*').length,
      forms: document.forms.length,
      inputs: document.querySelectorAll('input').length,
      scripts: {
        total: document.scripts.length,
        inline: Array.from(document.scripts).filter(s => !s.src).length,
        external: Array.from(document.scripts).filter(s => s.src).length,
        domains: [...new Set(Array.from(document.scripts)
          .filter(s => s.src)
          .map(s => new URL(s.src).hostname))]
      },
      iframes: document.querySelectorAll('iframe').length,
      links: {
        total: document.links.length,
        external: Array.from(document.links)
          .filter(a => a.hostname !== location.hostname).length
      }
    }
  });
})();