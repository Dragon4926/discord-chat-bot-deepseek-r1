// Script to register Discord slash commands

// Load environment variables from .env file
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const APPLICATION_ID = process.env.APPLICATION_ID || ''; // You'll need to add this to your .env file

if (!BOT_TOKEN) {
  console.error('Error: BOT_TOKEN is required in .env file');
  process.exit(1);
}

if (!APPLICATION_ID) {
  console.error('Error: APPLICATION_ID is required in .env file');
  process.exit(1);
}

// Commands to register
const commands = [
  {
    name: 'chat',
    description: 'Chat with Elena',
    options: [
      {
        name: 'message',
        description: 'Your reply',
        type: 3, // STRING type
        required: true
      }
    ]
  },
  {
    name: 'reset',
    description: 'Reset your conversation history'
  }
];

// Register commands with Discord API
async function registerCommands() {
  try {
    console.log('Registering slash commands...');
    
    const response = await fetch(
      `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commands)
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error registering commands:', errorData);
      return;
    }
    
    console.log('Slash commands registered successfully!');
    const data = await response.json();
    console.log(`Registered ${data.length} commands:`);
    data.forEach(command => {
      console.log(`- ${command.name}: ${command.description}`);
    });
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// Execute the registration
registerCommands();