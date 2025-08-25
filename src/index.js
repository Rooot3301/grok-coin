import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import dotenv from 'dotenv';
// Load configuration manually instead of using JSON asserts, which may not be supported in all Node versions
import fs from 'fs';
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

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

// Load commands
import path from 'path';
const commands = new Collection();
const commandsPath = path.join(new URL(import.meta.url).pathname.replace(/index\.js$/, ''), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`./commands/${file}`);
  if (command.data && typeof command.execute === 'function') {
    commands.set(command.data.name, command);
  }
}

client.once('ready', () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);

  // Mettre à jour la présence riche dynamiquement
  function updatePresence() {
    try {
      const total = db.getTotalCirculation();
      // total est en cents, convertissons en GKC avec deux décimales
      const gkc = (total / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      client.user.setPresence({
        activities: [{ name: `💠 ${gkc} GKC en circulation`, type: 3 }],
        status: 'online'
      });
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la Rich Presence', err);
    }
  }

  // Mettre à jour immédiatement et ensuite toutes les 5 minutes
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
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
    }
  }
});

client.login(token);