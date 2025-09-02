import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { formatGrokCoin, formatBitGrok, SYMBOLS, COLORS } from '../utils/symbols.js';
import { getCurrentCryptoPrice, getEvent } from '../events.js';

export const data = new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('📊 Votre tableau de bord principal GrokCity');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = await db.getUser(uid);
  const cryptoPrice = getCurrentCryptoPrice();
  const currentEvent = getEvent();
  
  try {
    // Stats rapides avec l'API libsql correcte
    const totalUsersResult = await db.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult.rows[0]?.count || 0;
    const totalCirculation = await db.getTotalCirculation();
    const avgWealth = totalUsers > 0 ? Math.floor(totalCirculation / totalUsers) : 0;
    
    const embed = new EmbedBuilder()
      .setTitle(`💎 GrokCity Dashboard`)
      .setColor(COLORS.INFO)
      .setDescription(`**Bienvenue dans le centre de contrôle de votre empire !**`)
      .setThumbnail('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=128&h=128')
      .addFields(
        {
          name: `💰 Votre Situation`,
          value: `${formatGrokCoin(user.balance)} *(liquide)*\n🏦 ${formatGrokCoin(user.bank_balance)} *(banque)*\n${user.job ? `${config.economy.jobs[user.job]?.emoji || '💼'} **${user.job}**` : `💼 *Pas de métier*`}`,
          inline: true
        },
        {
          name: `₿ Marché Crypto`,
          value: `**${formatGrokCoin(cryptoPrice)}** /BitGrok\n${cryptoPrice > 50000 ? '📈' : '📉'} ${cryptoPrice > 50000 ? 'Tendance haussière' : 'Tendance baissière'}\n${(user.crypto_balance || 0) > 0 ? `Vos BTG: ${formatBitGrok(user.crypto_balance)}` : '*Aucun BitGrok*'}`,
          inline: true
        },
        {
          name: `🏙️ Économie Globale`,
          value: `👥 **${totalUsers.toLocaleString()}** citoyens\n${formatGrokCoin(totalCirculation)} en circulation\n📈 **${formatGrokCoin(avgWealth)}** patrimoine moyen`,
          inline: true
        }
      );

    // Événement en cours
    if (currentEvent) {
      const timeLeft = Math.max(1, Math.floor((currentEvent.endsAt - Date.now()) / 3600000));
      embed.addFields({
        name: `🔥 Événement en Cours`,
        value: `**${currentEvent.name}**\n*Se termine dans ${timeLeft}h*\n${currentEvent.description.split('\n')[0]}`,
        inline: false
      });
    } else {
      embed.addFields({
        name: `✅ Situation Stable`,
        value: `Aucun événement majeur en cours\n*Les marchés évoluent normalement*`,
        inline: false
      });
    }

    embed.setImage('https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200&h=300')
      .setFooter({ text: '💎 GrokCity • Dashboard en temps réel' })
      .setTimestamp();

    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('dash_profile')
          .setLabel('Mon Profil')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('dash_work')
          .setLabel('Travailler')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('dash_bank')
          .setLabel('Banque')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('dash_crypto')
          .setLabel('BitGrok')
          .setStyle(ButtonStyle.Secondary)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('dash_casino')
          .setLabel('Casino VIP')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('dash_immo')
          .setLabel('Immobilier')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('dash_guild')
          .setLabel('Guildes')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('dash_help')
          .setLabel('Aide')
          .setStyle(ButtonStyle.Secondary)
      );

    const response = await interaction.reply({ embeds: [embed], components: [row1, row2] });
    
    // Collecteur pour les boutons
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000,
      filter: i => i.user.id === uid
    });

    collector.on('collect', async i => {
      try {
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
        
        await i.reply({ 
          content: `🚀 Utilisez la commande \`/${commandName}\` pour accéder à cette section !`, 
          flags: 64 
        });
      } catch (error) {
        console.error('Erreur interaction dashboard:', error);
        try {
          await i.reply({ content: '❌ Erreur lors de l\'interaction.', flags: 64 });
        } catch (e) {
          console.error('Erreur followUp:', e);
        }
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
    
  } catch (error) {
    console.error('Erreur dashboard:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Erreur Dashboard')
      .setColor(COLORS.ERROR)
      .setDescription('Une erreur est survenue lors du chargement du dashboard.')
      .setTimestamp();
    
    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
  }
}