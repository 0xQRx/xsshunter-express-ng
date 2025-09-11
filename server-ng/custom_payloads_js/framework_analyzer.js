// Name: Frontend Framework Analyzer
// Description: Detects and analyzes React, Vue, Angular and other frontend frameworks including version, dev mode status, and component structure

function analyzeFramework() {
  const frameworkData = {
    title: "Frontend Framework Analysis",
    data: {
      framework: null,
      version: null,
      devMode: null,
      components: [],
      globalState: {},
      routes: []
    }
  };
  
  // Detect React
  if (window.React || document.querySelector('[data-reactroot]')) {
    frameworkData.data.framework = 'React';
    frameworkData.data.version = window.React?.version;
    
    // Find React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      frameworkData.data.devMode = true;
      const reactFiber = document.querySelector('#root')?._reactRootContainer;
      if (reactFiber) {
        // Extract component tree (simplified)
        frameworkData.data.components = ['[React internals detected]'];
      }
    }
  }
  
  // Detect Vue
  if (window.Vue || document.querySelector('[data-v-]')) {
    frameworkData.data.framework = 'Vue';
    frameworkData.data.version = window.Vue?.version;
    
    // Check for Vue DevTools
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      frameworkData.data.devMode = true;
    }
    
    // Try to access Vue instances
    const vueApp = document.querySelector('#app')?.__vue__;
    if (vueApp) {
      frameworkData.data.globalState = {
        data: Object.keys(vueApp.$data || {}),
        computed: Object.keys(vueApp.$options.computed || {}),
        routes: vueApp.$router?.options?.routes?.map(r => r.path) || []
      };
    }
  }
  
  // Detect Angular
  if (window.ng || window.angular || document.querySelector('[ng-app]')) {
    frameworkData.data.framework = 'Angular';
    frameworkData.data.version = window.angular?.version?.full || 
                                 window.ng?.VERSION?.full;
  }
  
  addCustomData(frameworkData);
}
analyzeFramework();