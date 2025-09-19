# XSS Hunter Express NG (Next Generation)
## *Enhanced XSS Detection Platform with Custom Extension Support*

The next generation of XSS Hunter Express with powerful extension system, modern Vue 3 interface, and enhanced payload capabilities. Built upon the foundation of [XSS Hunter Express](https://github.com/mandatoryprogrammer/xsshunter-express) by mandatory (Matthew Bryant).

Repository: [https://github.com/0xQRx/xsshunter-express-ng](https://github.com/0xQRx/xsshunter-express-ng)

## 🚀 Key Enhancements

### Extension System (Major Feature)
- **Custom Extension Panel**: Add unlimited custom JavaScript extensions to enhance XSS probe functionality
- **Extension Management**: Enable/disable extensions on-the-fly through the admin panel
- **Pre-built Extensions**: Sample extensions for common tasks (keylogger, form grabber, network scanner)
- **Execution**: Extensions run within the victim's context for maximum data collection

### Modern Architecture
- **Vue 3 Frontend**: Complete UI rebuild with modern Vue 3.5+ and Composition API
- **Dual-Port Architecture**: Separation of payload collection (80/443) and admin panel (8443)
- **Node.js 22 Support**: Updated for latest Node.js with maintained backward compatibility
- **Discord Webhooks**: Real-time notifications to Discord channels

## 📋 Requirements

* Docker and docker-compose
* Host with at least 2 GB RAM
* Domain name with DNS control
* Ports 80, 443, and 8443 available

## 🔧 Quick Setup

### 1. Clone Repository
```bash
git clone https://github.com/0xQRx/xsshunter-express-ng.git
cd xsshunter-express-ng
```

### 2. Configure Settings
Edit `Docker/docker-compose.yml`:

```yaml
# Required
- HOSTNAME=your.domain.com
- SSL_CONTACT_EMAIL=your@email.com

# Optional - Email Notifications
- SMTP_EMAIL_NOTIFICATIONS_ENABLED=true
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=465
- SMTP_USERNAME=your@gmail.com
- SMTP_PASSWORD=your_app_password
- SMTP_FROM_EMAIL=your@gmail.com
- SMTP_RECEIVER_EMAIL=alerts@email.com

# Optional - Discord Notifications
- DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK
```

### 3. Start Services
```bash
cd Docker/
docker-compose up -d postgresdb
docker-compose up xsshunterexpress
```

### 4. Initialize SSL Certificate
**IMPORTANT**: After starting the service, navigate to:
```
https://your.domain.com
```
This triggers automatic SSL certificate generation via Let's Encrypt (takes ~15 seconds).

### 5. Access Admin Panel
The admin password is **randomly generated** and displayed in the console output. Look for:
```
Password: XXXXXXXXXXXXXX
```

Access admin panel at:
```
https://your.domain.com:8443/admin/
```

## 🔒 Security Configuration

### Port Configuration
- **Ports 80/443**: Public-facing for payload collection
- **Port 8443**: Admin panel - **MUST BE FIREWALLED**

### Firewall Rules (Required)
```bash
# Allow only your IP to access admin panel
iptables -A INPUT -p tcp --dport 8443 -s YOUR_IP -j ACCEPT
iptables -A INPUT -p tcp --dport 8443 -j DROP

# Or using ufw
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from YOUR_IP to any port 8443
```

## 🎯 Extension System

Extensions allow you to create custom JavaScript that collects additional data beyond the default XSS Hunter collection (cookies, localStorage, DOM, screenshot).

### API Functions

#### `window.addCustomData(dataObject)`
Adds custom data to the initial XSS payload fire report.

```javascript
{
  title: String,  // REQUIRED: Display name for this data
  data: Object    // REQUIRED: Any JSON-serializable data
}
```

#### `window.sendBackgroundData(dataObject)`
Sends additional data after the initial payload has fired (requires `window.xssPayloadId`).

```javascript
{
  title: String,  // REQUIRED: Display name for this data
  data: Object    // REQUIRED: Any JSON-serializable data
}
```

### Using Extensions

1. **Create Extension**: Write JavaScript code using the API functions
2. **Add to Payload Console**: Navigate to Extensions/Payload Console in admin panel
3. **Enable/Disable**: Toggle extensions on/off as needed
4. **Automatic Loading**: Enabled extensions are included in your probe automatically
5. **View Results**: Check "Custom Scripts Data" in the XSS report

### Example Extensions

#### Basic Data Collection
```javascript
// Collect user information with initial payload
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

#### Background Monitoring
```javascript
// Send updates after payload fires
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

### Pre-built Extensions

Located in `/server-ng/custom-extensions-js/`:

- **simple_custom_data.js**: Basic custom data example
- **simple_background_data.js**: Background monitoring example
- **data_harvester.js**: Advanced data extraction
- **continuous_monitor.js**: Real-time activity monitoring
- **system_analyzer.js**: System information gathering

### Requirements & Best Practices

**Requirements:**
- Both `title` and `data` fields are mandatory
- `title` must be a non-empty string
- `data` must be JSON-serializable

**Best Practices:**
- Keep extensions focused on specific goals
- Use try-catch blocks for error handling
- Test locally before deployment
- Truncate long strings to avoid excessive data
- Avoid infinite loops or memory leaks

## 🛠 Development

### Local Development Setup
```bash
# Quick start with development script
./run-dual-dev.sh
```

Access:
- Paylaod Server: http://localhost:3000
- Admin: https://localhost:8443

### Running Tests
```bash
cd tests
./run-all-tests.sh
```

## 📦 Project Structure

```
xsshunter-express-ng/
├── Docker/                # Docker configuration
├── front-end-vue3/        # Vue 3 admin interface
│   └── src/
│       ├── views/         # Page components
│       └── components/    # Including Extension Manager
├── server-ng/             # Backend server
│   ├── extensions/        # Extension system
│   └── templates/         # Payload templates
└── tests/                 # Test suite
```

## 🤝 Credits

Built upon [XSS Hunter Express](https://github.com/mandatoryprogrammer/xsshunter-express) by mandatory (Matthew Bryant).

Enhanced NG version by [0xQRx](https://github.com/0xQRx)

## 📜 License

MIT License - See [LICENSE](LICENSE) file

## 🐛 Support

- **Issues**: [GitHub Issues](https://github.com/0xQRx/xsshunter-express-ng/issues)
- **Original Project**: [XSS Hunter Express](https://github.com/mandatoryprogrammer/xsshunter-express)