import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { formatGrokCoin, formatBitGrok, SYMBOLS, COLORS } from '../utils/symbols.js';
import { getCurrentCryptoPrice, getEvent } from '../events.js';

export const data = new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('📊 Tableau de bord principal de GrokCity');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const cryptoPrice = getCurrentCryptoPrice();
  const currentEvent = getEvent();
  
  // Stats rapides
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalCirculation = db.getTotalCirculation();
  const avgWealth = totalUsers > 0 ? Math.floor(totalCirculation / totalUsers) : 0;
  
  const embed = new EmbedBuilder()
    .setTitle(`${SYMBOLS.DIAMOND} GrokCity Dashboard`)
    .setColor(COLORS.INFO)
    .setDescription(`**Bienvenue dans le centre de contrôle de votre empire !**`)
    .setThumbnail('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=128&h=128')
    .addFields(
      {
        name: `${SYMBOLS.WALLET} Votre Situation`,
        value: `${SYMBOLS.GROKCOIN} **${formatGrokCoin(user.balance)}** *(liquide)*\n${SYMBOLS.BANK} **${formatGrokCoin(user.bank_balance)}** *(banque)*\n${user.job ? `${config.economy.jobs[user.job].emoji} **${user.job}**` : `${SYMBOLS.BRIEFCASE} *Pas de métier*`}`,
        inline: true
      },
      {
        name: `${SYMBOLS.BITGROK} Marché Crypto`,
        value: `**${formatGrokCoin(cryptoPrice)}** /BitGrok\n${cryptoPrice > 50000 ? SYMBOLS.CHART_UP : SYMBOLS.CHART_DOWN} ${cryptoPrice > 50000 ? 'Tendance haussière' : 'Tendance baissière'}\n${(user.crypto_balance || 0) > 0 ? `Vos BTG: ${formatBitGrok(user.crypto_balance)}` : '*Aucun BitGrok*'}`,
        inline: true
      },
      {
        name: `${SYMBOLS.CITY} Économie Globale`,
        value: `${SYMBOLS.USERS} **${totalUsers.toLocaleString()}** citoyens\n${SYMBOLS.GROKCOIN} **${formatGrokCoin(totalCirculation)}** en circulation\n${SYMBOLS.CHART_UP} **${formatGrokCoin(avgWealth)}** patrimoine moyen`,
        inline: true
      }
    );

  // Événement en cours
  if (currentEvent) {
    const timeLeft = Math.floor((currentEvent.endsAt - Date.now()) / 3600000);
    embed.addFields({
      name: `${SYMBOLS.FIRE} Événement en Cours`,
      value: `**${currentEvent.name}**\n*Se termine dans ${timeLeft}h*\n${currentEvent.description.split('\n')[0]}`,
      inline: false
    });
  } else {
    embed.addFields({
      name: `${SYMBOLS.SUCCESS} Situation Stable`,
      value: `Aucun événement majeur en cours\n*Les marchés évoluent normalement*`,
      inline: false
    });
  }

  embed.setImage('https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200&h=300')
    .setFooter({ text: '💎 GrokCity • Dashboard en temps réel', iconURL: 'https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg?auto=compress&cs=tinysrgb&w=32&h=32' })
    .setTimestamp();

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('dash_profile')
        .setLabel('Mon Profil')
        .setStyle(ButtonStyle.Primary)
        .setEmoji(SYMBOLS.WALLET),
      new ButtonBuilder()
        .setCustomId('dash_work')
        .setLabel('Travailler')
        .setStyle(ButtonStyle.Success)
        .setEmoji(SYMBOLS.BRIEFCASE),
      new ButtonBuilder()
        .setCustomId('dash_bank')
        .setLabel('Banque')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(SYMBOLS.BANK),
      new ButtonBuilder()
        .setCustomId('dash_crypto')
        .setLabel('BitGrok')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(SYMBOLS.BITGROK)
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('dash_casino')
        .setLabel('Casino VIP')
        .setStyle(ButtonStyle.Danger)
        .setEmoji(SYMBOLS.CASINO),
      new ButtonBuilder()
        .setCustomId('dash_immo')
        .setLabel('Immobilier')
        .setStyle(ButtonStyle.Success)
        .setEmoji(SYMBOLS.HOUSE),
      new ButtonBuilder()
        .setCustomId('dash_guild')
        .setLabel('Guildes')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏛️'),
      new ButtonBuilder()
        .setCustomId('dash_help')
        .setLabel('Aide')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❓')
    );

  const response = await interaction.reply({ embeds: [embed], components: [row1, row2] });
  
  // Collecteur pour les boutons
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000 // 5 minutes
  });

  collector.on('collect', async i => {
    if (i.user.id !== uid) {
      return i.reply({ content: 'Ce dashboard n\'est pas pour vous !', ephemeral: true });
    }

    const action = i.customId.split('_')[1];
    let commandName = '';
    
    switch (action) {
      case 'profile': commandName = 'profil'; break;
      case 'work': commandName = 'job'; break;
      case 'bank': commandName = 'banque'; break;
      case 'crypto': commandName = 'crypto'; break;
      case 'casino': commandName = 'casino'; break;
      case 'immo': commandName = 'immo'; break;
      case 'guild': commandName = 'guild'; break;
      case 'help': commandName = 'aide'; break;
    }

    await i.reply({ content: `🚀 Utilisez la commande \`/${commandName}\` pour accéder à cette section !`, ephemeral: true });
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}