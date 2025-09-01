import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { SYMBOLS, COLORS } from '../utils/symbols.js';

export const data = new SlashCommandBuilder()
  .setName('menu')
  .setDescription('🎯 Menu principal interactif de GrokCity');

export async function execute(interaction, db, config) {
  const embed = new EmbedBuilder()
    .setTitle(`💎 Menu Principal GrokCity`)
    .setColor(COLORS.INFO)
    .setDescription(`**Choisissez une catégorie dans le menu déroulant ci-dessous**\n\nNaviguez facilement dans toutes les fonctionnalités de GrokCity !`)
    .addFields(
      { name: `🚀 Nouveau ?`, value: `Commencez par \`/start\` puis \`/dashboard\``, inline: true },
      { name: `ℹ️ Aide`, value: `Utilisez \`/aide\` pour les commandes`, inline: true },
      { name: `🔥 Événements`, value: `Consultez \`/event\` pour l'actualité`, inline: true }
    )
    .setImage('https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1200&h=300')
    .setFooter({ text: '💎 GrokCity • Menu Interactif' })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('main_menu')
    .setPlaceholder('🎯 Choisissez une catégorie...')
    .addOptions([
      {
        label: 'Économie & Finances',
        description: 'Profil, banque, travail, paiements',
        value: 'economy'
      },
      {
        label: 'Trading BitGrok',
        description: 'Crypto, staking, graphiques, DeFi',
        value: 'crypto'
      },
      {
        label: 'Casino VIP',
        description: 'Blackjack, poker, slots, roulette',
        value: 'casino'
      },
      {
        label: 'Immobilier',
        description: 'Acheter, gérer, revenus passifs',
        value: 'immo'
      },
      {
        label: 'Guildes & Alliances',
        description: 'Créer, rejoindre, guerres, diplomatie',
        value: 'guild'
      },
      {
        label: 'Événements & News',
        description: 'Actualités, événements économiques',
        value: 'events'
      },
      {
        label: 'Aide & Guides',
        description: 'Tutoriels, commandes, support',
        value: 'help'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  
  const response = await interaction.reply({ embeds: [embed], components: [row] });
  
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 300000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Ce menu n\'est pas pour vous !', ephemeral: true });
    }

    try {
      const category = i.values[0];
      let responseEmbed;
      switch (category) {
        case 'economy':
          responseEmbed = new EmbedBuilder()
            .setTitle(`💰 Économie & Finances`)
            .setColor(COLORS.SUCCESS)
            .setDescription('**Commandes disponibles :**')
            .addFields(
              { name: '`/profil`', value: 'Votre profil complet et patrimoine', inline: true },
              { name: '`/banque`', value: 'Dépôts, retraits, prêts, intérêts', inline: true },
              { name: '`/job`', value: 'Choisir un métier et travailler', inline: true },
              { name: '`/payer`', value: 'Transférer des GrokCoins', inline: true },
              { name: '`/dashboard`', value: 'Tableau de bord principal', inline: true },
              { name: '`/start`', value: 'Commencer votre aventure', inline: true }
            );
          break;
          
        case 'casino':
          responseEmbed = new EmbedBuilder()
            .setTitle(`🎰 Casino VIP`)
            .setColor(COLORS.CASINO)
            .setDescription('**Jeux disponibles :**')
            .addFields(
              { name: '`/slots`', value: 'Machines à sous premium', inline: true },
              { name: '`/casino`', value: 'Menu principal du casino', inline: true },
              { name: '`/test`', value: 'Tester le bot', inline: true }
            );
          break;
          
        default:
          responseEmbed = new EmbedBuilder()
            .setTitle(`🚧 En développement`)
            .setColor(COLORS.WARNING)
            .setDescription('Cette section sera bientôt disponible !');
      }

      await i.update({ embeds: [responseEmbed], components: [row] });
    } catch (error) {
      console.error('Erreur interaction menu:', error);
    }
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}