import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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
  const user = await db.getUser(uid);
  const jobs = config.economy.jobs;
  const maxShifts = config.economy.job_max_shifts_per_day || 3;
  const cooldownMinutes = config.economy.job_cooldown_minutes || 30;

  if (sub === 'choisir') {
    const jobName = interaction.options.getString('métier');
    if (!jobs[jobName]) {
      const jobList = Object.keys(jobs).map(job => `${jobs[job].emoji} **${job}**`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('💼 Métiers Disponibles')
        .setColor(0x3742fa)
        .setDescription('**Choisissez parmi ces carrières prestigieuses :**\n\n' + jobList)
        .setFooter({ text: 'Utilisez /job choisir <métier> pour sélectionner' });
      return interaction.reply({ embeds: [embed], flags: 64 });
    }
    await db.setJob(uid, jobName);
    
    const embed = new EmbedBuilder()
      .setTitle('💼 Carrière Choisie')
      .setColor(0x00ff88)
      .setDescription(`${jobs[jobName].emoji} Vous êtes maintenant **${jobName}** !\n\n*${jobs[jobName].description}*\n\nSalaire : **${jobs[jobName].salary} Ǥ** par shift`)
      .setFooter({ text: 'Utilisez /job shift pour commencer à travailler !' });
    return interaction.reply({ embeds: [embed] });
  } else if (sub === 'shift') {
    if (!user.job) {
      return interaction.reply({ content: 'Vous n\'avez pas encore choisi de métier. Utilisez /job choisir pour en choisir un.', flags: 64 });
    }
    // Reset daily shifts if last shift was yesterday or earlier
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (user.last_shift && now - user.last_shift > dayMs) {
      await db.resetDailyShifts(uid);
    }
    if ((user.shifts_count || 0) >= maxShifts) {
      return interaction.reply({ content: `Vous avez déjà effectué vos ${maxShifts} shifts pour aujourd\'hui. Revenez demain !`, flags: 64 });
    }
    // Check cooldown
    const last = user.last_shift || 0;
    const cooldownMs = cooldownMinutes * 60 * 1000;
    if (last && now - last < cooldownMs) {
      const waitMinutes = Math.ceil((cooldownMs - (now - last)) / 60000);
      return interaction.reply({ content: `⏳ Vous devez attendre encore ${waitMinutes} minute(s) avant de refaire un shift.`, flags: 64 });
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
    await db.adjustBalance(uid, salaryCents);
    // Update shift info
    if (!last || now - last > dayMs) {
      // new day, reset shift count to 1
      await db.updateShift(uid);
    } else {
      await db.incrementShiftCount(uid);
      await db.updateUser(uid, { last_shift: now });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('💼 Shift Terminé')
      .setColor(0x00ff88)
      .setDescription(`${jobs[user.job].emoji} Excellent travail ! Vous avez gagné **${salary.toFixed(2)} Ǥ** !`)
      .addFields(
        { name: '💰 Nouveau solde', value: `${formatCents((await db.getUser(uid)).balance)} Ǥ`, inline: true },
        { name: '📊 Shifts aujourd\'hui', value: `${(await db.getUser(uid)).shifts_count}/${maxShifts}`, inline: true }
      )
      .setFooter({ text: '💼 Continuez à travailler pour prospérer !' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }
}