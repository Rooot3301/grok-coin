import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

/**
 * Commande d'aide : fournit un résumé des fonctionnalités et commandes principales du bot GrokCoin.
 */
export const data = new SlashCommandBuilder()
  .setName('aide')
  .setDescription('Afficher l\'aide et les conseils d\'utilisation pour GrokCoin');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📖 Aide & Commandes GrokCoin')
    .setColor(0xffc107)
    .setDescription('Voici les commandes principales organisées par thème :')
    .addFields(
      { name: '💰 Économie', value: '/start, /profil, /job, /banque, /dex, /stake, /node, /immo, /payer', inline: false },
      { name: '🎰 Casino', value: '/casino, /coinflip, /dice, /roulette, /pari', inline: false },
      { name: '🎭 RP & Duel', value: '/gunfight', inline: false },
      { name: '🛠️ Config & News', value: '/config, /news', inline: false },
      { name: '📚 Aide & Guide', value: '/aide, /guide', inline: false }
    )
    .setFooter({ text: 'CopaingCity – La ville où l’argent parle' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}