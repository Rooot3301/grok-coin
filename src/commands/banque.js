import { SlashCommandBuilder } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('banque')
  .setDescription('Opérations bancaires : solde, dépôt, retrait, intérêts, prêt')
  .addSubcommand(sub => sub.setName('solde').setDescription('Voir vos soldes (cash, banque, prêt)'))
  .addSubcommand(sub => sub.setName('depot')
    .setDescription('Déposer des fonds dans la banque')
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant en GKC').setRequired(true)))
  .addSubcommand(sub => sub.setName('retrait')
    .setDescription('Retirer des fonds de la banque')
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant en GKC').setRequired(true)))
  .addSubcommand(sub => sub.setName('daily').setDescription('Réclamer l\'intérêt quotidien sur votre épargne'))
  .addSubcommand(sub => sub.setName('pret')
    .setDescription('Prendre un prêt (maximum défini)')
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant en GKC').setRequired(true)))
  .addSubcommand(sub => sub.setName('rembourser')
    .setDescription('Rembourser votre prêt')
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant en GKC').setRequired(true)));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const sub = interaction.options.getSubcommand();
  if (sub === 'solde') {
    db.updateLoanInterest(uid);
    const loan = db.getLoan(uid);
    const parts = [];
    parts.push(`💰 Cash : **${formatCents(user.balance)} GKC**`);
    parts.push(`🏦 Banque : **${formatCents(user.bank_balance)} GKC**`);
    if (loan) {
      parts.push(`🧾 Prêt : principal ${formatCents(loan.principal)} GKC + intérêts ${formatCents(loan.interest)} GKC`);
    } else {
      parts.push('🧾 Prêt : aucun');
    }
    return interaction.reply(parts.join('\n'));
  }
  if (sub === 'depot') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
    if (user.balance < cents) return interaction.reply({ content: 'Solde insuffisant.', ephemeral: true });
    db.adjustBalance(uid, -cents);
    db.adjustBankBalance(uid, cents);
    return interaction.reply(`💸 Dépôt de **${amount.toFixed(2)} GKC** effectué.`);
  }
  if (sub === 'retrait') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
    if (user.bank_balance < cents) return interaction.reply({ content: 'Fonds insuffisants en banque.', ephemeral: true });
    db.adjustBankBalance(uid, -cents);
    db.adjustBalance(uid, cents);
    return interaction.reply(`💵 Retrait de **${amount.toFixed(2)} GKC** effectué.`);
  }
  if (sub === 'daily') {
    // Claim daily interest if 24h passed since last interest payout
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const userLastInterest = user.last_interest || 0;
    if (now - userLastInterest < dayMs) {
      const hoursLeft = Math.ceil((dayMs - (now - userLastInterest)) / 3600000);
      return interaction.reply({ content: `⏳ Intérêt non disponible. Revenez dans ${hoursLeft}h.`, ephemeral: true });
    }
    if (user.bank_balance <= 0) {
      db.updateUser(uid, { last_interest: now });
      return interaction.reply({ content: 'Vous n\'avez rien en banque pour générer des intérêts.', ephemeral: true });
    }
    // Le taux d’intérêt peut être surchargé via /config
    const overriddenRate = db.getSetting('bank_interest_pct');
    const rate = typeof overriddenRate === 'number' ? overriddenRate : config.economy.bank_interest_daily_pct;
    const added = Math.floor(user.bank_balance * rate);
    db.updateUser(uid, { bank_balance: user.bank_balance + added, last_interest: now });
    return interaction.reply(`✅ Intérêt crédité : **${formatCents(added)} GKC**.`);
  }
  if (sub === 'pret') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
    const maxLoan = config.economy.max_loan_gkc * 100;
    if (cents > maxLoan) return interaction.reply({ content: `Le montant maximum d\'un prêt est de ${formatCents(maxLoan)} GKC.`, ephemeral: true });
    const existing = db.getLoan(uid);
    if (existing) return interaction.reply({ content: 'Vous avez déjà un prêt en cours.', ephemeral: true });
    // Credit cash
    db.adjustBalance(uid, cents);
    db.createLoan(uid, cents, config.economy.loan_interest_daily_pct);
    return interaction.reply(`🤝 Prêt accordé : **${amount.toFixed(2)} GKC**. Intérêts quotidiens : ${(config.economy.loan_interest_daily_pct * 100).toFixed(2)}%.`);
  }
  if (sub === 'rembourser') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
    const loan = db.getLoan(uid);
    if (!loan) return interaction.reply({ content: 'Vous n\'avez aucun prêt à rembourser.', ephemeral: true });
    if (user.balance < cents) return interaction.reply({ content: 'Solde insuffisant pour rembourser.', ephemeral: true });
    db.adjustBalance(uid, -cents);
    const { principal, interest } = db.repayLoan(uid, cents);
    if (principal === 0 && interest === 0) {
      return interaction.reply('🎉 Prêt entièrement remboursé !');
    } else {
      return interaction.reply(`✅ Remboursé **${amount.toFixed(2)} GKC**. Reste : principal ${formatCents(principal)} GKC, intérêts ${formatCents(interest)} GKC.`);
    }
  }
}