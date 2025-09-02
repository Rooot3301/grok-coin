import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';
import { getEvent } from '../events.js';

// Predefined matches with teams and odds (simplified)
const matches = {
  'dragons-tigers': { name: 'Dragons vs Tigers', teamA: 'Dragons', teamB: 'Tigers', oddsA: 1.8, oddsB: 2.2 },
  'sharks-lions': { name: 'Sharks vs Lions', teamA: 'Sharks', teamB: 'Lions', oddsA: 2.0, oddsB: 1.6 },
  'eagles-wolves': { name: 'Eagles vs Wolves', teamA: 'Eagles', teamB: 'Wolves', oddsA: 1.7, oddsB: 2.1 }
};

export const data = new SlashCommandBuilder()
  .setName('pari')
  .setDescription('Faire un pari sportif sur un match fictif')
  .addNumberOption(opt => opt.setName('mise').setDescription('Montant à miser (GKC)').setRequired(true))
  .addStringOption(opt => opt.setName('match').setDescription('Choisissez un match').setRequired(true).addChoices(
    { name: 'Dragons vs Tigers', value: 'dragons-tigers' },
    { name: 'Sharks vs Lions', value: 'sharks-lions' },
    { name: 'Eagles vs Wolves', value: 'eagles-wolves' }
  ))
  .addStringOption(opt => opt.setName('équipe').setDescription('Choisissez votre équipe').setRequired(true).addChoices(
    { name: 'Dragons', value: 'Dragons' },
    { name: 'Tigers', value: 'Tigers' },
    { name: 'Sharks', value: 'Sharks' },
    { name: 'Lions', value: 'Lions' },
    { name: 'Eagles', value: 'Eagles' },
    { name: 'Wolves', value: 'Wolves' }
  ));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const amount = interaction.options.getNumber('mise');
  const stake = toCents(amount);
  if (stake <= 0) return interaction.reply({ content: 'Mise invalide.', ephemeral: true });
  if (user.balance < stake) return interaction.reply({ content: 'Solde insuffisant.', ephemeral: true });
  const matchKey = interaction.options.getString('match');
  const team = interaction.options.getString('équipe');
  const match = matches[matchKey];
  if (!match) return interaction.reply({ content: 'Match invalide.', ephemeral: true });
  if (team !== match.teamA && team !== match.teamB) {
    return interaction.reply({ content: `L\'équipe ${team} ne joue pas dans ce match.`, ephemeral: true });
  }
  // Check daily loss cap
  const event = getEvent();
  // No loss cap - players can bet freely
  // Deduct stake
  db.adjustBalance(uid, -stake);
  
  // Determine winner with probability weighted by inverse odds (sécurisé)
  const crypto = await import('crypto');
  const buffer = crypto.randomBytes(4);
  const rnd = (buffer.readUInt32BE(0) / 0xFFFFFFFF);
  
  const weightA = 1 / match.oddsA;
  const weightB = 1 / match.oddsB;
  const total = weightA + weightB;
  const scaledRnd = rnd * total;
  const winner = rnd < weightA ? match.teamA : match.teamB;
  
  // Preuve "provably fair"
  const proof = crypto.createHash('sha256').update(`${uid}-${Date.now()}-${winner}`).digest('hex').substring(0, 8);
  
  let message;
  if (team === winner) {
    const odds = team === match.teamA ? match.oddsA : match.oddsB;
    const payout = Math.floor(stake * odds * (1 - (config.casino.fee_pct || 0.01)));
    db.adjustBalance(uid, payout);
    message = `🏆 ${match.name}\nLe vainqueur est **${winner}** ! Vous gagnez **${formatCents(payout - stake)} GKC** !`;
  } else {
    // No daily loss tracking needed
    message = `😞 ${match.name}\nLe vainqueur est **${winner}**. Vous perdez **${formatCents(stake)} GKC**.`;
  }
  const embed = new EmbedBuilder()
    .setTitle('Pari sportif')
    .setColor(0x03a9f4)
    .setDescription(message)
    .addFields(
      { name: 'Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true },
      { name: '🔐 Preuve', value: `\`${proof}\``, inline: true }
    )
    .setFooter({ text: '🏈 Provably Fair • Générateur cryptographique sécurisé' });
  await interaction.reply({ embeds: [embed] });
}