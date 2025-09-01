import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId || token === 'your_discord_bot_token_here' || clientId === 'your_discord_application_id_here') {
  console.error('❌ DISCORD_TOKEN ou CLIENT_ID manquant ou invalide.');
  console.error('📝 Veuillez configurer vos vraies clés Discord dans le fichier .env :');
  console.error('   1. Allez sur https://discord.com/developers/applications');
  console.error('   2. Créez une nouvelle application ou sélectionnez-en une existante');
  console.error('   3. Dans "Bot", copiez le TOKEN et mettez-le dans DISCORD_TOKEN');
  console.error('   4. Dans "General Information", copiez l\'APPLICATION ID et mettez-le dans CLIENT_ID');
  process.exit(1);
}

async function registerCommands() {
  const commands = [];
  const commandsPath = path.join(new URL(import.meta.url).pathname.replace(/register-commands\.js$/, ''), 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const { data } = await import(`./commands/${file}`);
    if (data) {
      commands.push(data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    console.log('Enregistrement des commandes slash…');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log('Commandes enregistrées avec succès !');
  } catch (error) {
    console.error(error);
  }
}

registerCommands();