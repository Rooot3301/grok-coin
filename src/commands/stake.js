import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';

/**
 * Commande de staking : déposer vos sGKC pour générer des intérêts quotidiens, retirer vos sGKC et consulter l'état de votre staking.
 */
export const data = new SlashCommandBuilder()
  .setName('stake')
  .setDescription('Gestion du staking de sGKC')
  .addSubcommand(sub => sub
    .setName('depot')
    .setDescription('Déposer des sGKC en staking')
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant en sGKC').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('retrait')
    .setDescription('Retirer des sGKC du staking')
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant en sGKC').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('etat')
    .setDescription('Consulter l\'état de votre staking'));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const sub = interaction.options.getSubcommand();
  if (sub === 'depot') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
    if (user.stable_balance < cents) return interaction.reply({ content: 'Solde sGKC insuffisant.', ephemeral: true });
    try {
      db.depositStake(uid, cents);
    } catch (err) {
      return interaction.reply({ content: 'Erreur lors du dépôt en staking.', ephemeral: true });
    }
    const embed = new EmbedBuilder()
      .setTitle('Staking : Dépôt')
      .setColor(0x00b0ff)
      .setDescription(`✅ Vous avez déposé **${formatCents(cents)} sGKC** en staking.`)
      .addFields(
        { name: 'Solde sGKC', value: `${formatCents(db.getUser(uid).stable_balance)} sGKC`, inline: true },
        { name: 'Staking total', value: `${formatCents(db.getUser(uid).staking_balance)} sGKC`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }
  if (sub === 'retrait') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
    db.updateStakingInterest(uid);
    const staking = db.getUser(uid).staking_balance;
    if (staking < cents) return interaction.reply({ content: 'Montant supérieur à votre staking.', ephemeral: true });
    const withdrawn = db.withdrawStake(uid, cents);
    const embed = new EmbedBuilder()
      .setTitle('Staking : Retrait')
      .setColor(0xffab00)
      .setDescription(`✅ Vous avez retiré **${formatCents(withdrawn)} sGKC** de votre staking.`)
      .addFields(
        { name: 'Solde sGKC', value: `${formatCents(db.getUser(uid).stable_balance)} sGKC`, inline: true },
        { name: 'Staking restant', value: `${formatCents(db.getUser(uid).staking_balance)} sGKC`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }
  if (sub === 'etat') {
    // Accrue interest before display
    const { added } = db.updateStakingInterest(uid);
    const userAfter = db.getUser(uid);
    const embed = new EmbedBuilder()
      .setTitle('Staking : État')
      .setColor(0x7c4dff)
      .setDescription(added > 0 ? `📈 Intérêts ajoutés depuis la dernière consultation : **${formatCents(added)} sGKC**` : 'Aucun nouvel intérêt depuis la dernière consultation.')
      .addFields(
        { name: 'Staking actuel', value: `${formatCents(userAfter.staking_balance)} sGKC`, inline: true },
        { name: 'Solde sGKC', value: `${formatCents(userAfter.stable_balance)} sGKC`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }
}