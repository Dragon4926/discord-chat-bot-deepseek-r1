# Deploying Discord AI Chatbot to Cloudflare

This guide will walk you through the process of deploying your Discord AI Chatbot to Cloudflare.

## Prerequisites

- A Cloudflare account
- Node.js and npm installed on your machine

## Step 1: Install Wrangler CLI

Wrangler is Cloudflare's command-line tool for managing Workers.

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

Authenticate with your Cloudflare account:

```bash
wrangler login
```

Follow the prompts to complete the authentication process.

## Step 3: Deploy the Worker

Deploy your worker to Cloudflare:

```bash
wrangler publish
```

After successful deployment, you'll receive a URL for your worker (e.g., `https://discord-ai-chatbot-proxy.your-username.workers.dev`).

## Step 4: Update the Worker URL in app.js

Open `app.js` and update the `WORKER_URL` variable with your deployed worker URL:

```javascript
// Configuration
let WORKER_URL = 'https://discord-ai-chatbot-proxy.your-username.workers.dev'; // Replace with your actual worker URL
```

## Step 5: Update ALLOWED_ORIGINS in worker.js

Before deploying again, update the `ALLOWED_ORIGINS` array in `worker.js` to include your frontend domain:

```javascript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://your-actual-domain.pages.dev', // Replace with your actual domain
  'https://discord-ai-chatbot.pages.dev'
];
```

## Step 6: Deploy Frontend to Cloudflare Pages

1. Create a new GitHub repository and push your code to it
2. Log in to the Cloudflare dashboard
3. Navigate to Pages > Create a project
4. Connect your GitHub repository
5. Configure your build settings:
   - Build command: (leave empty if no build step is needed)
   - Build output directory: `.` (root directory)
6. Deploy your site

## Step 7: Test Your Application

1. Open your deployed Cloudflare Pages site
2. Enter your Discord bot token, channel ID, and OpenAI API key
3. Click "Connect Bot" to start the connection

## Troubleshooting

### CORS Issues

If you're experiencing CORS errors:

1. Ensure your worker is deployed correctly
2. Verify that your frontend domain is included in the `ALLOWED_ORIGINS` array in `worker.js`
3. Redeploy your worker after making any changes

### Connection Issues

If the bot fails to connect:

1. Check that your Discord bot token and channel ID are correct
2. Ensure your bot has the necessary permissions in the Discord server
3. Verify that your worker URL is correctly set in `app.js`

## Next Steps

Your Discord AI Chatbot should now be fully deployed and functional. You can share the Cloudflare Pages URL with others to let them use your bot interface.