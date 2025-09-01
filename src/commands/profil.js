import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatGrokCoin, formatBitGrok, SYMBOLS, COLORS } from '../utils/symbols.js';
import { getCurrentCryptoPrice } from '../events.js';

export const data = new SlashCommandBuilder()
  .setName('profil')
  .setDescription('👤 Votre profil GrokCity complet');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const currentCryptoPrice = getCurrentCryptoPrice();
  const vipTier = db.getVipTier(uid);
  
  // Mise à jour des intérêts de prêt
  db.updateLoanInterest(uid);
  const loan = db.getLoan(uid);
  const properties = db.getUserProperties(uid);
  
  // Calcul du patrimoine total
  const cryptoValue = Math.floor(((user.crypto_balance || 0) + (user.crypto_staking || 0)) / 100000000 * currentCryptoPrice);
  const immoValue = properties.reduce((sum, p) => sum + (p.price * 100), 0);
  const totalWealth = user.balance + user.bank_balance + cryptoValue + immoValue;
  
  // Rang de richesse
  let wealthRank = 'Débutant';
  let wealthEmoji = '🌱';
  let wealthColor = COLORS.NEUTRAL;
  
  if (totalWealth >= 10000000) { 
    wealthRank = 'Magnat'; 
    wealthEmoji = '👑'; 
    wealthColor = COLORS.DIAMOND;
  } else if (totalWealth >= 5000000) { 
    wealthRank = 'Millionnaire'; 
    wealthEmoji = '💎'; 
    wealthColor = COLORS.GOLD;
  } else if (totalWealth >= 1000000) { 
    wealthRank = 'Investisseur'; 
    wealthEmoji = '🏆'; 
    wealthColor = COLORS.SUCCESS;
  } else if (totalWealth >= 500000) { 
    wealthRank = 'Entrepreneur'; 
    wealthEmoji = '🚀'; 
    wealthColor = COLORS.INFO;
  } else if (totalWealth >= 100000) { 
    wealthRank = 'Bourgeois'; 
    wealthEmoji = '💼'; 
    wealthColor = COLORS.WARNING;
  }
  
  const jobInfo = config.economy.jobs[user.job];
  const vipInfo = vipTier ? config.casino.vip_tiers[vipTier] : null;

  const embed = new EmbedBuilder()
    .setTitle(`${wealthEmoji} ${interaction.user.username}`)
    .setColor(wealthColor)
    .setDescription(`**${wealthRank}** • Patrimoine : **${formatGrokCoin(totalWealth)}**`)
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields(
      { 
        name: `💰 Liquidités`, 
        value: `${formatGrokCoin(user.balance)}\n🏦 ${formatGrokCoin(user.bank_balance)} *(banque)*`, 
        inline: true 
      },
      { 
        name: `${jobInfo ? jobInfo.emoji : '💼'} Carrière`, 
        value: user.job ? `**${user.job}**\n*${jobInfo.description}*\nShifts: ${user.shifts_count || 0}/${config.economy.job_max_shifts_per_day}` : `Aucun métier\n*Utilisez /job pour commencer*`, 
        inline: true 
      },
      { 
        name: `${vipTier ? (vipTier === 'diamond' ? '💎' : vipTier === 'gold' ? '🥇' : vipTier === 'silver' ? '🥈' : '🥉') : '⭐'} Statut`, 
        value: vipTier ? `**${vipTier.toUpperCase()}** VIP\n+${(vipInfo.bonus * 100).toFixed(0)}% bonus casino` : `Standard\n*Jouez pour débloquer VIP*`, 
        inline: true 
      }
    );

  // Crypto si présent
  if ((user.crypto_balance || 0) > 0 || (user.crypto_staking || 0) > 0) {
    embed.addFields({ 
      name: `₿ Portfolio Crypto`, 
      value: `${formatBitGrok((user.crypto_balance || 0) + (user.crypto_staking || 0))}\n*Valeur : ${formatGrokCoin(cryptoValue)}*`, 
      inline: true 
    });
  }
  
  // Immobilier si présent
  if (properties.length > 0) {
    const topProps = properties.slice(0, 2).map(p => `🏠 ${p.name}`).join('\n');
    const moreText = properties.length > 2 ? `\n*+${properties.length - 2} autres biens*` : '';
    embed.addFields({ 
      name: `🏠 Immobilier (${properties.length})`, 
      value: `${topProps}${moreText}\n*Valeur : ${formatGrokCoin(immoValue)}*`, 
      inline: true 
    });
  }

  // Prêt si présent
  if (loan) {
    embed.addFields({ 
      name: `⚠️ Dette Active`, 
      value: `${formatGrokCoin(loan.principal + loan.interest)}\n*Capital + intérêts*`, 
      inline: true 
    });
  }

  embed.setFooter({ text: '💎 GrokCity • Profil mis à jour' })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('profile_job')
        .setLabel('Travailler')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('profile_bank')
        .setLabel('Banque')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('profile_crypto')
        .setLabel('Crypto')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_immo')
        .setLabel('Immobilier')
        .setStyle(ButtonStyle.Success)
    );

  await interaction.reply({ embeds: [embed], components: [row] });
}