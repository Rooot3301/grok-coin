import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import { COLORS } from '../utils/symbols.js';

/**
 * Commande principale du casino. Elle affiche un menu d'aperçu des jeux disponibles et
 * inclut une image d'ambiance pour immerser les joueurs. Cette commande ne
 * gère pas directement les jeux, elle redirige vers les autres commandes
 * spécifiques telles que /coinflip, /dice, /roulette, /blackjack et /pari.
 */
export const data = new SlashCommandBuilder()
  .setName('casino')
  .setDescription('🎰 Afficher le menu du casino avec les jeux disponibles');

export async function execute(interaction, db, config) {
  const user = db.getUser(interaction.user.id);
  const vipTier = db.getVipTier(interaction.user.id);
  
  // Construire l'embed de présentation du casino
  const embed = new EmbedBuilder()
    .setTitle('🎰 Bienvenue au GrokCasino')
    .setColor(COLORS.CASINO)
    .setDescription(
      '**Choisissez votre jeu parmi les options ci-dessous !**\n\n' +
      '🃏 **/blackjack** → Blackjack interactif avec boutons\n' +
      '🎲 **/coinflip** → Pile ou face simple\n' +
      '🎯 **/dice** → Pariez sur un nombre inférieur à un seuil\n' +
      '🎡 **/roulette** → Mise sur numéro, couleur ou parité\n' +
      '🃏 **/poker** → Video Poker Jacks or Better\n' +
      '🎰 **/slots** → Machines à sous premium\n' +
      '🎴 **/baccarat** → Baccarat authentique\n' +
      '🏈 **/pari** → Paris sportifs fictifs\n\n' +
      '**Plus de plafonds de pertes - Jouez librement !**'
    )
    .addFields(
      { 
        name: '💎 Votre Statut VIP', 
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
  
  // Joindre l'image du casino pour améliorer l'esthétique
  try {
    const imageBuffer = fs.readFileSync(new URL('../assets/casino.png', import.meta.url));
    const file = new AttachmentBuilder(imageBuffer, { name: 'casino.png' });
    embed.setImage('attachment://casino.png');
    return interaction.reply({ embeds: [embed], files: [file] });
  } catch (err) {
    // Si l'image ne peut être lue (ex: fichier manquant), renvoyer sans fichier
    return interaction.reply({ embeds: [embed] });
  }
}