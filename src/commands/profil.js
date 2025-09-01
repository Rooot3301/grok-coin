import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatGrokCoin, formatBitGrok, SYMBOLS, COLORS } from '../utils/symbols.js';
import { getCurrentCryptoPrice } from '../events.js';

export const data = new SlashCommandBuilder()
  .setName('profil')
  .setDescription('Affiche votre profil GrokCity complet (patrimoine, carrière, investissements)');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const currentCryptoPrice = getCurrentCryptoPrice();
  const vipTier = db.getVipTier(uid);
  // Update loan interest before showing
  db.updateLoanInterest(uid);
  const loan = db.getLoan(uid);
  const properties = db.getUserProperties(uid);
  
  // Calcul du patrimoine total
  const cryptoValue = Math.floor(((user.crypto_balance || 0) + (user.crypto_staking || 0)) / 100000000 * currentCryptoPrice);
  const immoValue = properties.reduce((sum, p) => sum + (p.price * 100), 0);
  const totalWealth = user.balance + user.bank_balance + cryptoValue + immoValue;
  
  // Détermination du rang de richesse
  let wealthRank = 'Débutant';
  let wealthEmoji = '🌱';
  if (totalWealth >= 10000000) { wealthRank = 'Magnat'; wealthEmoji = '👑'; }
  else if (totalWealth >= 5000000) { wealthRank = 'Millionnaire'; wealthEmoji = '💎'; }
  else if (totalWealth >= 1000000) { wealthRank = 'Investisseur'; wealthEmoji = '🏆'; }
  else if (totalWealth >= 500000) { wealthRank = 'Entrepreneur'; wealthEmoji = '🚀'; }
  else if (totalWealth >= 100000) { wealthRank = 'Bourgeois'; wealthEmoji = '💼'; }
  
  const jobInfo = config.economy.jobs[user.job];

  const embed = new EmbedBuilder()
    .setTitle(`${wealthEmoji} Profil de ${interaction.user.username}`)
    .setColor(vipTier === 'diamond' ? COLORS.DIAMOND : vipTier === 'gold' ? COLORS.GOLD : vipTier === 'silver' ? COLORS.SILVER : vipTier === 'bronze' ? COLORS.BRONZE : COLORS.INFO)
    .setDescription(`**${wealthRank}** • Patrimoine total : **${formatGrokCoin(totalWealth)}**`)
    .addFields(
      { 
        name: `${SYMBOLS.WALLET} Liquidités`, 
        value: `${SYMBOLS.GROKCOIN} **${formatGrokCoin(user.balance)}**\n${SYMBOLS.BANK} **${formatGrokCoin(user.bank_balance)}** (banque)`, 
        inline: true 
      },
      { 
        name: `${jobInfo ? jobInfo.emoji : '💼'} Carrière`, 
        value: user.job ? `**${user.job}**\n${jobInfo ? jobInfo.description : ''}\nShifts: ${user.shifts_count || 0}/${config.economy.job_max_shifts_per_day}` : 'Aucun métier\n*Utilisez /job pour choisir*', 
        inline: true 
      },
      { 
        name: `${vipTier ? (vipTier === 'diamond' ? SYMBOLS.VIP_DIAMOND : vipTier === 'gold' ? SYMBOLS.VIP_GOLD : vipTier === 'silver' ? SYMBOLS.VIP_SILVER : SYMBOLS.VIP_BRONZE) : '⭐'} Statut VIP`, 
        value: vipTier ? `**${vipTier.toUpperCase()}**\nMisé: ${formatGrokCoin(user.total_wagered || 0)}` : 'Aucun\n*Jouez au casino pour débloquer*', 
        inline: true 
      }
    )

  if (loan) {
    embed.addFields({ 
      name: `${SYMBOLS.WARNING} Prêt Actif`, 
      value: `Capital: ${formatGrokCoin(loan.principal)}\nIntérêts: ${formatGrokCoin(loan.interest)}`, 
      inline: true 
    });
  } else {
    embed.addFields({ name: `${SYMBOLS.SUCCESS} Crédit`, value: 'Aucun prêt en cours', inline: true });
  }
  
  // Crypto portfolio
  if ((user.crypto_balance || 0) > 0 || (user.crypto_staking || 0) > 0) {
    embed.addFields({ 
      name: `${SYMBOLS.BITGROK} Portfolio Crypto`, 
      value: `BitGrok: ${formatBitGrok((user.crypto_balance || 0) + (user.crypto_staking || 0))}\nValeur: ${formatGrokCoin(cryptoValue)}`, 
      inline: true 
    });
  }
  
  if (properties.length > 0) {
    const props = properties.slice(0, 3).map(p => `${p.emoji || SYMBOLS.HOUSE} ${p.name}`).join('\n');
    const moreText = properties.length > 3 ? `\n*+${properties.length - 3} autres biens*` : '';
    embed.addFields({ 
      name: `${SYMBOLS.HOUSE} Immobilier (${properties.length})`, 
      value: `${props}${moreText}\nValeur: ${formatGrokCoin(immoValue)}`, 
      inline: false 
    });
  } else {
    embed.addFields({ name: `${SYMBOLS.HOUSE} Immobilier`, value: 'Aucun bien\n*Investissez avec /immo*', inline: false });
  }
  
  embed.setTimestamp();
  await interaction.reply({ embeds: [embed] });
}