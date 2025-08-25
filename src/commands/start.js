import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatCents } from '../utils/money.js';

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
    .setTitle('Bienvenue sur GrokCoin !')
    .setColor(0x1e88e5)
    .setDescription(`👋 Bienvenue **${interaction.user.username}** !\n\nVous avez été crédité(e) de **${starting} GKC** pour commencer votre aventure.\nChoisissez un métier avec **/job choisir**, travaillez avec **/job shift** et découvrez le casino, la crypto et l'immobilier !`)
    .addFields(
      { name: 'Solde initial', value: `${formatCents(user.balance)} GKC`, inline: true },
      { name: 'Commandes utiles', value: '`/profil` · `/job` · `/banque` · `/casino` · `/immo` · `/dex` · `/stake` · `/node` · `/gunfight`', inline: false }
    )
    .setFooter({ text: 'Amusez-vous et jouez de manière responsable !' });
  await interaction.reply({ embeds: [embed] });
}