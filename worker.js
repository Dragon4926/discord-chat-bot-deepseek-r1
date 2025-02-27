// Discord AI Chatbot - Cloudflare Worker Proxy

// Define the allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://your-cloudflare-pages-domain.pages.dev', // Replace with your actual Cloudflare Pages domain
  'https://discord-ai-chatbot.pages.dev' // Add your actual deployed Pages domain here
];

// Discord API endpoint
const DISCORD_API = 'https://discord.com/api/v10';

// Handle CORS preflight requests
function handleOptions(request) {
  const origin = request.headers.get('Origin');
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// Add CORS headers to responses
function addCorsHeaders(response, request) {
  const origin = request.headers.get('Origin');
  const newHeaders = new Headers(response.headers);
  
  newHeaders.set('Access-Control-Allow-Origin', 
    ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// Handle Discord API proxy requests
async function handleDiscordRequest(request, path) {
  const url = `${DISCORD_API}${path}`;
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header is required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const headers = new Headers({
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  });
  
  let requestInit = {
    method: request.method,
    headers: headers
  };
  
  // Add body for non-GET requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      const body = await request.json();
      requestInit.body = JSON.stringify(body);
    } else {
      requestInit.body = await request.text();
    }
  }
  
  try {
    const response = await fetch(url, requestInit);
    const data = await response.json().catch(() => ({}));
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Proxy server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle OpenAI API proxy requests
async function handleOpenAIRequest(request) {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  const isStreaming = body.stream === true;
  
  const headers = new Headers({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  });
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    // Handle streaming responses
    if (isStreaming) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // For non-streaming responses
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'OpenAI proxy server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }
  
  // Simple status endpoint
  if (url.pathname === '/api/status') {
    return new Response(JSON.stringify({ status: 'ok', message: 'Cloudflare Worker proxy is running' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Handle Discord API proxy requests
  if (url.pathname.startsWith('/api/discord')) {
    const path = url.pathname.replace('/api/discord', '');
    const response = await handleDiscordRequest(request, path);
    return addCorsHeaders(response, request);
  }
  
  // Handle OpenAI API proxy requests
  if (url.pathname === '/api/openai') {
    const response = await handleOpenAIRequest(request);
    return addCorsHeaders(response, request);
  }
  
  // Default response for unhandled routes
  return addCorsHeaders(new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  }), request);
}

// Register the worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});