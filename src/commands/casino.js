import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('casino')
  .setDescription('🎰 Menu principal du casino');

export async function execute(interaction, db, config) {
  const user = db.getUser(interaction.user.id);
  const vipTier = db.getVipTier(interaction.user.id);
  
  const embed = new EmbedBuilder()
    .setTitle('🎰 GrokCasino')
    .setColor(0xe74c3c)
    .setDescription(
      '**Bienvenue au casino le plus prestigieux de GrokCity !**\n\n' +
      '🃏 `/blackjack` → Blackjack interactif\n' +
      '🎰 `/slots` → Machines à sous premium\n' +
      '🎡 `/roulette` → Roulette européenne\n' +
      '🃏 `/poker` → Video Poker\n' +
      '🎴 `/baccarat` → Baccarat authentique\n' +
      '🎲 `/coinflip` → Pile ou face\n' +
      '🎯 `/dice` → Jeu de dés\n' +
      '🏈 `/pari` → Paris sportifs\n\n' +
      '**🚀 Aucune limite de mise - Jouez librement !**'
    )
    .addFields(
      { 
        name: '💎 Statut VIP', 
        value: vipTier ? `**${vipTier.toUpperCase()}** (+${(config.casino.vip_tiers[vipTier].bonus * 100).toFixed(0)}% bonus)` : 'Standard', 
        inline: true 
      },
      { 
        name: '💰 Votre Solde', 
        value: `${(user.balance / 100).toFixed(2)} Ǥ`, 
        inline: true 
      },
      { 
        name: '🎯 Total Misé', 
        value: `${((user.total_wagered || 0) / 100).toFixed(2)} Ǥ`, 
        inline: true 
      }
    )
    .setImage('https://images.pexels.com/photos/1871508/pexels-photo-1871508.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400')
    .setFooter({ text: '🎰 GrokCasino • Jeu responsable' })
    .setTimestamp();
  
  return interaction.reply({ embeds: [embed] });
}