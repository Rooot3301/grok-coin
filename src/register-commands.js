import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN ou CLIENT_ID manquant. Veuillez définir ces valeurs dans le fichier .env.');
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