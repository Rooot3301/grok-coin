import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

/**
 * Commande /guide : tutoriel interactif en plusieurs pages pour présenter GrokCoin.
 * Le joueur peut naviguer avec des boutons ◀ ▶ et terminer avec un bouton "Commencer".
 */
export const data = new SlashCommandBuilder()
  .setName('guide')
  .setDescription('📖 Guide interactif pour découvrir GrokCoin');

export async function execute(interaction, db, config) {
  // Définir les différentes pages du guide sous forme d'embeds
  const pages = [];
  
  // Page 0 : Bienvenue
  pages.push(new EmbedBuilder()
    .setTitle('💎 Bienvenue dans GrokCity !')
    .setColor(0x00ff88)
    .setDescription('**La ville où l\'argent virtuel devient réalité !**\n\nVous venez de rejoindre la plus grande économie virtuelle Discord. Ici, vous pouvez :\n\n• 💼 **Travailler** dans 8 métiers prestigieux\n• ₿ **Trader** du BitGrok sur les marchés\n• 🏠 **Investir** dans l\'immobilier\n• 🎰 **Jouer** au casino sans limites\n• 🏛️ **Créer** votre empire avec les guildes')
    .setImage('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=300')
    .setFooter({ text: 'Page 1/5 • Votre aventure commence ici' }));

  // Page 1 : Économie
  pages.push(new EmbedBuilder()
    .setTitle('💰 Système Économique')
    .setColor(0x00ff88)
    .setDescription('**GrokCoin (Ǥ)** est votre monnaie principale !\n\n**Comment gagner de l\'argent :**\n• 💼 **Travaillez** : Choisissez parmi 8 métiers (PDG, Trader, Développeur...)\n• 🏠 **Investissez** : Achetez des biens immobiliers\n• ₿ **Tradez** : Spéculez sur le BitGrok\n• 🎰 **Tentez** votre chance au casino\n\n**Commandes essentielles :**\n`/start` - Commencer\n`/profil` - Votre situation\n`/job` - Choisir un métier\n`/banque` - Gérer vos finances')
    .addFields(
      { name: '💼 Métiers Populaires', value: '👔 PDG : 500 Ǥ/shift\n📈 Trader : 350 Ǥ/shift\n💻 Développeur : 280 Ǥ/shift', inline: true },
      { name: '🏦 Services Bancaires', value: '💰 Dépôts avec intérêts\n🏠 Prêts immobiliers\n📊 Gestion de patrimoine', inline: true }
    )
    .setFooter({ text: 'Page 2/5 • Construisez votre fortune' }));

  // Page 2 : Trading & Crypto
  pages.push(new EmbedBuilder()
    .setTitle('₿ Trading BitGrok')
    .setColor(0x00d4aa)
    .setDescription('**BitGrok** est la cryptomonnaie de GrokCity !\n\n**Fonctionnalités avancées :**\n• 📈 **Prix en temps réel** avec volatilité\n• 🔄 **Bull/Bear markets** automatiques\n• 💎 **Staking** pour des récompenses\n• ⚡ **Événements** qui impactent les prix\n\n**Commandes crypto :**\n`/crypto prix` - Prix actuel\n`/crypto acheter` - Acheter du BitGrok\n`/crypto vendre` - Vendre vos BitGrok\n`/crypto staking` - Staker pour des récompenses')
    .addFields(
      { name: '📊 Marché Dynamique', value: 'Prix volatil basé sur l\'offre/demande\nÉvénements économiques réalistes\nGraphiques sur 24h', inline: true },
      { name: '💎 Staking Rewards', value: 'Jusqu\'à 12% APY\nRécompenses quotidiennes\nPas de période de blocage', inline: true }
    )
    .setImage('https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?auto=compress&cs=tinysrgb&w=1200&h=300')
    .setFooter({ text: 'Page 3/5 • Devenez un crypto-millionnaire' }));

  // Page 3 : Casino & Jeux
  pages.push(new EmbedBuilder()
    .setTitle('🎰 Casino VIP')
    .setColor(0xe74c3c)
    .setDescription('**Le casino le plus avancé de Discord !**\n\n**Jeux disponibles :**\n🃏 **Blackjack** - Interactif avec boutons\n🎰 **Slots** - Machines à sous premium\n🎴 **Baccarat** - Jeu authentique\n🃏 **Poker** - Video Poker professionnel\n🎡 **Roulette** - Européenne classique\n\n**Plus de limites !** Misez autant que vous voulez !')
    .addFields(
      { name: '💎 Système VIP', value: '🥉 Bronze : +2% gains\n🥈 Silver : +5% gains\n🥇 Gold : +8% gains\n💎 Diamond : +12% gains', inline: true },
      { name: '🎯 Jeux Populaires', value: '🃏 Blackjack interactif\n🎰 Slots avec 5 lignes\n🎴 Baccarat authentique', inline: true }
    )
    .setImage('https://images.pexels.com/photos/1871508/pexels-photo-1871508.jpeg?auto=compress&cs=tinysrgb&w=1200&h=300')
    .setFooter({ text: 'Page 4/5 • Tentez votre chance' }));

  // Page 4 : Guildes & PvP
  pages.push(new EmbedBuilder()
    .setTitle('🏛️ Guildes & Alliances')
    .setColor(0xf1c40f)
    .setDescription('**Créez votre empire avec les guildes !**\n\n**Fonctionnalités PvP :**\n⚔️ **Guerres** entre guildes\n🏴‍☠️ **Attaques** et pillages\n🛡️ **Défenses** stratégiques\n🕵️ **Espionnage** et sabotage\n🤝 **Alliances** diplomatiques\n\n**Commandes guildes :**\n`/guild create` - Créer une guilde\n`/guild war` - Déclarer la guerre\n`/guild attack` - Lancer une attaque')
    .addFields(
      { name: '⚔️ Combat Tactique', value: 'Raids économiques\nVol de trésor\nSabotage d\'infrastructures', inline: true },
      { name: '🏛️ Gestion', value: 'Trésor commun\nHiérarchie (Leader/Officier)\nSystème d\'expérience', inline: true }
    )
    .setImage('https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200&h=300')
    .setFooter({ text: 'Page 5/5 • Dominez GrokCity' }));

  let page = 0;
  const prevButton = new ButtonBuilder()
    .setCustomId('guide_prev')
    .setLabel('Précédent')
    .setStyle(ButtonStyle.Secondary);
  const nextButton = new ButtonBuilder()
    .setCustomId('guide_next')
    .setLabel('Suivant')
    .setStyle(ButtonStyle.Primary);
  const startButton = new ButtonBuilder()
    .setCustomId('guide_start')
    .setLabel('Commencer l\'aventure !')
    .setStyle(ButtonStyle.Success);

  // Fonction pour mettre à jour les boutons selon la page actuelle
  function getRow() {
    return new ActionRowBuilder().addComponents(
      prevButton.setDisabled(page === 0),
      nextButton.setDisabled(page === pages.length - 1),
      startButton.setDisabled(page !== pages.length - 1)
    );
  }

  await interaction.reply({ embeds: [pages[page]], components: [getRow()] });
  const message = await interaction.fetchReply();
  const collector = message.createMessageComponentCollector({ 
    componentType: ComponentType.Button, 
    time: 5 * 60 * 1000 
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Ce guide n\'est pas pour vous.', flags: 64 });
    }
    
    if (i.customId === 'guide_prev' && page > 0) {
      page--;
      await i.update({ embeds: [pages[page]], components: [getRow()] });
    } else if (i.customId === 'guide_next' && page < pages.length - 1) {
      page++;
      await i.update({ embeds: [pages[page]], components: [getRow()] });
    } else if (i.customId === 'guide_start') {
      // Fin du guide : inviter l'utilisateur à exécuter /start
      const finalEmbed = new EmbedBuilder()
        .setTitle('🚀 Prêt à commencer ?')
        .setColor(0x00ff88)
        .setDescription('**Félicitations !** Vous connaissez maintenant les bases de GrokCity.\n\n**Prochaines étapes :**\n1️⃣ Tapez `/start` pour créer votre compte\n2️⃣ Utilisez `/dashboard` pour votre tableau de bord\n3️⃣ Choisissez un métier avec `/job`\n4️⃣ Explorez avec `/menu`\n\n**Bienvenue dans votre nouvelle vie virtuelle !**')
        .setImage('https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1200&h=300')
        .setFooter({ text: '🎉 Votre aventure commence maintenant !' })
        .setTimestamp();
      
      await i.update({ embeds: [finalEmbed], components: [] });
      collector.stop('started');
    } else {
      i.deferUpdate();
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason !== 'started') {
      // Désactiver les boutons après expiration
      message.edit({ components: [] }).catch(() => {});
    }
  });
}