import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatCents } from '../utils/money.js';

/**
 * Commande pour gérer l'achat de nodes de minage et consulter / récolter leurs revenus.
 */
export const data = new SlashCommandBuilder()
  .setName('node')
  .setDescription('Gérer vos nodes de minage')
  .addSubcommand(sub => sub.setName('acheter').setDescription('Acheter un node de minage'))
  .addSubcommand(sub => sub.setName('etat').setDescription('Voir vos nodes et récolter les revenus'));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const sub = interaction.options.getSubcommand();
  const priceGkc = config.crypto?.node_price || 0;
  const dailyYield = config.crypto?.node_daily_yield || 0;
  const dailyCost = config.crypto?.node_daily_cost || 0;
  const netPerDay = dailyYield - dailyCost;
  if (sub === 'acheter') {
    const costCents = priceGkc * 100;
    if (user.balance < costCents) {
      return interaction.reply({ content: 'Solde insuffisant pour acheter un node.', ephemeral: true });
    }
    // Récolter les revenus existants avant l'achat
    db.claimNodeYield(uid);
    db.adjustBalance(uid, -costCents);
    db.addNode(uid);
    const embed = new EmbedBuilder()
      .setTitle('Node de minage')
      .setColor(0x009688)
      .setDescription(`✅ Vous avez acheté un node de minage pour **${priceGkc.toFixed(2)} GKC**.`)
      .addFields(
        { name: 'Nodes possédés', value: `${db.getUser(uid).nodes}`, inline: true },
        { name: 'Revenu net par node/jour', value: `${netPerDay} GKC`, inline: true },
        { name: 'Solde restant', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }
  if (sub === 'etat') {
    // Collecter les revenus dus
    const { payout } = db.claimNodeYield(uid);
    const info = db.getNodeInfo(uid);
    // Calculer le temps jusqu'au prochain versement complet
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const last = info.last || 0;
    const elapsed = now - last;
    const remainingMs = dayMs - (elapsed % dayMs);
    const hours = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    const embed = new EmbedBuilder()
      .setTitle('Nodes de minage')
      .setColor(0x00796b)
      .setDescription(payout > 0 ? `💰 Revenus collectés : **${payout} GKC**` : 'Aucun revenu à collecter pour le moment.')
      .addFields(
        { name: 'Nodes possédés', value: `${info.nodes}`, inline: true },
        { name: 'Revenu net/node/jour', value: `${netPerDay} GKC`, inline: true },
        { name: 'Temps avant prochain versement', value: `${hours}h ${minutes}m`, inline: true },
        { name: 'Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }
}