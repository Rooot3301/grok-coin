import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'fs';

/**
 * Commande principale du casino. Elle affiche un menu d'aperçu des jeux disponibles et
 * inclut une image d'ambiance pour immerger les joueurs. Cette commande ne
 * gère pas directement les jeux, elle redirige vers les autres commandes
 * spécifiques telles que /coinflip, /dice, /roulette, /bj et /pari.
 */
export const data = new SlashCommandBuilder()
  .setName('casino')
  .setDescription('Afficher le menu du casino avec les jeux disponibles');

export async function execute(interaction, db, config) {
  // Construire l'embed de présentation du casino
  const embed = new EmbedBuilder()
    .setTitle('🎰 Bienvenue au GrokCasino')
    .setColor(COLORS.CASINO)
    .setDescription(
      'Choisissez votre jeu parmi les options ci‑dessous. Utilisez les commandes correspondantes pour commencer à jouer.\n\n' +
      '**/bj** → Blackjack interactif avec boutons\n' +
      '**/coinflip** → Pile ou face simple\n' +
      '**/dice** → Pariez sur un nombre inférieur à un seuil\n' +
      '**/roulette** → Mise sur numéro, couleur ou parité\n' +
      '**/pari** → Paris sportifs fictifs\n\n' +
      'N’oubliez pas : les jeux sont **provably fair** et les pertes sont plafonnées par jour.'
    )
    .addFields(
      { name: '💰 Limites de mises', value: `Plafond quotidien des pertes : **${config.casino.daily_loss_cap_multiplier * 100}% de votre solde**`, inline: false },
      { name: '💡 Astuce', value: 'Jouez régulièrement pour débloquer les rangs VIP et leurs bonus !', inline: false }
    );
  
  embed.setFooter({ text: '🎰 GrokCasino • Jeu responsable' })
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