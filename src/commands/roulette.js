import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import { toCents, formatCents } from '../utils/money.js';
import { getEvent } from '../events.js';

// European roulette wheel order and color assignment
const wheelSequence = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function getColor(number) {
  if (number === 0) return 'green';
  return redNumbers.has(number) ? 'red' : 'black';
}

export const data = new SlashCommandBuilder()
  .setName('roulette')
  .setDescription('Jouer à la roulette (mise sur numéro, couleur ou parité)')
  .addSubcommand(sub => sub.setName('numero').setDescription('Parier sur un numéro précis')
    .addNumberOption(opt => opt.setName('mise').setDescription('Montant en GKC').setRequired(true))
    .addIntegerOption(opt => opt.setName('numéro').setDescription('Numéro (0-36)').setRequired(true)))
  .addSubcommand(sub => sub.setName('couleur').setDescription('Parier sur une couleur (Rouge, Noir, Vert)')
    .addNumberOption(opt => opt.setName('mise').setDescription('Montant en GKC').setRequired(true))
    .addStringOption(opt => opt.setName('couleur').setDescription('Choisissez Rouge, Noir ou Vert').setRequired(true).addChoices(
      { name: 'Rouge', value: 'red' },
      { name: 'Noir', value: 'black' },
      { name: 'Vert', value: 'green' }
    )))
  .addSubcommand(sub => sub.setName('parite').setDescription('Parier sur Pair ou Impair')
    .addNumberOption(opt => opt.setName('mise').setDescription('Montant en GKC').setRequired(true))
    .addStringOption(opt => opt.setName('parite').setDescription('Pair ou Impair').setRequired(true).addChoices(
      { name: 'Pair', value: 'pair' },
      { name: 'Impair', value: 'impair' }
    )));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const sub = interaction.options.getSubcommand();
  const user = db.getUser(uid);
  const amount = interaction.options.getNumber('mise');
  const stake = toCents(amount);
  if (stake <= 0) return interaction.reply({ content: 'Mise invalide.', ephermal: true });
  if (user.balance < stake) return interaction.reply({ content: 'Solde insuffisant.', ephermal: true });
  const event = getEvent();
  let lossCap = config.casino.daily_loss_cap * 100;
  if (event.effects && event.effects.casinoLossCapMultiplier) {
    lossCap = Math.floor(lossCap * event.effects.casinoLossCapMultiplier);
  }
  const currentLoss = db.getDailyLoss(uid);
  if (currentLoss + stake > lossCap) {
    return interaction.reply({ content: `Plafond de pertes quotidien atteint (${formatCents(lossCap)} GKC). Revenez demain.`, ephermal: true });
  }
  // Deduct stake
  db.adjustBalance(uid, -stake);
  // Spin the wheel
  const outcomeIndex = Math.floor(Math.random() * wheelSequence.length);
  const outcomeNumber = wheelSequence[outcomeIndex];
  const outcomeColor = getColor(outcomeNumber);
  const outcomeParity = outcomeNumber === 0 ? 'none' : (outcomeNumber % 2 === 0 ? 'pair' : 'impair');
  let win = false;
  let payout = 0;
  const feePct = config.casino.fee_pct || 0.01;
  if (sub === 'numero') {
    const chosenNumber = interaction.options.getInteger('numéro');
    if (chosenNumber < 0 || chosenNumber > 36) {
      return interaction.reply({ content: 'Numéro invalide (0-36).', ephermal: true });
    }
    if (chosenNumber === outcomeNumber) {
      win = true;
      payout = Math.floor(stake * 36 * (1 - feePct));
    }
  } else if (sub === 'couleur') {
    const chosen = interaction.options.getString('couleur');
    if (chosen === outcomeColor) {
      win = true;
      payout = Math.floor(stake * 2 * (1 - feePct));
    }
  } else if (sub === 'parite') {
    const chosen = interaction.options.getString('parite');
    if (outcomeParity !== 'none' && chosen === outcomeParity) {
      win = true;
      payout = Math.floor(stake * 2 * (1 - feePct));
    }
  }
  let message;
  if (win) {
    db.adjustBalance(uid, payout);
    message = `🎡 La bille atterrit sur **${outcomeNumber}** (${outcomeColor === 'green' ? 'Vert' : outcomeColor === 'red' ? 'Rouge' : 'Noir'}). Vous gagnez **${formatCents(payout - stake)} GKC** !`;
  } else {
    db.addDailyLoss(uid, stake);
    message = `🎡 La bille atterrit sur **${outcomeNumber}** (${outcomeColor === 'green' ? 'Vert' : outcomeColor === 'red' ? 'Rouge' : 'Noir'}). Vous perdez **${formatCents(stake)} GKC**.`;
  }
  // Build a simple visual representation: show eight numbers around the outcome
  const visualSize = 8;
  const visual = [];
  for (let i = -3; i <= 3; i++) {
    const idx = (outcomeIndex + i + wheelSequence.length) % wheelSequence.length;
    const num = wheelSequence[idx];
    const col = getColor(num);
    const symbol = col === 'green' ? '🟢' : col === 'red' ? '🔴' : '⚫';
    if (i === 0) {
      visual.push(`[${symbol}${num}]`);
    } else {
      visual.push(`${symbol}${num}`);
    }
  }
  // Prepare the embed with a visual representation and attach a roulette image
  const embed = new EmbedBuilder()
    .setTitle('Roulette')
    .setColor(0x4caf50)
    .setDescription(message)
    .addFields(
      { name: 'Résultat', value: visual.join('  '), inline: false },
      { name: 'Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true }
    );
  // Attach an image of the roulette wheel for a nicer visual
  try {
    // Read the image from the assets folder
    const imageBuffer = fs.readFileSync(new URL('../assets/roulette.png', import.meta.url));
    const file = new AttachmentBuilder(imageBuffer, { name: 'roulette.png' });
    embed.setImage('attachment://roulette.png');
    await interaction.reply({ embeds: [embed], files: [file] });
  } catch (err) {
    // Fallback if image cannot be loaded
    await interaction.reply({ embeds: [embed] });
  }
}