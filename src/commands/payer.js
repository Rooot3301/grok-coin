import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';

/**
 * Commande /payer : transfère des GKC d’un joueur à un autre.
 * Vérifie le solde de l’expéditeur et journalise la transaction dans le salon de logs si configuré.
 */
export const data = new SlashCommandBuilder()
  .setName('payer')
  .setDescription('Transférer des GKC à un autre joueur')
  .addUserOption(opt => opt.setName('membre').setDescription('Joueur destinataire').setRequired(true))
  .addNumberOption(opt => opt.setName('montant').setDescription('Montant en GKC (ex. 50)').setRequired(true));

export async function execute(interaction, db, config) {
  const senderId = interaction.user.id;
  const targetUser = interaction.options.getUser('membre', true);
  if (targetUser.id === senderId) {
    return interaction.reply({ content: 'Vous ne pouvez pas vous payer vous‑même.', ephemeral: true });
  }
  const amount = interaction.options.getNumber('montant', true);
  if (amount <= 0) {
    return interaction.reply({ content: 'Montant invalide.', ephermal: true });
  }
  const cents = toCents(amount);
  const sender = db.getUser(senderId);
  if (sender.balance < cents) {
    return interaction.reply({ content: 'Solde insuffisant pour effectuer ce paiement.', ephermal: true });
  }
  // Effectuer le transfert
  db.adjustBalance(senderId, -cents);
  db.adjustBalance(targetUser.id, cents);

  const embed = new EmbedBuilder()
    .setTitle('💱 Paiement effectué')
    .setColor(0x03a9f4)
    .setDescription(`<@${senderId}> a envoyé **${formatCents(cents)} GKC** à <@${targetUser.id}>.`)
    .addFields(
      { name: 'Solde restant', value: `${formatCents(db.getUser(senderId).balance)} GKC`, inline: true },
      { name: 'Solde du destinataire', value: `${formatCents(db.getUser(targetUser.id).balance)} GKC`, inline: true }
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });

  // Journaliser la transaction si un salon de logs est configuré
  try {
    const logChannelId = db.getSetting('log_channel');
    if (logChannelId) {
      const channel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Erreur lors de l’écriture du log de paiement :', err);
  }
}