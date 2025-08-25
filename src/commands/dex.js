import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';

/**
 * Commande d'échange entre la monnaie GKC et le stablecoin fictif sGKC.
 * Les conversions appliquent un spread défini dans la configuration.
 */
export const data = new SlashCommandBuilder()
  .setName('dex')
  .setDescription('Échanger GKC et sGKC (stablecoin)')
  .addSubcommand(sub => sub
    .setName('acheter')
    .setDescription('Acheter des sGKC avec vos GKC')
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant en GKC à convertir').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('vendre')
    .setDescription('Vendre vos sGKC pour obtenir des GKC')
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant en sGKC à convertir').setRequired(true)));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const sub = interaction.options.getSubcommand();
  const amount = interaction.options.getNumber('montant');
  const spread = config.crypto?.dex_spread_pct || 0.005;
  if (amount <= 0) {
    return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
  }
  if (sub === 'acheter') {
    const gkcCents = toCents(amount);
    if (user.balance < gkcCents) {
      return interaction.reply({ content: 'Solde GKC insuffisant.', ephemeral: true });
    }
    // Montant de sGKC reçu après spread
    const stableReceived = Math.floor(gkcCents * (1 - spread));
    db.adjustBalance(uid, -gkcCents);
    db.adjustStableBalance(uid, stableReceived);
    const embed = new EmbedBuilder()
      .setTitle('DEX : Achat sGKC')
      .setColor(0x00c853)
      .setDescription(`✅ Vous avez échangé **${formatCents(gkcCents)} GKC** contre **${formatCents(stableReceived)} sGKC** (spread ${spread * 100} %).`)
      .addFields(
        { name: 'Solde GKC', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true },
        { name: 'Solde sGKC', value: `${formatCents(db.getUser(uid).stable_balance)} sGKC`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  } else if (sub === 'vendre') {
    const stableCents = toCents(amount);
    if (user.stable_balance < stableCents) {
      return interaction.reply({ content: 'Solde sGKC insuffisant.', ephemeral: true });
    }
    const gkcReceived = Math.floor(stableCents * (1 - spread));
    db.adjustStableBalance(uid, -stableCents);
    db.adjustBalance(uid, gkcReceived);
    const embed = new EmbedBuilder()
      .setTitle('DEX : Vente sGKC')
      .setColor(0xff6d00)
      .setDescription(`✅ Vous avez échangé **${formatCents(stableCents)} sGKC** contre **${formatCents(gkcReceived)} GKC** (spread ${spread * 100} %).`)
      .addFields(
        { name: 'Solde GKC', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true },
        { name: 'Solde sGKC', value: `${formatCents(db.getUser(uid).stable_balance)} sGKC`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }
}