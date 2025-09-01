import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';
import { getEvent } from '../events.js';

export const data = new SlashCommandBuilder()
  .setName('gunfight')
  .setDescription('Défier un joueur dans un duel rapide (Gunfight)')
  .addUserOption(opt => opt.setName('cible').setDescription('Joueur à défier').setRequired(true))
  .addNumberOption(opt => opt.setName('mise').setDescription('Mise (GKC)').setRequired(true));

export async function execute(interaction, db, config) {
  const challengerId = interaction.user.id;
  const targetUser = interaction.options.getUser('cible');
  const stakeAmount = interaction.options.getNumber('mise');
  const stake = toCents(stakeAmount);
  if (targetUser.bot || targetUser.id === challengerId) {
    return interaction.reply({ content: 'Vous devez choisir un autre joueur réel.', ephermal: true });
  }
  const challenger = db.getUser(challengerId);
  const opponent = db.getUser(targetUser.id);
  if (stake <= 0) return interaction.reply({ content: 'Mise invalide.', ephermal: true });
  if (challenger.balance < stake || opponent.balance < stake) {
    return interaction.reply({ content: 'L\'un des joueurs n\'a pas assez de GKC pour cette mise.', ephermal: true });
  }
  // Check daily loss cap for both players
  const event = getEvent();
  // No loss cap - players can bet freely
  // Deduct stake from both
  db.adjustBalance(challengerId, -stake);
  db.adjustBalance(targetUser.id, -stake);
  // Determine winner randomly
  const winnerId = Math.random() < 0.5 ? challengerId : targetUser.id;
  const loserId = winnerId === challengerId ? targetUser.id : challengerId;
  // Payout: sum minus fee
  const feePct = config.casino.fee_pct || 0.01;
  const totalStake = stake * 2;
  const payout = Math.floor(totalStake * (1 - feePct));
  db.adjustBalance(winnerId, payout);
  // Update daily loss for loser
  // No daily loss tracking needed
  const embed = new EmbedBuilder()
    .setTitle('Gunfight')
    .setColor(0xf44336)
    .setDescription(`💥 ${interaction.user.username} a défié ${targetUser.username} pour **${formatCents(stake)} GKC** chacun.
Victoire de **${winnerId === challengerId ? interaction.user.username : targetUser.username}** !
Gain : ${formatCents(payout - stake)} GKC.`)
    .addFields(
      { name: `Solde de ${interaction.user.username}`, value: `${formatCents(db.getUser(challengerId).balance)} GKC`, inline: true },
      { name: `Solde de ${targetUser.username}`, value: `${formatCents(db.getUser(targetUser.id).balance)} GKC`, inline: true }
    );
  await interaction.reply({ embeds: [embed] });
}