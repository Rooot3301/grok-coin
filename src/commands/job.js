import { SlashCommandBuilder } from 'discord.js';
import { formatCents, toCents } from '../utils/money.js';
import { getEvent } from '../events.js';

export const data = new SlashCommandBuilder()
  .setName('job')
  .setDescription('Choisir ou travailler dans un métier')
  .addSubcommand(sub => sub
    .setName('choisir')
    .setDescription('Choisissez un métier')
    .addStringOption(option => {
      option.setName('métier').setDescription('Le métier que vous souhaitez').setRequired(true);
      // The actual choices will be validated in code; we can't set them dynamically here easily
      return option;
    }))
  .addSubcommand(sub => sub
    .setName('shift')
    .setDescription('Effectuez un shift et gagnez votre salaire'));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const sub = interaction.options.getSubcommand();
  const user = db.getUser(uid);
  const jobs = config.economy.jobs;
  const maxShifts = config.economy.job_max_shifts_per_day || 3;
  const cooldownMinutes = config.economy.job_cooldown_minutes || 30;

  if (sub === 'choisir') {
    const jobName = interaction.options.getString('métier');
    if (!jobs[jobName]) {
      return interaction.reply({ content: 'Métier invalide. Veuillez choisir parmi : ' + Object.keys(jobs).join(', '), ephemeral: true });
    }
    db.setJob(uid, jobName);
    return interaction.reply(`✅ Métier défini sur **${jobName}**. Utilisez /job shift pour commencer à travailler !`);
  } else if (sub === 'shift') {
    if (!user.job) {
      return interaction.reply({ content: 'Vous n\'avez pas encore choisi de métier. Utilisez /job choisir pour en choisir un.', ephemeral: true });
    }
    // Reset daily shifts if last shift was yesterday or earlier
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (user.last_shift && now - user.last_shift > dayMs) {
      db.resetDailyShifts(uid);
    }
    if ((user.shifts_count || 0) >= maxShifts) {
      return interaction.reply({ content: `Vous avez déjà effectué vos ${maxShifts} shifts pour aujourd\'hui. Revenez demain !`, ephemeral: true });
    }
    // Check cooldown
    const last = user.last_shift || 0;
    const cooldownMs = cooldownMinutes * 60 * 1000;
    if (last && now - last < cooldownMs) {
      const waitMinutes = Math.ceil((cooldownMs - (now - last)) / 60000);
      return interaction.reply({ content: `⏳ Vous devez attendre encore ${waitMinutes} minute(s) avant de refaire un shift.`, ephemeral: true });
    }
    // Pay salary and apply event multiplier if applicable
    let salary = jobs[user.job].salary;
    const currentEvent = getEvent();
    if (currentEvent && currentEvent.effects) {
      if (currentEvent.effects.jobMultiplierPerJob && currentEvent.effects.jobMultiplierPerJob[user.job]) {
        salary = salary * currentEvent.effects.jobMultiplierPerJob[user.job];
      } else if (currentEvent.effects.jobMultiplier) {
        salary = salary * currentEvent.effects.jobMultiplier;
      }
    }
    const salaryCents = toCents(salary);
    db.adjustBalance(uid, salaryCents);
    // Update shift info
    if (!last || now - last > dayMs) {
      // new day, reset shift count to 1
      db.updateShift(uid);
    } else {
      db.incrementShiftCount(uid);
      db.updateUser(uid, { last_shift: now });
    }
    return interaction.reply(`💼 Vous avez travaillé et gagné **${salary.toFixed(2)} GKC** !`);
  }
}