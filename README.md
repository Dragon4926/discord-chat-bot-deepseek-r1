# Discord AI Chatbot

A web-based Discord AI chatbot that uses OpenAI's API to generate responses to messages in a Discord channel.

## Features

- Connect to Discord channels using a bot token
- Send and receive messages through Discord API
- Generate AI responses using OpenAI API
- Customizable AI personality and response length
- Support for different OpenAI models (GPT-3.5 Turbo, GPT-4, GPT-4 Turbo)
- Streaming responses for a better user experience

## Setup Instructions

### Prerequisites

- A Discord bot token (create one at [Discord Developer Portal](https://discord.com/developers/applications))
- An OpenAI API key
- A Discord channel ID where the bot has permission to read and send messages

### Installation

1. Clone or download this repository

### Running the Application

#### Option 1: Local Development with Cloudflare Workers

1. Install Wrangler CLI (Cloudflare Workers command-line tool):

```bash
npm install -g wrangler
```

2. Start the local development server:

```bash
wrangler dev worker.js
```

3. Open `index.html` in your browser (you can use a simple HTTP server like `http-server` or VS Code's Live Server extension)

#### Option 2: Deploy to Cloudflare Workers

1. Login to your Cloudflare account with Wrangler:

```bash
wrangler login
```

2. Deploy the worker:

```bash
wrangler publish
```

3. Update the worker URL in `app.js` with your deployed worker URL

3. Enter your Discord bot token, channel ID, and OpenAI API key in the web interface

4. Click "Connect Bot" to start the connection

## How It Works

This application uses a proxy server to handle CORS issues when communicating with Discord and OpenAI APIs. The proxy server is implemented using Express.js and runs on port 3001 by default.

- The frontend makes requests to the proxy server instead of directly to Discord/OpenAI
- The proxy server forwards these requests to the appropriate API endpoints
- The proxy server handles authentication and returns the responses to the frontend

## Troubleshooting

### CORS Issues

If you're experiencing CORS errors, make sure:

1. The proxy server is running (`npm start`)
2. The frontend is using the correct proxy URLs (`http://localhost:3001/api/discord` and `http://localhost:3001/api/openai`)

### Authentication Errors

If you're seeing 401 or 403 errors:

1. Verify your Discord bot token is correct
2. Ensure your bot has been invited to the server and has appropriate permissions
3. Check that the channel ID is correct and the bot has access to it

### OpenAI API Errors

If AI responses are failing:

1. Verify your OpenAI API key is correct and has sufficient credits
2. Check that you're using a valid model name in the dropdown

## License

MIT