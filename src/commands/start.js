import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatGrokCoin, SYMBOLS, COLORS } from '../utils/symbols.js';

/**
 * Commande de démarrage : crée un compte pour l'utilisateur s'il n'existe pas et affiche un message de bienvenue.
 */
export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Démarrer votre aventure GrokCoin et obtenir votre bonus de départ');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  // getUser crée l'utilisateur s'il n'existe pas
  const user = db.getUser(uid);
  const starting = config.economy.starting_balance || 0;
  const embed = new EmbedBuilder()
    .setTitle(`${SYMBOLS.DIAMOND} Bienvenue dans GrokCity !`)
    .setColor(COLORS.SUCCESS)
    .setDescription(`${SYMBOLS.ROCKET} Bienvenue **${interaction.user.username}** dans l'économie virtuelle la plus avancée !\n\n${SYMBOLS.GROKCOIN} Vous commencez avec **${formatGrokCoin(user.balance)}** pour débuter votre empire financier.\n\n${SYMBOLS.INFO} Explorez les métiers prestigieux, investissez dans l'immobilier, tradez le BitGrok et tentez votre chance au casino !`)
    .addFields(
      { name: `${SYMBOLS.WALLET} Solde Initial`, value: formatGrokCoin(user.balance), inline: true },
      { name: `${SYMBOLS.BITGROK} BitGrok`, value: 'Tradez la crypto révolutionnaire', inline: true },
      { name: `${SYMBOLS.CASINO} Casino VIP`, value: 'Jeux immersifs et récompenses', inline: true },
      { name: `${SYMBOLS.SUCCESS} Commandes Essentielles`, value: '`/profil` • `/job` • `/crypto` • `/casino` • `/immo` • `/guild`', inline: false }
    )
    .setFooter({ text: 'GrokCity • Votre succès commence maintenant • Investissez intelligemment' })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}