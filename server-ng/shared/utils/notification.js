const nodemailer = require('nodemailer');
const mustache = require('mustache');
const fs = require('fs');
const path = require('path');
const https = require('https');

const XSS_PAYLOAD_FIRE_EMAIL_TEMPLATE = fs.readFileSync(
	path.join(__dirname, '../../templates/xss_email_template.htm'),
	'utf8'
);

async function send_email_notification(xss_payload_fire_data) {
	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: parseInt(process.env.SMTP_PORT),
		secure: (process.env.SMTP_USE_TLS === "true"),
		auth: {
			user: process.env.SMTP_USERNAME,
			pass: process.env.SMTP_PASSWORD,
		},
	});

	const notification_html_email_body = mustache.render(
		XSS_PAYLOAD_FIRE_EMAIL_TEMPLATE, 
		xss_payload_fire_data
	);

	const info = await transporter.sendMail({
		from: process.env.SMTP_FROM_EMAIL,
		to: process.env.SMTP_RECEIVER_EMAIL,
		subject: `[XSS Hunter Express] XSS Payload Fired On ${xss_payload_fire_data.url}`,
		text: "Only HTML reports are available, please use an email client which supports this.",
		html: notification_html_email_body,
	});

	console.log("Message sent: %s", info.messageId);
}

const DISCORD_WEBHOOK_HOSTS = ['discord.com', 'discordapp.com', 'ptb.discord.com', 'canary.discord.com'];
const DISCORD_WEBHOOK_PATH_REGEX = /^\/api\/(v\d+\/)?webhooks\/\d+\/[A-Za-z0-9_-]+\/?$/;

/*
	Parse and strictly validate a Discord webhook URL.
	Compares the parsed hostname exactly (never a string prefix, which
	"https://discord.com.evil.tld" or "https://discord.com@evil.tld" would pass).
	Returns the parsed URL, or null if it isn't a Discord webhook URL.
*/
function parse_discord_webhook_url(webhookUrl) {
	if (!webhookUrl || typeof webhookUrl !== 'string') {
		return null;
	}

	let parsedUrl;
	try {
		parsedUrl = new URL(webhookUrl.trim());
	} catch {
		return null;
	}

	if (parsedUrl.protocol !== 'https:') return null;
	if (!DISCORD_WEBHOOK_HOSTS.includes(parsedUrl.hostname)) return null;
	if (parsedUrl.port !== '') return null;
	if (parsedUrl.username !== '' || parsedUrl.password !== '') return null;
	if (!DISCORD_WEBHOOK_PATH_REGEX.test(parsedUrl.pathname)) return null;

	return parsedUrl;
}

// Discord rejects the whole webhook if any embed field value exceeds 1024 chars
function truncate_embed_value(value, fallback, max_length = 1024) {
	let text = (value === undefined || value === null || value === '') ? fallback : String(value);
	if (text.length > max_length) {
		text = text.substring(0, max_length - 3) + '...';
	}
	return text;
}

// Render attacker-controlled values as inline code so Discord markdown
// (masked links, mentions, formatting) in them isn't interpreted
function as_inline_code(value, fallback) {
	if (value === undefined || value === null || value === '') {
		return fallback;
	}
	return '`' + truncate_embed_value(String(value).replace(/`/g, "'"), fallback, 1022) + '`';
}

async function send_discord_notification(xss_payload_fire_data) {
	return new Promise((resolve, reject) => {
		const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
		if (!webhookUrl) {
			reject(new Error('Discord webhook URL not configured'));
			return;
		}

		const parsedUrl = parse_discord_webhook_url(webhookUrl);
		if (!parsedUrl) {
			reject(new Error('DISCORD_WEBHOOK_URL is not a valid Discord webhook URL (expected https://discord.com/api/webhooks/<id>/<token>)'));
			return;
		}

		const cookiesValue = as_inline_code(xss_payload_fire_data.cookies, 'None');

		// Construct proper admin panel URL
		console.log('[Discord Debug] Environment variables:');
		console.log('  - process.env.HOSTNAME:', process.env.HOSTNAME);
		console.log('  - process.env.ADMIN_PORT:', process.env.ADMIN_PORT);
		console.log('  - process.env.DEV_MODE:', process.env.DEV_MODE);
		console.log('  - process.env.NODE_ENV:', process.env.NODE_ENV);
		
		const isDevelopment = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development';
		const adminPort = process.env.ADMIN_PORT || 8443;
		
		// Extract hostname without port from HOSTNAME env var
		// HOSTNAME might be "localhost:3000" so we need just the hostname part
		let hostname = process.env.HOSTNAME || 'localhost';
		console.log('[Discord Debug] Original hostname:', hostname);
		
		if (hostname.includes(':')) {
			hostname = hostname.split(':')[0];
			console.log('[Discord Debug] Extracted hostname (removed port):', hostname);
		}
		
		let adminPanelUrl;
		if (isDevelopment) {
			adminPanelUrl = `http://${hostname}:${adminPort}/admin`;
		} else {
			// In production, admin server runs on port 8443 with HTTPS
			adminPanelUrl = `https://${hostname}:${adminPort}/admin`;
		}
		
		console.log('[Discord Debug] Final admin panel URL:', adminPanelUrl);
		console.log('[Discord Debug] isDevelopment:', isDevelopment);
		
		// Create Discord embed with essential data only
		const discordPayload = {
			embeds: [{
				title: '🎯 XSS Payload Fired!',
				description: `[📋 Open Admin Panel](${adminPanelUrl})`,
				color: 15158332, // Red color
				fields: [
					{
						name: '🌐 URL',
						value: as_inline_code(xss_payload_fire_data.url, 'N/A'),
						inline: false
					},
					{
						name: '📍 IP Address',
						value: truncate_embed_value(xss_payload_fire_data.ip_address, 'N/A'),
						inline: true
					},
					{
						name: '🔗 Referer',
						value: as_inline_code(xss_payload_fire_data.referer, 'None'),
						inline: true
					},
					{
						name: '🍪 Cookies',
						value: cookiesValue,
						inline: false
					},
					{
						name: '🔑 Injection Key',
						value: as_inline_code(xss_payload_fire_data.injection_key, 'N/A'),
						inline: true
					}
				],
				timestamp: new Date().toISOString(),
				footer: {
					text: 'XSS Hunter Express'
				}
			}]
		};

		// Add screenshot URL if available (Discord will display it as an image)
		if (xss_payload_fire_data.screenshot_url) {
			discordPayload.embeds[0].image = {
				url: xss_payload_fire_data.screenshot_url
			};
		}

		const data = JSON.stringify(discordPayload);

		const options = {
			hostname: parsedUrl.hostname,
			path: parsedUrl.pathname + parsedUrl.search,
			method: 'POST',
			timeout: 10000,
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(data)
			}
		};

		const req = https.request(options, (res) => {
			let responseData = '';
			res.on('data', (chunk) => {
				responseData += chunk;
			});
			res.on('end', () => {
				if (res.statusCode === 204 || res.statusCode === 200) {
					console.log('Discord notification sent successfully');
					resolve();
				} else {
					console.error('Discord webhook error:', res.statusCode, responseData);
					reject(new Error(`Discord webhook returned status ${res.statusCode}`));
				}
			});
		});

		req.on('timeout', () => {
			req.destroy(new Error('Discord webhook request timed out'));
		});

		req.on('error', (error) => {
			console.error('Discord notification error:', error);
			reject(error);
		});

		req.write(data);
		req.end();
	});
}

module.exports.send_email_notification = send_email_notification;
module.exports.send_discord_notification = send_discord_notification;
module.exports.parse_discord_webhook_url = parse_discord_webhook_url;