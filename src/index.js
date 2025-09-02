import { Client, GatewayIntentBits, Collection, Partials, ActivityType } from 'discord.js';
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
if (!token || token === 'your_discord_bot_token_here') {
  console.error('❌ DISCORD_TOKEN manquant ou invalide dans le fichier .env');
  console.error('📝 Configurez vos tokens Discord dans .env');
  process.exit(1);
}

// Initialize database
try {
  await db.init();
  console.log('✅ Base de données initialisée');
} catch (error) {
  console.error('❌ Erreur initialisation DB:', error);
  process.exit(1);
}

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
  console.log(`📊 Serveurs: ${client.guilds.cache.size}`);
  console.log(`👥 Utilisateurs: ${client.users.cache.size}`);
  
  // Rich Presence ultra-amélioré avec rotation intelligente
  let statusIndex = 0;
  
  async function updatePresence() {
    try {
      const statuses = [
        async () => {
          try {
            const total = await db.getTotalCirculation();
            const gkc = (total / 100).toLocaleString('fr-FR', { 
              minimumFractionDigits: 0, 
              maximumFractionDigits: 0 
            });
            return { name: `💰 ${gkc} Ǥ en circulation`, type: ActivityType.Watching };
          } catch {
            return { name: `💎 GrokCity • /start`, type: ActivityType.Playing };
          }
        },
        async () => {
          try {
            const price = getCurrentCryptoPrice();
            const btgPrice = (price / 100).toLocaleString('fr-FR', { 
              minimumFractionDigits: 0, 
              maximumFractionDigits: 0 
            });
            const trend = price > 50000 ? '📈' : '📉';
            return { name: `${trend} ${btgPrice} Ǥ/BitGrok`, type: ActivityType.Watching };
          } catch {
            return { name: `₿ BitGrok Trading • /crypto`, type: ActivityType.Playing };
          }
        },
        async () => {
          try {
            const totalUsersResult = await db.execute('SELECT COUNT(*) as count FROM users');
            const users = totalUsersResult.rows[0]?.count || 0;
            return { name: `👥 ${users.toLocaleString()} citoyens actifs`, type: ActivityType.Watching };
          } catch {
            return { name: `👥 Économie virtuelle • /dashboard`, type: ActivityType.Playing };
          }
        },
        async () => {
          try {
            const event = getEvent();
            if (event) {
              const timeLeft = Math.max(1, Math.floor((event.endsAt - Date.now()) / 3600000));
              return { name: `🔥 ${event.name} (${timeLeft}h)`, type: ActivityType.Watching };
            } else {
              return { name: `🏙️ GrokCity • /start pour commencer`, type: ActivityType.Playing };
            }
          } catch {
            return { name: `🌍 Événements économiques • /event`, type: ActivityType.Playing };
          }
        },
        async () => {
          try {
            const guildsResult = await db.execute('SELECT COUNT(*) as count FROM guilds');
            const guilds = guildsResult.rows[0]?.count || 0;
            const warsResult = await db.execute('SELECT COUNT(*) as count FROM guild_wars WHERE status = "active"');
            const wars = warsResult.rows[0]?.count || 0;
            return { name: `🏛️ ${guilds} guildes • ${wars} guerres`, type: ActivityType.Competing };
          } catch {
            return { name: `🏛️ Guildes PvP • /guild`, type: ActivityType.Playing };
          }
        },
        async () => {
          try {
            const vipResult = await db.execute('SELECT COUNT(*) as count FROM users WHERE vip_tier IS NOT NULL');
            const vipUsers = vipResult.rows[0]?.count || 0;
            return { name: `💎 ${vipUsers} joueurs VIP`, type: ActivityType.Watching };
          } catch {
            return { name: `🎰 Casino VIP • /casino`, type: ActivityType.Playing };
          }
        },
        async () => {
          try {
            const richResult = await db.execute('SELECT COUNT(*) as count FROM users WHERE balance + bank_balance >= 100000');
            const richUsers = richResult.rows[0]?.count || 0;
            return { name: `🤑 ${richUsers} millionnaires`, type: ActivityType.Watching };
          } catch {
            return { name: `💰 Devenez riche • /job`, type: ActivityType.Playing };
          }
        },
        async () => {
          return { name: `🎰 Casino sans limites • /casino`, type: ActivityType.Playing };
        },
        async () => {
          return { name: `⚔️ Guerres de guildes • /guild war`, type: ActivityType.Competing };
        },
        async () => {
          return { name: `🏠 Investissement immo • /immo`, type: ActivityType.Playing };
        }
      ];
      
      const activity = await statuses[statusIndex]();
      client.user.setPresence({
        activities: [activity],
        status: 'online'
      });
      
      statusIndex = (statusIndex + 1) % statuses.length;
      
    } catch (err) {
      console.error('Erreur Rich Presence:', err.message);
      // Fallback status simple
      try {
        client.user.setPresence({
          activities: [{ name: `💎 GrokCity • /start`, type: ActivityType.Playing }],
          status: 'online'
        });
      } catch (fallbackError) {
        console.error('Erreur fallback presence:', fallbackError);
      }
    }
  }
  
  updatePresence();
  setInterval(updatePresence, 3 * 60 * 1000); // Rotation toutes les 3 minutes
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;
  
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    
    try {
      await command.execute(interaction, db, config);
    } catch (error) {
      console.error(`❌ Erreur commande ${interaction.commandName}:`, error.message);
      console.error('Stack trace:', error.stack);
      
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