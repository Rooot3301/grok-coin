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
      return i.reply({ content: 'Ce menu n\'est pas pour vous !', flags: 64 });
    }

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
        
      case 'crypto':
        responseEmbed = new EmbedBuilder()
          .setTitle(`₿ Trading BitGrok`)
          .setColor(COLORS.CRYPTO_GREEN)
          .setDescription('**Marché des cryptomonnaies :**')
          .addFields(
            { name: '`/crypto prix`', value: 'Prix actuel et graphiques', inline: true },
            { name: '`/crypto acheter`', value: 'Acheter du BitGrok', inline: true },
            { name: '`/crypto vendre`', value: 'Vendre vos BitGrok', inline: true },
            { name: '`/crypto staking`', value: 'Staker pour des récompenses', inline: true },
            { name: '`/crypto portefeuille`', value: 'Votre portfolio crypto', inline: true },
            { name: '`/dex`', value: 'Échange GKC ↔ sGKC', inline: true }
          );
        break;
        
      case 'casino':
        responseEmbed = new EmbedBuilder()
          .setTitle(`🎰 Casino VIP`)
          .setColor(COLORS.CASINO)
          .setDescription('**Jeux disponibles :**')
          .addFields(
            { name: '`/blackjack`', value: 'Blackjack interactif', inline: true },
            { name: '`/poker`', value: 'Video Poker Jacks or Better', inline: true },
            { name: '`/slots`', value: 'Machines à sous premium', inline: true },
            { name: '`/baccarat`', value: 'Baccarat classique', inline: true },
            { name: '`/roulette`', value: 'Roulette européenne', inline: true },
            { name: '`/casino`', value: 'Menu principal du casino', inline: true }
          );
        break;
        
      case 'immo':
        responseEmbed = new EmbedBuilder()
          .setTitle(`🏠 Immobilier`)
          .setColor(COLORS.IMMO)
          .setDescription('**Investissement immobilier :**')
          .addFields(
            { name: '`/immo liste`', value: 'Biens disponibles à l\'achat', inline: true },
            { name: '`/immo acheter`', value: 'Acheter un bien immobilier', inline: true },
            { name: '`/immo mes_biens`', value: 'Vos propriétés et revenus', inline: true },
            { name: '`/immo loyer`', value: 'Payer votre loyer', inline: true },
            { name: '`/immo statut`', value: 'Statut de votre logement', inline: true }
          );
        break;
        
      case 'guild':
        responseEmbed = new EmbedBuilder()
          .setTitle(`🏛️ Guildes & Alliances`)
          .setColor(COLORS.GOLD)
          .setDescription('**Système de guildes :**')
          .addFields(
            { name: '`/guild create`', value: 'Créer une nouvelle guilde', inline: true },
            { name: '`/guild join`', value: 'Rejoindre une guilde', inline: true },
            { name: '`/guild info`', value: 'Informations sur une guilde', inline: true },
            { name: '`/guild treasury`', value: 'Gérer le trésor de guilde', inline: true },
            { name: '`/guild war`', value: 'Déclarer la guerre', inline: true },
            { name: '`/guild alliance`', value: 'Proposer une alliance', inline: true }
          );
        break;
        
      case 'events':
        responseEmbed = new EmbedBuilder()
          .setTitle(`🔥 Événements & News`)
          .setColor(COLORS.WARNING)
          .setDescription('**Actualités économiques :**')
          .addFields(
            { name: '`/event`', value: 'Événement économique en cours', inline: true },
            { name: '`/news voir`', value: 'Actualités de GrokCity', inline: true },
            { name: '`/eco stats`', value: 'Statistiques économiques', inline: true }
          );
        break;
        
      case 'help':
        responseEmbed = new EmbedBuilder()
          .setTitle(`❓ Aide & Guides`)
          .setColor(COLORS.INFO)
          .setDescription('**Support et tutoriels :**')
          .addFields(
            { name: '`/aide`', value: 'Liste complète des commandes', inline: true },
            { name: '`/guide`', value: 'Guide interactif pour débutants', inline: true },
            { name: '`/menu`', value: 'Ce menu interactif', inline: true }
          );
        break;
    }

    await i.update({ embeds: [responseEmbed], components: [row] });
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}