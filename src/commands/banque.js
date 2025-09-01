import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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
    
    const embed = new EmbedBuilder()
      .setTitle('🏦 Situation Bancaire')
      .setColor(0x3498db)
      .addFields(
        { name: '💰 Liquidités', value: formatCents(user.balance) + ' Ǥ', inline: true },
        { name: '🏦 Épargne', value: formatCents(user.bank_balance) + ' Ǥ', inline: true },
        { name: '🧾 Prêt', value: loan ? `${formatCents(loan.principal + loan.interest)} Ǥ` : 'Aucun', inline: true }
      )
      .setFooter({ text: '🏦 GrokBank • Votre partenaire financier' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }
  
  if (sub === 'depot') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', flags: 64 });
    if (user.balance < cents) return interaction.reply({ content: 'Solde insuffisant.', flags: 64 });
    
    db.adjustBalance(uid, -cents);
    db.adjustBankBalance(uid, cents);
    
    const embed = new EmbedBuilder()
      .setTitle('💸 Dépôt Effectué')
      .setColor(0x00ff88)
      .setDescription(`Dépôt de **${amount.toFixed(2)} Ǥ** effectué avec succès !`)
      .addFields(
        { name: '💰 Liquidités', value: `${formatCents(db.getUser(uid).balance)} Ǥ`, inline: true },
        { name: '🏦 Épargne', value: `${formatCents(db.getUser(uid).bank_balance)} Ǥ`, inline: true }
      )
      .setFooter({ text: '🏦 Votre argent est en sécurité' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }
  
  if (sub === 'retrait') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', flags: 64 });
    if (user.bank_balance < cents) return interaction.reply({ content: 'Fonds insuffisants en banque.', flags: 64 });
    
    db.adjustBankBalance(uid, -cents);
    db.adjustBalance(uid, cents);
    
    const embed = new EmbedBuilder()
      .setTitle('💵 Retrait Effectué')
      .setColor(0x00ff88)
      .setDescription(`Retrait de **${amount.toFixed(2)} Ǥ** effectué avec succès !`)
      .addFields(
        { name: '💰 Liquidités', value: `${formatCents(db.getUser(uid).balance)} Ǥ`, inline: true },
        { name: '🏦 Épargne', value: `${formatCents(db.getUser(uid).bank_balance)} Ǥ`, inline: true }
      )
      .setFooter({ text: '🏦 Argent disponible immédiatement' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }
  
  if (sub === 'daily') {
    // Claim daily interest if 24h passed since last interest payout
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const userLastInterest = user.last_interest || 0;
    if (now - userLastInterest < dayMs) {
      const hoursLeft = Math.ceil((dayMs - (now - userLastInterest)) / 3600000);
      return interaction.reply({ content: `⏳ Intérêt non disponible. Revenez dans ${hoursLeft}h.`, flags: 64 });
    }
    if (user.bank_balance <= 0) {
      db.updateUser(uid, { last_interest: now });
      return interaction.reply({ content: 'Vous n\'avez rien en banque pour générer des intérêts.', flags: 64 });
    }
    // Le taux d'intérêt peut être surchargé via /config
    const overriddenRate = db.getSetting('bank_interest_pct');
    const rate = typeof overriddenRate === 'number' ? overriddenRate : config.economy.bank_interest_daily_pct;
    const added = Math.floor(user.bank_balance * rate);
    db.updateUser(uid, { bank_balance: user.bank_balance + added, last_interest: now });
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Intérêts Crédités')
      .setColor(0x00ff88)
      .setDescription(`Intérêt quotidien crédité : **${formatCents(added)} Ǥ** !`)
      .addFields(
        { name: '🏦 Nouvelle épargne', value: `${formatCents(db.getUser(uid).bank_balance)} Ǥ`, inline: true },
        { name: '📊 Taux quotidien', value: `${(rate * 100).toFixed(3)}%`, inline: true }
      )
      .setFooter({ text: '🏦 Revenez demain pour plus d\'intérêts !' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }
  
  if (sub === 'pret') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', flags: 64 });
    const maxLoan = config.economy.max_loan_gkc * 100;
    if (cents > maxLoan) return interaction.reply({ content: `Le montant maximum d\'un prêt est de ${formatCents(maxLoan)} GKC.`, flags: 64 });
    const existing = db.getLoan(uid);
    if (existing) return interaction.reply({ content: 'Vous avez déjà un prêt en cours.', flags: 64 });
    
    // Credit cash
    db.adjustBalance(uid, cents);
    db.createLoan(uid, cents, config.economy.loan_interest_daily_pct);
    
    const embed = new EmbedBuilder()
      .setTitle('🤝 Prêt Accordé')
      .setColor(0xffa502)
      .setDescription(`Prêt accordé : **${amount.toFixed(2)} Ǥ** !`)
      .addFields(
        { name: '💰 Nouveau solde', value: `${formatCents(db.getUser(uid).balance)} Ǥ`, inline: true },
        { name: '📊 Intérêts quotidiens', value: `${(config.economy.loan_interest_daily_pct * 100).toFixed(2)}%`, inline: true }
      )
      .setFooter({ text: '⚠️ N\'oubliez pas de rembourser régulièrement !' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }
  
  if (sub === 'rembourser') {
    const amount = interaction.options.getNumber('montant');
    const cents = toCents(amount);
    if (cents <= 0) return interaction.reply({ content: 'Montant invalide.', flags: 64 });
    const loan = db.getLoan(uid);
    if (!loan) return interaction.reply({ content: 'Vous n\'avez aucun prêt à rembourser.', flags: 64 });
    if (user.balance < cents) return interaction.reply({ content: 'Solde insuffisant pour rembourser.', flags: 64 });
    
    db.adjustBalance(uid, -cents);
    const { principal, interest } = db.repayLoan(uid, cents);
    
    if (principal === 0 && interest === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Prêt Remboursé')
        .setColor(0x00ff88)
        .setDescription('**Félicitations !** Votre prêt est entièrement remboursé !')
        .addFields(
          { name: '💰 Solde restant', value: `${formatCents(db.getUser(uid).balance)} Ǥ`, inline: true }
        )
        .setFooter({ text: '🎉 Vous êtes libre de toute dette !' })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('✅ Remboursement Effectué')
        .setColor(0x00ff88)
        .setDescription(`Remboursé **${amount.toFixed(2)} Ǥ** avec succès !`)
        .addFields(
          { name: '🧾 Capital restant', value: `${formatCents(principal)} Ǥ`, inline: true },
          { name: '📊 Intérêts restants', value: `${formatCents(interest)} Ǥ`, inline: true },
          { name: '💰 Votre solde', value: `${formatCents(db.getUser(uid).balance)} Ǥ`, inline: true }
        )
        .setFooter({ text: '💪 Continuez à rembourser pour être libre !' })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }
  }
}