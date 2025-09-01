import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

/**
 * Commande /config réservée aux administrateurs pour configurer le bot : salon des logs, salon d’annonces, taux d’intérêt de la banque.
 */
export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configurer les paramètres du bot (réservé aux admins)')
  .addSubcommand(sub => sub
    .setName('logs')
    .setDescription('Définir le salon des logs')
    .addChannelOption(opt => opt.setName('salon').setDescription('Salon des logs').setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(sub => sub
    .setName('annonces')
    .setDescription('Définir le salon des annonces d’événements')
    .addChannelOption(opt => opt.setName('salon').setDescription('Salon d’annonces').setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(sub => sub
    .setName('banque_interet')
    .setDescription('Définir le taux d’intérêt quotidien de la banque (en %, ex. 0.3 pour 0,3%)')
    .addNumberOption(opt => opt.setName('taux').setDescription('Taux quotidien (%)').setRequired(true)));

export async function execute(interaction, db, config) {
  // Vérifier les permissions administrateur
  const member = interaction.member;
  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'Seuls les administrateurs peuvent utiliser cette commande.', ephemeral: true });
  }
  const sub = interaction.options.getSubcommand();
  if (sub === 'logs') {
    const channel = interaction.options.getChannel('salon', true);
    db.setSetting('log_channel', channel.id);
    return interaction.reply({ content: `✅ Salon des logs défini sur ${channel}.`, allowedMentions: { repliedUser: false } });
  }
  if (sub === 'annonces') {
    const channel = interaction.options.getChannel('salon', true);
    db.setSetting('event_channel', channel.id);
    return interaction.reply({ content: `✅ Salon d’annonces défini sur ${channel}.`, allowedMentions: { repliedUser: false } });
  }
  if (sub === 'banque_interet') {
    const taux = interaction.options.getNumber('taux', true);
    if (taux < 0 || taux > 100) {
      return interaction.reply({ content: 'Veuillez entrer un taux entre 0 et 100.', ephermal: true });
    }
    // Convertir en décimal (ex. 0.3% → 0.003)
    const decimal = taux / 100;
    db.setSetting('bank_interest_pct', decimal);
    return interaction.reply({ content: `✅ Taux d’intérêt quotidien de la banque défini à ${taux.toFixed(2)} %.`, allowedMentions: { repliedUser: false } });
  }
  return interaction.reply({ content: 'Sous‑commande inconnue.', ephermal: true });
}