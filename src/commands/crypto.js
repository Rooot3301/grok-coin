import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { formatGrokCoin, formatBitGrok, SYMBOLS, COLORS, createStyledEmbed } from '../utils/symbols.js';
import { getCurrentCryptoPrice, getCryptoPriceHistory } from '../events.js';
import { toCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('crypto')
  .setDescription('Marché des cryptomonnaies BitGrok')
  .addSubcommand(sub => sub
    .setName('prix')
    .setDescription('Consulter le prix actuel du BitGrok'))
  .addSubcommand(sub => sub
    .setName('acheter')
    .setDescription('Acheter du BitGrok')
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant en GKC à investir').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('vendre')
    .setDescription('Vendre du BitGrok')
    .addNumberOption(opt => opt.setName('quantite').setDescription('Quantité de BitGrok à vendre').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('portefeuille')
    .setDescription('Voir votre portefeuille crypto'))
  .addSubcommand(sub => sub
    .setName('graphique')
    .setDescription('Graphique des prix sur 24h'))
  .addSubcommand(sub => sub
    .setName('staking')
    .setDescription('Staker vos BitGrok pour des récompenses')
    .addStringOption(opt => opt.setName('action').setDescription('Action à effectuer').setRequired(true).addChoices(
      { name: 'Déposer', value: 'deposit' },
      { name: 'Retirer', value: 'withdraw' },
      { name: 'Récolter', value: 'claim' },
      { name: 'Statut', value: 'status' }
    ))
    .addNumberOption(opt => opt.setName('quantite').setDescription('Quantité de BitGrok').setRequired(false)));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const sub = interaction.options.getSubcommand();
  const currentPrice = getCurrentCryptoPrice();

  if (sub === 'prix') {
    const history = getCryptoPriceHistory(24);
    const priceChange24h = ((currentPrice - history[0].price) / history[0].price) * 100;
    const isPositive = priceChange24h >= 0;
    
    const embed = new EmbedBuilder()
      .setTitle(`${SYMBOLS.BITGROK} Prix du BitGrok`)
      .setColor(isPositive ? COLORS.CRYPTO_GREEN : COLORS.CRYPTO_RED)
      .setDescription(`**Prix actuel : ${formatGrokCoin(currentPrice)}**`)
      .addFields(
        { 
          name: `${isPositive ? SYMBOLS.CHART_UP : SYMBOLS.CHART_DOWN} Variation 24h`, 
          value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`, 
          inline: true 
        },
        { name: `${SYMBOLS.COIN} Market Cap`, value: `${formatGrokCoin(currentPrice * 21000000)}`, inline: true },
        { name: `${SYMBOLS.FIRE} Volume 24h`, value: `${formatGrokCoin(Math.floor(Math.random() * 1000000000))}`, inline: true }
      )
      .setFooter({ text: 'Prix mis à jour en temps réel • Investissez prudemment' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('crypto_buy')
          .setLabel('Acheter')
          .setStyle(ButtonStyle.Success)
          .setEmoji(SYMBOLS.CHART_UP),
        new ButtonBuilder()
          .setCustomId('crypto_sell')
          .setLabel('Vendre')
          .setStyle(ButtonStyle.Danger)
          .setEmoji(SYMBOLS.CHART_DOWN),
        new ButtonBuilder()
          .setCustomId('crypto_chart')
          .setLabel('Graphique')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📊')
      );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  if (sub === 'acheter') {
    const montant = interaction.options.getNumber('montant');
    const montantCents = toCents(montant);
    
    if (montantCents <= 0) return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
    if (user.balance < montantCents) return interaction.reply({ content: 'Solde insuffisant.', ephemeral: true });

    const fees = Math.floor(montantCents * (config.crypto.trading_fee_pct || 0.002));
    const netAmount = montantCents - fees;
    const btgReceived = Math.floor((netAmount / currentPrice) * 100000000); // Conversion en satoshis

    db.adjustBalance(uid, -montantCents);
    db.adjustCryptoBalance(uid, btgReceived);

    const embed = new EmbedBuilder()
      .setTitle(`${SYMBOLS.SUCCESS} Achat BitGrok Confirmé`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Vous avez acheté **${formatBitGrok(btgReceived)}** pour **${formatGrokCoin(montantCents)}**`)
      .addFields(
        { name: 'Prix d\'achat', value: formatGrokCoin(currentPrice), inline: true },
        { name: 'Frais de trading', value: formatGrokCoin(fees), inline: true },
        { name: 'Solde restant', value: formatGrokCoin(db.getUser(uid).balance), inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'vendre') {
    const quantite = interaction.options.getNumber('quantite');
    const quantiteSatoshis = Math.floor(quantite * 100000000);
    
    if (quantiteSatoshis <= 0) return interaction.reply({ content: 'Quantité invalide.', ephemeral: true });
    if ((user.crypto_balance || 0) < quantiteSatoshis) return interaction.reply({ content: 'Solde BitGrok insuffisant.', ephemeral: true });

    const grossAmount = Math.floor((quantiteSatoshis / 100000000) * currentPrice);
    const fees = Math.floor(grossAmount * (config.crypto.trading_fee_pct || 0.002));
    const netAmount = grossAmount - fees;

    db.adjustCryptoBalance(uid, -quantiteSatoshis);
    db.adjustBalance(uid, netAmount);

    const embed = new EmbedBuilder()
      .setTitle(`${SYMBOLS.SUCCESS} Vente BitGrok Confirmée`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Vous avez vendu **${formatBitGrok(quantiteSatoshis)}** pour **${formatGrokCoin(netAmount)}**`)
      .addFields(
        { name: 'Prix de vente', value: formatGrokCoin(currentPrice), inline: true },
        { name: 'Frais de trading', value: formatGrokCoin(fees), inline: true },
        { name: 'Nouveau solde', value: formatGrokCoin(db.getUser(uid).balance), inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'portefeuille') {
    const cryptoBalance = user.crypto_balance || 0;
    const stakingBalance = user.crypto_staking || 0;
    const totalBtg = cryptoBalance + stakingBalance;
    const portfolioValue = Math.floor((totalBtg / 100000000) * currentPrice);
    
    const embed = new EmbedBuilder()
      .setTitle(`${SYMBOLS.WALLET} Portefeuille Crypto`)
      .setColor(COLORS.INFO)
      .addFields(
        { name: `${SYMBOLS.BITGROK} BitGrok Disponible`, value: formatBitGrok(cryptoBalance), inline: true },
        { name: `${SYMBOLS.DIAMOND} BitGrok en Staking`, value: formatBitGrok(stakingBalance), inline: true },
        { name: `${SYMBOLS.MONEY_BAG} Valeur Totale`, value: formatGrokCoin(portfolioValue), inline: true },
        { name: `${SYMBOLS.GROKCOIN} Solde GrokCoin`, value: formatGrokCoin(user.balance), inline: true },
        { name: `${SYMBOLS.CHART_UP} Prix Actuel BTG`, value: formatGrokCoin(currentPrice), inline: true },
        { name: `${SYMBOLS.COIN} Total BitGrok`, value: formatBitGrok(totalBtg), inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'graphique') {
    const history = getCryptoPriceHistory(24);
    const minPrice = Math.min(...history.map(h => h.price));
    const maxPrice = Math.max(...history.map(h => h.price));
    const priceRange = maxPrice - minPrice;
    
    // Création d'un graphique ASCII simple
    let chart = '```\n';
    chart += `BitGrok - Prix sur 24h (${formatGrokCoin(minPrice)} - ${formatGrokCoin(maxPrice)})\n\n`;
    
    const chartHeight = 10;
    for (let row = chartHeight; row >= 0; row--) {
      const threshold = minPrice + (priceRange * row / chartHeight);
      chart += threshold >= 10000 ? `${Math.floor(threshold/100)}k │` : `${Math.floor(threshold/100)}  │`;
      
      for (let i = 0; i < Math.min(history.length, 48); i += 2) {
        const price = history[i].price;
        chart += price >= threshold ? '█' : ' ';
      }
      chart += '\n';
    }
    
    chart += '    └' + '─'.repeat(24) + '\n';
    chart += '     0h    6h   12h   18h   24h\n```';

    const priceChange = ((currentPrice - history[0].price) / history[0].price) * 100;
    const isPositive = priceChange >= 0;

    const embed = new EmbedBuilder()
      .setTitle(`${SYMBOLS.BITGROK} Graphique BitGrok 24h`)
      .setColor(isPositive ? COLORS.CRYPTO_GREEN : COLORS.CRYPTO_RED)
      .setDescription(chart)
      .addFields(
        { name: 'Prix Actuel', value: formatGrokCoin(currentPrice), inline: true },
        { name: 'Variation 24h', value: `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%`, inline: true },
        { name: 'Volatilité', value: `${((priceRange / currentPrice) * 100).toFixed(1)}%`, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'staking') {
    const action = interaction.options.getString('action');
    const quantite = interaction.options.getNumber('quantite');
    
    if (action === 'status') {
      const stakingBalance = user.crypto_staking || 0;
      const lastClaim = user.staking_last_claim || Date.now();
      const daysSinceLastClaim = (Date.now() - lastClaim) / (1000 * 60 * 60 * 24);
      const baseApy = 0.08; // 8% APY de base
      const pendingRewards = Math.floor(stakingBalance * (baseApy / 365) * daysSinceLastClaim);
      
      const embed = new EmbedBuilder()
        .setTitle(`${SYMBOLS.DIAMOND} Staking BitGrok`)
        .setColor(COLORS.GOLD)
        .addFields(
          { name: 'BitGrok en Staking', value: formatBitGrok(stakingBalance), inline: true },
          { name: 'APY Actuel', value: `${(baseApy * 100).toFixed(1)}%`, inline: true },
          { name: 'Récompenses Pendantes', value: formatBitGrok(pendingRewards), inline: true },
          { name: 'Dernière Récolte', value: `Il y a ${Math.floor(daysSinceLastClaim)} jour(s)`, inline: true },
          { name: 'Valeur Stakée', value: formatGrokCoin(Math.floor((stakingBalance / 100000000) * currentPrice)), inline: true },
          { name: 'Récompenses/Jour', value: formatBitGrok(Math.floor(stakingBalance * (baseApy / 365))), inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
    
    // Autres actions de staking...
    return interaction.reply({ content: 'Fonctionnalité de staking en développement.', ephemeral: true });
  }
}