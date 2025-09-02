import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getEvent, getCurrentCryptoPrice } from './events.js';

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

// Cache pour optimiser les performances
const userCache = new Map();
const cacheTimeout = 30000; // 30 secondes

function getCachedUser(userId) {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < cacheTimeout) {
    return cached.data;
  }
  const userData = db.getUser(userId);
  userCache.set(userId, { data: userData, timestamp: Date.now() });
  return userData;
}

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
  console.log(`📊 Serveurs: ${client.guilds.cache.size}`);
  console.log(`👥 Utilisateurs: ${client.users.cache.size}`);
  
  // Rich Presence amélioré
  function updatePresence() {
    try {
      // Rotation des statuts toutes les 3 minutes avec plus de variété
      const statuses = [
        async () => {
          const total = db.getTotalCirculation();
          const gkc = (total / 100).toLocaleString('fr-FR', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
          });
          return { name: `💰 ${gkc} Ǥ en circulation`, type: 3 };
        },
        async () => {
          const price = getCurrentCryptoPrice();
          const btgPrice = (price / 100).toLocaleString('fr-FR', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
          });
          return { name: `₿ ${btgPrice} Ǥ/BitGrok`, type: 3 };
        },
        async () => {
          const totalUsersResult = await db.execute('SELECT COUNT(*) as count FROM users');
          const users = totalUsersResult.rows[0].count;
          return { name: `👥 ${users} citoyens actifs`, type: 3 };
        },
        async () => {
          const event = getEvent();
          if (event) {
            const timeLeft = Math.max(1, Math.floor((event.endsAt - Date.now()) / 3600000));
            return { name: `🔥 ${event.name} (${timeLeft}h)`, type: 3 };
          } else {
            return { name: `🏙️ GrokCity • /start pour commencer`, type: 3 };
          }
        },
        async () => {
          const guildsResult = await db.execute('SELECT COUNT(*) as count FROM guilds');
          const guilds = guildsResult.rows[0].count;
          const warsResult = await db.execute('SELECT COUNT(*) as count FROM guild_wars WHERE status = "active"');
          const wars = warsResult.rows[0].count;
          return { name: `🏛️ ${guilds} guildes • ${wars} guerres`, type: 3 };
        }
        async () => {
          const vipResult = await db.execute('SELECT COUNT(*) as count FROM users WHERE vip_tier IS NOT NULL');
          const vipUsers = vipResult.rows[0].count;
          return { name: `💎 ${vipUsers} joueurs VIP`, type: 3 };
        },
        async () => {
          const richResult = await db.execute('SELECT COUNT(*) as count FROM users WHERE balance + bank_balance > 100000');
          const richUsers = richResult.rows[0].count;
          return { name: `🤑 ${richUsers} millionnaires`, type: 3 };
        },
        async () => {
          return { name: `🎰 Casino • /casino pour jouer`, type: 3 };
        }
      ];
      
      const statusIndex = Math.floor(Date.now() / 180000) % statuses.length;
      statuses[statusIndex]().then(activity => {
        client.user.setPresence({
          activities: [activity],
          status: 'online'
        });
      }).catch(err => {
        console.error('Erreur Rich Presence:', err.message);
        // Fallback status
        client.user.setPresence({
          activities: [{ name: `💎 GrokCity • /start`, type: 3 }],
          status: 'online'
        });
      });
    } catch (err) {
      console.error('Erreur Rich Presence:', err.message);
    }
  }
  
  updatePresence();
  setInterval(updatePresence, 3 * 60 * 1000); // Toutes les 3 minutes pour rotation
  
  // Nettoyage du cache toutes les 5 minutes
  setInterval(() => {
    userCache.clear();
  }, 5 * 60 * 1000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;
  
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    
    try {
      // Optimisation: utiliser le cache pour les données utilisateur fréquentes
      await command.execute(interaction, db, config);
    } catch (error) {
      console.error(`❌ Erreur commande ${interaction.commandName}:`, error.message);
      console.error('Stack trace:', error.stack);
      
      const errorMessage = {
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
        ephemeral: true
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
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du bot...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Arrêt du bot (SIGTERM)...');
  client.destroy();
  process.exit(0);
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

client.login(token);