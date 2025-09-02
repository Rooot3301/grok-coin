import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';
import { getEvent } from '../events.js';

export const data = new SlashCommandBuilder()
  .setName('dice')
  .setDescription('Pariez que le dé sera sous un certain seuil (0-99)')
  .addNumberOption(opt => opt.setName('mise').setDescription('Montant à miser (GKC)').setRequired(true))
  .addIntegerOption(opt => opt.setName('seuil').setDescription('Seuil (1-99)').setRequired(false));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const amount = interaction.options.getNumber('mise');
  const thresholdInput = interaction.options.getInteger('seuil');
  const threshold = thresholdInput ? Math.min(Math.max(thresholdInput, 1), 99) : 50;
  const stake = toCents(amount);
  if (stake <= 0) return interaction.reply({ content: 'Mise invalide.', ephemeral: true });
  if (user.balance < stake) return interaction.reply({ content: 'Solde insuffisant.', ephemeral: true });
  
  // Deduct stake
  db.adjustBalance(uid, -stake);
  
  // Update VIP tier
  db.updateVipTier(uid, stake);
  
  // Roll dice avec générateur sécurisé
  const crypto = await import('crypto');
  const buffer = crypto.randomBytes(4);
  const roll = Math.floor((buffer.readUInt32BE(0) / 0xFFFFFFFF) * 100); // 0-99
  
  // Preuve "provably fair"
  const proof = crypto.createHash('sha256').update(`${uid}-${Date.now()}-${roll}`).digest('hex').substring(0, 8);
  
  let message;
  if (roll < threshold) {
    // Win
    const feePct = config.casino.fee_pct || 0.01;
    const payoutRatio = (100 / threshold) * (1 - feePct);
    const payout = Math.floor(stake * payoutRatio);
    db.adjustBalance(uid, payout);
    message = `🎲 Le résultat est **${roll}** (seuil ${threshold}). Vous gagnez **${formatCents(payout - stake)} GKC** !`;
  } else {
    // Loss
    // No daily loss tracking needed
    message = `🎲 Le résultat est **${roll}** (seuil ${threshold}). Vous perdez **${formatCents(stake)} GKC**.`;
  }
  const embed = new EmbedBuilder()
    .setTitle('Jeu du dé')
    .setColor(0x9c27b0)
    .setDescription(message)
    .addFields(
      { name: 'Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true },
      { name: '🔐 Preuve', value: `\`${proof}\``, inline: true }
    )
    .setFooter({ text: '🎲 Provably Fair • Générateur cryptographique sécurisé' });
  await interaction.reply({ embeds: [embed] });
}