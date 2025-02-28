// Enhanced Discord AI Bot for Cloudflare Workers (CommonJS version)

// Import required dependencies
const { verifyKey } = require('discord-interactions');
// Replace the old import with the new OpenAI client
const { OpenAI } = require('openai');

// API Client configuration (will be initialized with environment variables)
let aiClient = null;

// Discord API interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
};

// Discord API interaction response types
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
  PREMIUM_REQUIRED: 10,
};

// Message history storage (in-memory for simplicity)
// Note: For production, consider using Cloudflare KV or D1 for persistence
const messageHistoryCache = new Map();

// User preferences storage
const userPreferencesCache = new Map();

// Default user preferences
const defaultPreferences = {
  provider: 'openai',
  model: 'gpt-4o',
  customApiUrl: 'https://api.openai.com/v1/chat/completions',
  customApiKey: process.env.OPENAI_API_KEY,
  characterPersona: 'She is several generations removed from Scathach, the legendary warrior maiden associated with the Isle of Skye. But her only known power is controlling the weather, especially storms. She was also able to send ants to invade the nest.',
  temperature: 0.7,
  maxTokens: 500
};

// Helper function to verify Discord requests
async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.clone().text();
  
  if (!signature || !timestamp || !body) {
    return false;
  }
  
  return verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
}

// Helper function to get user preferences
function getUserPreferences(userId) {
  if (!userPreferencesCache.has(userId)) {
    userPreferencesCache.set(userId, { ...defaultPreferences });
  }
  
  return userPreferencesCache.get(userId);
}

// Helper function to update user preferences
function updateUserPreferences(userId, updates) {
  const currentPrefs = getUserPreferences(userId);
  userPreferencesCache.set(userId, { ...currentPrefs, ...updates });
  return userPreferencesCache.get(userId);
}

// Helper function to get conversation history for a user
function getConversationHistory(userId, maxMessages = 10) {
  if (!messageHistoryCache.has(userId)) {
    messageHistoryCache.set(userId, []);
  }
  
  return messageHistoryCache.get(userId).slice(-maxMessages);
}

// Helper function to add a message to conversation history
function addToConversationHistory(userId, role, content) {
  if (!messageHistoryCache.has(userId)) {
    messageHistoryCache.set(userId, []);
  }
  
  const history = messageHistoryCache.get(userId);
  history.push({ role, content });
  
  // Limit history size to prevent memory issues
  if (history.length > 20) {
    history.shift();
  }
}

// Initialize AI client based on user preferences
function initializeAIClient(userId, env) {
  const prefs = getUserPreferences(userId);
  
  if (prefs.provider === 'openai') {
    // Use OpenAI API with new client structure
    return new OpenAI({
      apiKey: prefs.customApiKey || env.OPENAI_API_KEY,
      baseURL: prefs.customApiUrl || undefined,
    });
  } else if (prefs.provider === 'openrouter') {
    // Use OpenRouter API through OpenAI client with modified baseURL
    return new OpenAI({
      apiKey: prefs.customApiKey || env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  } else {
    // Default to OpenAI if provider is unknown
    return new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }
}

// Process messages with AI
async function processWithAI(userId, content, env) {
  // Initialize AI client based on user preferences
  aiClient = initializeAIClient(userId, env);
  
  // Get user preferences
  const prefs = getUserPreferences(userId);
  
  // Get conversation history
  const history = getConversationHistory(userId);
  
  // Prepare messages for AI
  const messages = [
    { role: 'system', content: prefs.characterPersona },
    ...history,
    { role: 'user', content: content }
  ];
  
  try {
    // Use OpenAI client for both OpenAI and OpenRouter (with different baseURLs)
    const response = await aiClient.chat.completions.create({
      model: prefs.model,
      messages: messages,
      max_tokens: prefs.maxTokens,
      temperature: prefs.temperature,
    });
    
    const aiResponse = response.choices[0].message.content;
    addToConversationHistory(userId, 'assistant', aiResponse);
    return aiResponse;
  } catch (error) {
    console.error('AI API error:', error);
    return 'Sorry, I encountered an error processing your request. Please check your API configuration or try again later.';
  }
}

// Generate a DnD character with AI
async function generateDnDCharacter(userId, parameters, env) {
  const prompt = `Generate a detailed Dungeons & Dragons character with the following parameters:
  ${parameters ? parameters : "Any race, any class, level 1"}
  
  Please include:
  - Name
  - Race and Class
  - Background
  - Ability Scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma)
  - Personality Traits
  - Ideals, Bonds, and Flaws
  - A short backstory
  - Notable equipment or items`;
  
  return await processWithAI(userId, prompt, env);
}

// Generate an adventure guide
async function generateAdventureGuide(userId, theme, env) {
  const prompt = `Create a short adventure guide for a tabletop RPG with the following theme:
  ${theme ? theme : "A mysterious dungeon with ancient artifacts"}
  
  Please include:
  - Adventure title and setting
  - Main quest objective
  - 3-5 key NPCs with brief descriptions
  - 3-4 locations or encounters
  - Potential challenges and rewards`;
  
  return await processWithAI(userId, prompt, env);
}

// Search for content (simplified mock implementation)
async function searchForContent(userId, query, type, env) {
  const prompt = `The user is searching for ${type} related to "${query}". 
  Provide 3-5 recommendations with titles, brief descriptions, and why they might be relevant.
  Format the results in a clear numbered list.`;
  
  return await processWithAI(userId, prompt, env);
}

// Handle Discord interactions
async function handleInteraction(request, env) {
  const interaction = await request.json();
  
  // Handle Discord's ping verification
  if (interaction.type === InteractionType.PING) {
    return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Extract user ID
  const userId = interaction.member?.user?.id ?? interaction.user?.id;
  
  // Only process messages in the specified channel if channel restriction is enabled
  if (env.RESTRICT_TO_CHANNEL && interaction.channel_id !== env.CHANNEL_ID) {
    return new Response(JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'This bot only works in the designated channel.' }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
  
  // Handle message commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;
    
    // Handle chat command
    if (name === 'chat') {
      const content = interaction.data.options[0].value;
      
      // Add user message to history
      addToConversationHistory(userId, 'user', content);
      
      // Send a deferred response while we process with AI
      return new Response(JSON.stringify({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Handle reset command to clear conversation history
    if (name === 'reset') {
      messageHistoryCache.delete(userId);
      
      return new Response(JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Conversation history has been reset.' }
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Handle setprovider command
    if (name === 'setprovider') {
      const provider = interaction.data.options.find(o => o.name === 'provider')?.value;
      const apiKey = interaction.data.options.find(o => o.name === 'apikey')?.value;
      const apiUrl = interaction.data.options.find(o => o.name === 'apiurl')?.value;
      
      const updates = {};
      if (provider) updates.provider = provider;
      if (apiKey) updates.customApiKey = apiKey;
      if (apiUrl) updates.customApiUrl = apiUrl;
      
      const prefs = updateUserPreferences(userId, updates);
      
      return new Response(JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { 
          content: `Provider settings updated:\nProvider: ${prefs.provider}${prefs.customApiUrl ? '\nCustom API URL: Set' : ''}${prefs.customApiKey ? '\nCustom API Key: Set' : ''}`
        }
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Handle setcharacter command
    if (name === 'setcharacter') {
      const persona = interaction.data.options[0].value;
      updateUserPreferences(userId, { characterPersona: persona });
      
      return new Response(JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Character persona has been updated.' }
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Handle setmodel command
    if (name === 'setmodel') {
      const model = interaction.data.options[0].value;
      updateUserPreferences(userId, { model });
      
      return new Response(JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `Model has been set to ${model}.` }
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Handle dndchar command
    if (name === 'dndchar') {
      const parameters = interaction.data.options?.[0]?.value;
      
      // Send a deferred response while we generate the character
      return new Response(JSON.stringify({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Handle adventure command
    if (name === 'adventure') {
      const theme = interaction.data.options?.[0]?.value;
      
      // Send a deferred response while we generate the adventure
      return new Response(JSON.stringify({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Handle search command
    if (name === 'search') {
      const query = interaction.data.options.find(o => o.name === 'query')?.value;
      const type = interaction.data.options.find(o => o.name === 'type')?.value || 'videos';
      
      // Send a deferred response while we search
      return new Response(JSON.stringify({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      }), { headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // Return a default response
  return new Response(JSON.stringify({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: 'Command not recognized.' }
  }), { headers: { 'Content-Type': 'application/json' } });
}

// Process follow-up responses for deferred interactions
async function handleFollowup(interaction, env) {
  const userId = interaction.member?.user?.id ?? interaction.user?.id;
  const { name } = interaction.data;
  
  let responseContent = '';
  
  if (name === 'chat') {
    const content = interaction.data.options[0].value;
    responseContent = await processWithAI(userId, content, env);
  } else if (name === 'dndchar') {
    const parameters = interaction.data.options?.[0]?.value;
    responseContent = await generateDnDCharacter(userId, parameters, env);
  } else if (name === 'adventure') {
    const theme = interaction.data.options?.[0]?.value;
    responseContent = await generateAdventureGuide(userId, theme, env);
  } else if (name === 'search') {
    const query = interaction.data.options.find(o => o.name === 'query')?.value;
    const type = interaction.data.options.find(o => o.name === 'type')?.value || 'videos';
    responseContent = await searchForContent(userId, query, type, env);
  }
  
  // Send the follow-up message
  const applicationId = interaction.application_id;
  const interactionToken = interaction.token;
  
  const endpoint = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;
  
  // Split response if it exceeds Discord's character limit
  const MAX_DISCORD_LENGTH = 2000;
  
  // If response is within the limit, send a single message
  if (responseContent.length <= MAX_DISCORD_LENGTH) {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: responseContent
      })
    });
  } else {
    // Split the message into chunks of ~2000 characters
    // More intelligent splitting to avoid breaking in the middle of a line
    const chunks = [];
    let currentChunk = '';
    
    // Split by paragraphs first (better readability)
    const paragraphs = responseContent.split('\n\n');
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      
      // If this paragraph alone is too long, we need to split it by lines
      if (paragraph.length > MAX_DISCORD_LENGTH) {
        // If we have content in the current chunk, push it and start fresh
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        
        // Split this long paragraph by lines
        const lines = paragraph.split('\n');
        let lineChunk = '';
        
        for (const line of lines) {
          // If this single line is too long (rare but possible)
          if (line.length > MAX_DISCORD_LENGTH) {
            // If we have content in lineChunk, push it first
            if (lineChunk.length > 0) {
              chunks.push(lineChunk);
              lineChunk = '';
            }
            
            // Split this long line into chunks of MAX_DISCORD_LENGTH
            let remainingLine = line;
            while (remainingLine.length > 0) {
              const chunkSize = Math.min(remainingLine.length, MAX_DISCORD_LENGTH);
              chunks.push(remainingLine.substring(0, chunkSize));
              remainingLine = remainingLine.substring(chunkSize);
            }
          } 
          // Check if adding this line would exceed the limit
          else if (lineChunk.length + line.length + 1 > MAX_DISCORD_LENGTH) {
            chunks.push(lineChunk);
            lineChunk = line;
          } else {
            lineChunk += (lineChunk.length > 0 ? '\n' : '') + line;
          }
        }
        
        // Add any remaining line chunk
        if (lineChunk.length > 0) {
          chunks.push(lineChunk);
        }
      } 
      // Check if adding this paragraph would exceed the chunk limit
      else if (currentChunk.length + paragraph.length + 2 > MAX_DISCORD_LENGTH) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        // Add paragraph separator if not the first paragraph in the chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n';
        }
        currentChunk += paragraph;
      }
    }
    
    // Add the final chunk if not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    // Send chunks sequentially
    for (const chunk of chunks) {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: chunk
        })
      });
      
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// Main worker event handler - CommonJS export syntax
module.exports = {
  async fetch(request, env, ctx) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    // Verify the request is from Discord
    if (!await verifyDiscordRequest(request.clone(), env)) {
      return new Response('Invalid request signature', { status: 401 });
    }
    
    // Handle the interaction
    const interaction = await request.clone().json();
    const response = await handleInteraction(request.clone(), env);
    
    // For deferred responses, process in the background
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name } = interaction.data;
      if (['chat', 'dndchar', 'adventure', 'search'].includes(name)) {
        // Use waitUntil to handle the follow-up without blocking the response
        ctx.waitUntil(handleFollowup(interaction, env));
      }
    }
    
    return response;
  }
};