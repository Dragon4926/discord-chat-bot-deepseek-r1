# Discord OpenRouter AI Bot

A Discord bot that uses OpenRouter AI to respond to chat messages, designed to be hosted on Cloudflare Workers' free plan.

## Features

- AI-powered chat responses using OpenRouter API
- Conversation memory for contextual responses
- Channel-specific operation
- Command to reset conversation history
- Serverless deployment on Cloudflare Workers

## Prerequisites

- Node.js and npm installed
- A Discord bot token (from Discord Developer Portal)
- An OpenRouter API key
- Cloudflare account

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure your environment:
   - The bot is configured to use Cloudflare Workers' encrypted secrets
   - Run these commands to set up your secrets:
     ```
     npx wrangler secret put BOT_TOKEN
     npx wrangler secret put OPENROUTER_API_KEY
     ```
   - Update the `CHANNEL_ID` in `wrangler.toml` to your Discord channel ID

## Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to the "Bot" tab and create a bot
4. Enable the "Message Content Intent" under Privileged Gateway Intents
5. Copy your bot token and use it for the `BOT_TOKEN` secret
6. Go to OAuth2 > URL Generator:
   - Select scopes: `bot` and `applications.commands`
   - Select bot permissions: `Send Messages`, `Use Slash Commands`
   - Use the generated URL to invite the bot to your server

## Register Slash Commands

Create a separate script to register your slash commands with Discord:

1. Create a file named `register-commands.js` in your project
2. Run it once to register your commands:
   ```
   node register-commands.js
   ```

## Development

To run the bot locally for development:

```
npm run dev
```

## Deployment

To deploy to Cloudflare Workers:

```
npm run deploy
```

## Usage

Once deployed, you can use these commands in your Discord server:

- `/chat [message]` - Chat with the AI assistant
- `/reset` - Reset your conversation history

## Notes

- The bot only responds in the channel specified in `wrangler.toml`
- Conversation history is stored in memory and will be lost when the worker restarts
- For production use, consider using Cloudflare KV or D1 for persistent storage

## License

MIT