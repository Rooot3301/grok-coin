import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { toCentsString, formatCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('profil')
  .setDescription('Affiche votre profil GrokCoin (solde, job, réputation, biens, etc.)');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  // Update loan interest before showing
  db.updateLoanInterest(uid);
  const loan = db.getLoan(uid);
  const properties = db.getUserProperties(uid);

  const embed = new EmbedBuilder()
    .setTitle(`Profil GrokCoin de ${interaction.user.username}`)
    .setColor(0x00bcd4)
    .addFields(
      { name: 'Métier', value: user.job ? user.job : 'Aucun (choisissez-en un via /job)', inline: true },
      { name: 'Réputation', value: `${user.reputation || 0}`, inline: true }
    )
    .addFields(
      { name: 'Solde', value: `${formatCents(user.balance)} GKC`, inline: true },
      { name: 'Banque', value: `${formatCents(user.bank_balance)} GKC`, inline: true },
      { name: 'Shifts (aujourd\'hui)', value: `${user.shifts_count || 0}/${config.economy.job_max_shifts_per_day}`, inline: true }
    );

  if (loan) {
    embed.addFields({ name: 'Prêt', value: `Principal : ${formatCents(loan.principal)} GKC\nIntérêts : ${formatCents(loan.interest)} GKC`, inline: true });
  } else {
    embed.addFields({ name: 'Prêt', value: 'Aucun', inline: true });
  }
  if (properties.length > 0) {
    const props = properties.map(p => `${p.name} (loyer ${formatCents(p.rent)} GKC/j)`).join('\n');
    embed.addFields({ name: 'Biens immobiliers', value: props, inline: false });
  } else {
    embed.addFields({ name: 'Biens immobiliers', value: 'Aucun', inline: false });
  }
  embed.setTimestamp();
  await interaction.reply({ embeds: [embed] });
}