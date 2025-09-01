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
      { name: '🚀 Démarrage', value: '`/start` - Commencer votre aventure\n`/guide` - Guide interactif complet\n`/dashboard` - Tableau de bord principal', inline: false },
      { name: '💰 Économie', value: '`/profil` - Votre profil complet\n`/job` - Choisir un métier et travailler\n`/banque` - Services bancaires\n`/payer` - Transférer des GrokCoins', inline: false },
      { name: '₿ Crypto & Trading', value: '`/crypto` - Marché BitGrok complet\n`/dex` - Échange GKC ↔ sGKC\n`/stake` - Staking de cryptomonnaies\n`/node` - Mining nodes BitGrok', inline: false },
      { name: '🎰 Casino VIP', value: '`/casino` - Menu principal\n`/blackjack` - Blackjack interactif\n`/poker` - Video Poker\n`/slots` - Machines à sous\n`/roulette` - Roulette européenne\n`/baccarat` - Baccarat authentique', inline: false },
      { name: '🏠 Immobilier', value: '`/immo` - Investissement immobilier\n`/immo liste` - Biens disponibles\n`/immo acheter` - Acheter un bien\n`/immo loyer` - Payer votre loyer', inline: false },
      { name: '🏛️ Guildes & PvP', value: '`/guild` - Système de guildes\n`/guild create` - Créer une guilde\n`/guild war` - Déclarer la guerre\n`/guild attack` - Attaquer une guilde', inline: false },
      { name: '📊 Informations', value: '`/event` - Événement économique actuel\n`/news` - Actualités GrokCity\n`/eco` - Statistiques économiques\n`/menu` - Navigation interactive', inline: false }
    )
    .setImage('https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1200&h=300')
    .setFooter({ text: 'GrokCity – La ville où l\'argent parle' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed], flags: 64 });
}