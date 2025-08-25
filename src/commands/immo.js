import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatCents, toCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('immo')
  .setDescription('Gestion des biens immobiliers')
  .addSubcommand(sub => sub.setName('liste').setDescription('Afficher les biens disponibles'))
  .addSubcommand(sub => sub.setName('acheter').setDescription('Acheter un bien immobilier')
    .addStringOption(opt => opt.setName('bien').setDescription('ID du bien à acheter').setRequired(true)))
  .addSubcommand(sub => sub.setName('mes_biens').setDescription('Afficher vos biens')); // sans arguments

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const sub = interaction.options.getSubcommand();
  if (sub === 'liste') {
    const props = db.getAllProperties();
    const fields = props.map(p => ({ name: `${p.name} (ID: ${p.id})`, value: `Prix: ${formatCents(p.price)} GKC\nLoyer/jour: ${formatCents(p.rent)} GKC`, inline: false }));
    const embed = new EmbedBuilder()
      .setTitle('Biens disponibles')
      .setColor(0xff9800)
      .addFields(fields);
    await interaction.reply({ embeds: [embed] });
  } else if (sub === 'acheter') {
    const id = interaction.options.getString('bien');
    const all = db.getAllProperties();
    const prop = all.find(p => p.id === id);
    if (!prop) return interaction.reply({ content: 'Bien introuvable. Utilisez /immo liste pour voir les IDs.', ephermal: true });
    const user = db.getUser(uid);
    const cost = prop.price * 100;
    if (user.balance < cost) return interaction.reply({ content: 'Solde insuffisant pour cet achat.', ephermal: true });
    // Check if already owned
    const owned = db.getUserProperties(uid);
    if (owned.some(o => o.id === id)) return interaction.reply({ content: 'Vous possédez déjà ce bien.', ephermal: true });
    db.adjustBalance(uid, -cost);
    db.addPropertyToUser(uid, id);
    return interaction.reply(`🏠 Vous avez acheté **${prop.name}** pour **${formatCents(prop.price)} GKC**.`);
  } else if (sub === 'mes_biens') {
    const owned = db.getUserProperties(uid);
    if (owned.length === 0) return interaction.reply('Vous ne possédez aucun bien pour le moment.');
    const lines = owned.map(p => `${p.name} — loyer ${formatCents(p.rent)} GKC/jour`);
    const embed = new EmbedBuilder()
      .setTitle('Vos biens immobiliers')
      .setColor(0x8bc34a)
      .setDescription(lines.join('\n'));
    await interaction.reply({ embeds: [embed] });
  }
}