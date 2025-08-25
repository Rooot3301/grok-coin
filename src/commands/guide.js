import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

/**
 * Commande /guide : tutoriel interactif en plusieurs pages pour présenter GrokCoin.
 * Le joueur peut naviguer avec des boutons ◀ ▶ et terminer avec un bouton "Commencer".
 */
export const data = new SlashCommandBuilder()
  .setName('guide')
  .setDescription('Affiche le guide interactif pour découvrir GrokCoin');

export async function execute(interaction, db, config) {
  // Définir les différentes pages du guide sous forme d'embeds
  const pages = [];
  // Page 0 : monnaie
  pages.push(new EmbedBuilder()
    .setTitle('💠 Bienvenue dans le monde de GrokCoin')
    .setColor(0x2196f3)
    .setDescription('Le **GKC** est la monnaie de CopaingCity. Vous commencez avec un bonus de bienvenue et pouvez en gagner via diverses activités : travail, investissements, casino et immobilier.\n\nChaque GKC vaut une unité virtuelle – gardez un œil sur votre solde !'));
  // Page 1 : travail / revenu
  pages.push(new EmbedBuilder()
    .setTitle('👷 Travail et revenus')
    .setColor(0x4caf50)
    .setDescription('Choisissez un métier parmi Banquier, Médecin, Commerçant, Mineur ou Policier via `/job`.\nChaque "shift" vous rapporte un salaire fixe. Vous pouvez réaliser jusqu’à trois shifts par jour, avec un cooldown de 30 minutes.\n\nLes événements du moment peuvent influencer votre rémunération (ex. Pandémie → +20 % pour les Médecins).'));
  // Page 2 : casino
  pages.push(new EmbedBuilder()
    .setTitle('🎰 Casino et jeux')
    .setColor(0xf44336)
    .setDescription('Envie de tenter votre chance ? Le casino propose :\n• **/coinflip** : pile ou face.\n• **/dice** : devinez si un chiffre sera inférieur à un seuil.\n• **/roulette** : misez sur un numéro, une couleur ou la parité.\n• **/pari** : paris sportifs fictifs.\n\nLes jeux sont provably fair et vos pertes sont plafonnées chaque jour.'));
  // Page 3 : immobilier
  pages.push(new EmbedBuilder()
    .setTitle('🏠 Immobilier et revenus passifs')
    .setColor(0x9c27b0)
    .setDescription('Investissez votre GKC dans des biens immobiliers via `/immo`.\nChaque bien (Studio, Boutique, Entrepôt, Immeuble) rapporte un loyer quotidien.\nVous pouvez consulter et encaisser vos loyers régulièrement.\n\nUne taxe foncière et des frais de maintenance s’appliquent chaque semaine.'));
  // Page 4 : événements et RP
  pages.push(new EmbedBuilder()
    .setTitle('🌍 Événements et Roleplay')
    .setColor(0xff9800)
    .setDescription('Des événements aléatoires (Bull run, Crash, Pandémie, Contrôles police, Pénurie) influencent l’économie et les métiers.\n\nParticipez également au RP : défiez vos amis via `/gunfight`, ajustez votre réputation avec vos actions et découvrez les quêtes à venir.\n\nPrêt à plonger ? Cliquez sur **Commencer** pour créer votre compte !'));

  let page = 0;
  const prevButton = new ButtonBuilder()
    .setCustomId('guide_prev')
    .setEmoji('◀')
    .setStyle(ButtonStyle.Secondary);
  const nextButton = new ButtonBuilder()
    .setCustomId('guide_next')
    .setEmoji('▶')
    .setStyle(ButtonStyle.Primary);
  const startButton = new ButtonBuilder()
    .setCustomId('guide_start')
    .setLabel('Commencer')
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
  const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 5 * 60 * 1000 });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Ce guide n’est pas pour vous.', ephemeral: true });
    }
    if (i.customId === 'guide_prev' && page > 0) {
      page--;
      await i.update({ embeds: [pages[page]], components: [getRow()] });
    } else if (i.customId === 'guide_next' && page < pages.length - 1) {
      page++;
      await i.update({ embeds: [pages[page]], components: [getRow()] });
    } else if (i.customId === 'guide_start') {
      // Fin du guide : inviter l’utilisateur à exécuter /start
      await i.update({ embeds: [pages[page]], components: [] });
      await interaction.followUp({ content: '🎉 Bienvenue ! Tapez maintenant `/start` pour créer votre compte et recevoir votre bonus de départ.', ephemeral: true });
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