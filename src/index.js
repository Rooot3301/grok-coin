import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load configuration
const configPath = new URL('./config.json', import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath));
import db from './db.js';

// Load environment variables
dotenv.config();

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN manquant dans le fichier .env');
  process.exit(1);
}

// Initialize database
db.init();

// Create client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

// Load commands
const commands = new Collection();
const commandsPath = path.join(new URL(import.meta.url).pathname.replace(/index\.js$/, ''), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const command = await import(`./commands/${file}`);
    if (command.data && typeof command.execute === 'function') {
      commands.set(command.data.name, command);
      console.log(`✅ Commande chargée: ${command.data.name}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors du chargement de ${file}:`, error.message);
  }
}

client.once('clientReady', () => {
  console.log(`🚀 Bot connecté: ${client.user.tag}`);
  
  // Update presence
  function updatePresence() {
    try {
      const total = db.getTotalCirculation();
      const gkc = (total / 100).toLocaleString('fr-FR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
      client.user.setPresence({
        activities: [{ name: `💎 ${gkc} GKC en circulation`, type: 3 }],
        status: 'online'
      });
    } catch (err) {
      console.error('Erreur Rich Presence:', err.message);
    }
  }
  
  updatePresence();
  setInterval(updatePresence, 5 * 60 * 1000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction, db, config);
  } catch (error) {
    console.error(`❌ Erreur commande ${interaction.commandName}:`, error.message);
    
    const errorMessage = {
      content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
      flags: 64
    };
    
    try {
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else if (!interaction.replied) {
        await interaction.reply(errorMessage);
      }
    } catch (followUpError) {
      console.error('Erreur lors de l\'envoi du message d\'erreur:', followUpError.message);
    }
  }
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

client.login(token);