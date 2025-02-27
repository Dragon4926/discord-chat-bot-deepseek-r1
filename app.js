// Discord AI Chatbot - Frontend JavaScript

// Configuration
let WORKER_URL = 'https://discord-ai-chatbot-proxy.your-username.workers.dev'; // Replace with your actual worker URL after deployment

// DOM Elements
const botTokenInput = document.getElementById('bot-token');
const channelIdInput = document.getElementById('channel-id');
const openaiApiKeyInput = document.getElementById('openai-api-key');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const connectionStatus = document.getElementById('connection-status');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const aiPersonality = document.getElementById('ai-personality');
const responseLength = document.getElementById('response-length');
const aiModel = document.getElementById('ai-model');

// State variables
let isConnected = false;
let botToken = '';
let channelId = '';
let openaiApiKey = '';
let messageHistory = [];

// Event Listeners
connectBtn.addEventListener('click', connectBot);
disconnectBtn.addEventListener('click', disconnectBot);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Connect to Discord bot
async function connectBot() {
  botToken = botTokenInput.value.trim();
  channelId = channelIdInput.value.trim();
  openaiApiKey = openaiApiKeyInput.value.trim();
  
  if (!botToken || !channelId || !openaiApiKey) {
    showError('Please enter all required fields');
    return;
  }
  
  try {
    // Test connection to Discord API via our worker
    const response = await fetch(`${WORKER_URL}/api/discord/channels/${channelId}`, {
      headers: {
        'Authorization': `Bot ${botToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Connection successful
      isConnected = true;
      updateConnectionStatus(true);
      fetchMessages();
    } else {
      showError(`Connection failed: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    showError(`Connection error: ${error.message}`);
  }
}

// Disconnect bot
function disconnectBot() {
  isConnected = false;
  updateConnectionStatus(false);
  messageHistory = [];
  chatMessages.innerHTML = '';
}

// Update UI based on connection status
function updateConnectionStatus(connected) {
  isConnected = connected;
  connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
  connectionStatus.className = `status ${connected ? 'connected' : ''}`;
  
  connectBtn.disabled = connected;
  disconnectBtn.disabled = !connected;
  messageInput.disabled = !connected;
  sendBtn.disabled = !connected;
  
  if (connected) {
    messageInput.focus();
  }
}

// Fetch messages from Discord channel
async function fetchMessages() {
  try {
    const response = await fetch(`${WORKER_URL}/api/discord/channels/${channelId}/messages?limit=50`, {
      headers: {
        'Authorization': `Bot ${botToken}`
      }
    });
    
    const messages = await response.json();
    
    if (Array.isArray(messages)) {
      chatMessages.innerHTML = '';
      messages.reverse().forEach(message => {
        addMessageToChat(message);
      });
      
      // Store message history for context
      messageHistory = messages.map(msg => ({
        role: msg.author.bot ? 'assistant' : 'user',
        content: msg.content
      }));
    }
  } catch (error) {
    showError(`Error fetching messages: ${error.message}`);
  }
}

// Send message to Discord and get AI response
async function sendMessage() {
  const messageContent = messageInput.value.trim();
  
  if (!messageContent || !isConnected) return;
  
  messageInput.value = '';
  messageInput.disabled = true;
  sendBtn.disabled = true;
  
  try {
    // Send message to Discord
    const discordResponse = await fetch(`${WORKER_URL}/api/discord/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: messageContent })
    });
    
    const sentMessage = await discordResponse.json();
    
    if (!discordResponse.ok) {
      throw new Error(sentMessage.message || 'Failed to send message');
    }
    
    // Add user message to chat
    addMessageToChat(sentMessage);
    
    // Update message history
    messageHistory.push({
      role: 'user',
      content: messageContent
    });
    
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message bot typing';
    typingIndicator.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Get AI response
    const aiResponse = await fetch(`${WORKER_URL}/api/openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': openaiApiKey
      },
      body: JSON.stringify({
        model: aiModel.value,
        messages: [
          {
            role: 'system',
            content: getSystemPrompt()
          },
          ...messageHistory.slice(-10) // Use last 10 messages for context
        ]
      })
    });
    
    const aiData = await aiResponse.json();
    
    // Remove typing indicator
    chatMessages.removeChild(typingIndicator);
    
    if (aiResponse.ok && aiData.choices && aiData.choices[0]) {
      const responseContent = aiData.choices[0].message.content;
      
      // Send AI response to Discord
      const botMessageResponse = await fetch(`${WORKER_URL}/api/discord/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: responseContent })
      });
      
      const botMessage = await botMessageResponse.json();
      
      if (botMessageResponse.ok) {
        // Add bot message to chat
        addMessageToChat(botMessage);
        
        // Update message history
        messageHistory.push({
          role: 'assistant',
          content: responseContent
        });
      }
    } else {
      throw new Error(aiData.error?.message || 'Failed to get AI response');
    }
  } catch (error) {
    showError(`Error: ${error.message}`);
  } finally {
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

// Add message to chat UI
function addMessageToChat(message) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${message.author.bot ? 'bot' : 'user'}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = message.author.bot ? 'AI' : 'You';
  
  const content = document.createElement('div');
  content.className = 'content';
  content.textContent = message.content;
  
  messageElement.appendChild(avatar);
  messageElement.appendChild(content);
  
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Get system prompt based on selected personality and response length
function getSystemPrompt() {
  const personality = aiPersonality.value;
  const length = responseLength.value;
  
  let prompt = '';
  
  switch (personality) {
    case 'helpful':
      prompt = 'You are a helpful assistant that provides accurate and concise information.';
      break;
    case 'friendly':
      prompt = 'You are a friendly companion who is warm, empathetic, and conversational.';
      break;
    case 'professional':
      prompt = 'You are a professional guide who provides well-structured, formal, and detailed responses.';
      break;
    case 'creative':
      prompt = 'You are a creative partner who thinks outside the box and offers innovative perspectives.';
      break;
    default:
      prompt = 'You are a helpful assistant.';
  }
  
  switch (length) {
    case 'short':
      prompt += ' Keep your responses brief and to the point.';
      break;
    case 'medium':
      prompt += ' Provide moderately detailed responses.';
      break;
    case 'long':
      prompt += ' Provide comprehensive and detailed responses.';
      break;
  }
  
  return prompt;
}

// Show error message
function showError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  
  document.querySelector('.container').appendChild(errorElement);
  
  setTimeout(() => {
    errorElement.remove();
  }, 5000);
}

// Check worker status on page load
async function checkWorkerStatus() {
  try {
    const response = await fetch(`${WORKER_URL}/api/status`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('Worker is running:', data.message);
    } else {
      console.error('Worker status check failed');
    }
  } catch (error) {
    console.error('Worker connection error:', error.message);
  }
}

// Initialize
checkWorkerStatus();