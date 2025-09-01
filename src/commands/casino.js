import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { formatCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('casino')
  .setDescription('🎰 Accéder au casino VIP de GrokCity');

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
        value: `${formatCents(user.balance)} Ǥ`, 
        inline: true 
      },
      { 
        name: '🎯 Total Misé', 
        value: `${formatCents(user.total_wagered || 0)} Ǥ`, 
        inline: true 
      }
    )
    .setImage('https://images.pexels.com/photos/1871508/pexels-photo-1871508.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400')
    .setFooter({ text: '🎰 GrokCasino • Jeu responsable' })
    .setTimestamp();
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('casino_slots')
        .setLabel('Slots')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎰'),
      new ButtonBuilder()
        .setCustomId('casino_blackjack')
        .setLabel('Blackjack')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🃏'),
      new ButtonBuilder()
        .setCustomId('casino_roulette')
        .setLabel('Roulette')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🎡')
    );

  const response = await interaction.reply({ embeds: [embed], components: [row] });
  
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
    filter: i => i.user.id === interaction.user.id
  });

  collector.on('collect', async i => {
    try {
      const game = i.customId.split('_')[1];
      await i.reply({ 
        content: `🎮 Utilisez la commande \`/${game}\` pour jouer !`, 
        ephemeral: true 
      });
    } catch (error) {
      console.error('Erreur interaction casino:', error);
    }
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        ...row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
      );
    interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}