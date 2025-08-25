import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

/**
 * Commande eco : système de prix simplifié et statistiques générales de l'économie.
 * Pour l'instant, le système de prix est symbolique : les objets n'ont pas de prix dynamique.
 */
export const data = new SlashCommandBuilder()
  .setName('eco')
  .setDescription('Informations économiques')
  .addSubcommand(sub => sub
    .setName('prix')
    .setDescription('Consulter le prix d\'un objet (fonctionnalité simplifiée)')
    .addStringOption(opt => opt.setName('objet').setDescription('Nom de l\'objet').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('stats')
    .setDescription('Afficher les statistiques globales de l\'économie GrokCoin'));

export async function execute(interaction, db, config) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'prix') {
    const obj = interaction.options.getString('objet');
    // Prix fictif pour l'instant : 100 GKC pour tout objet
    const embed = new EmbedBuilder()
      .setTitle('Économie : Prix')
      .setColor(0x607d8b)
      .setDescription(`Le système de prix dynamique n\'est pas encore implémenté.\nPar défaut, **${obj}** coûte **100 GKC**.`);
    return interaction.reply({ embeds: [embed] });
  }
  if (sub === 'stats') {
    const embed = new EmbedBuilder()
      .setTitle('Économie : Statistiques')
      .setColor(0x455a64)
      .addFields(
        { name: 'Inflation hebdomadaire', value: `${(config.economy.inflation_weekly_pct * 100).toFixed(2)} %`, inline: true },
        { name: 'Intérêt épargne journalier', value: `${(config.economy.bank_interest_daily_pct * 100).toFixed(2)} %`, inline: true },
        { name: 'Intérêt prêt journalier', value: `${(config.economy.loan_interest_daily_pct * 100).toFixed(2)} %`, inline: true },
        { name: 'Spread du DEX', value: `${(config.crypto.dex_spread_pct * 100).toFixed(2)} %`, inline: true },
        { name: 'Rendement minage net/jour', value: `${config.crypto.node_daily_yield - config.crypto.node_daily_cost} GKC`, inline: true },
        { name: 'Nombre de propriétés', value: `${config.immo.properties.length}`, inline: true }
      )
      .setFooter({ text: 'Ces statistiques sont à titre indicatif et peuvent évoluer via les événements.' });
    return interaction.reply({ embeds: [embed] });
  }
}