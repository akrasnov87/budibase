# Telegram agent deployment channel

Configure a Telegram bot token on the agent, save the channel, then call Telegram `setWebhook` with the generated Budibase URL. Optionally set a webhook secret token in both Telegram and the agent so Budibase can verify `x-telegram-bot-api-secret-token` on each update.

Local development usually needs a public HTTPS URL (for example a tunnel) because Telegram delivers webhooks from the public internet.
