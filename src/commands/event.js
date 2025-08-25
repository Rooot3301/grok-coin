import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getEvent } from '../events.js';

export const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Affiche l\'événement en cours et ses effets');

export async function execute(interaction, db, config) {
  const ev = getEvent();
  const endsInMs = ev.endsAt - Date.now();
  const hours = Math.floor(endsInMs / 3600000);
  const minutes = Math.floor((endsInMs % 3600000) / 60000);
  const embed = new EmbedBuilder()
    .setTitle(`Événement en cours : ${ev.name}`)
    .setDescription(ev.description)
    .addFields({ name: 'Fin dans', value: `${hours}h ${minutes}m`, inline: true });
  await interaction.reply({ embeds: [embed] });
}