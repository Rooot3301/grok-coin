import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';
import { getEvent } from '../events.js';

export const data = new SlashCommandBuilder()
  .setName('coinflip')
  .setDescription('Pariez sur Pile ou Face')
  .addNumberOption(opt => opt.setName('mise').setDescription('Montant à miser (GKC)').setRequired(true))
  .addStringOption(opt => opt.setName('choix').setDescription('Pile ou Face').setRequired(true).addChoices(
    { name: 'Pile', value: 'Pile' },
    { name: 'Face', value: 'Face' }
  ));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const amount = interaction.options.getNumber('mise');
  const guess = interaction.options.getString('choix');
  const stake = toCents(amount);
  if (stake <= 0) return interaction.reply({ content: 'Mise invalide.', ephemeral: true });
  if (user.balance < stake) return interaction.reply({ content: 'Solde insuffisant.', ephemeral: true });
  // Check daily loss cap
  const event = getEvent();
  let lossCap = config.casino.daily_loss_cap * 100;
  if (event.effects && event.effects.casinoLossCapMultiplier) {
    lossCap = Math.floor(lossCap * event.effects.casinoLossCapMultiplier);
  }
  const currentLoss = db.getDailyLoss(uid);
  if (currentLoss + stake > lossCap) {
    return interaction.reply({ content: `Vous avez atteint votre plafond de pertes quotidien (${formatCents(lossCap)} GKC). Revenez demain !`, ephemeral: true });
  }
  // Deduct stake
  db.adjustBalance(uid, -stake);
  // Generate random result
  const outcome = Math.random() < 0.5 ? 'Pile' : 'Face';
  let message;
  if (guess === outcome) {
    // Win: pays double minus fee
    const feePct = config.casino.fee_pct || 0.01;
    const payout = Math.floor(stake * (2 - feePct));
    db.adjustBalance(uid, payout);
    message = `🎉 La pièce retombe sur **${outcome}** ! Vous gagnez **${formatCents(payout - stake)} GKC** (payout ${formatCents(payout)}).`;
  } else {
    // Loss: stake is lost
    db.addDailyLoss(uid, stake);
    message = `😢 La pièce retombe sur **${outcome}**. Vous perdez **${formatCents(stake)} GKC**.`;
  }
  const embed = new EmbedBuilder()
    .setTitle('Coinflip')
    .setColor(0xe91e63)
    .setDescription(message)
    .addFields({ name: 'Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true });
  await interaction.reply({ embeds: [embed] });
}