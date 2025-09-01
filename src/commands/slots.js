import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';
import { getEvent } from '../events.js';

const symbols = [
  { emoji: '🍒', name: 'Cerise', weight: 30, value: 2 },
  { emoji: '🍋', name: 'Citron', weight: 25, value: 3 },
  { emoji: '🍊', name: 'Orange', weight: 20, value: 4 },
  { emoji: '🍇', name: 'Raisin', weight: 15, value: 5 },
  { emoji: '🔔', name: 'Cloche', weight: 8, value: 10 },
  { emoji: '⭐', name: 'Étoile', weight: 5, value: 15 },
  { emoji: '💎', name: 'Diamant', weight: 3, value: 25 },
  { emoji: '🎰', name: 'Jackpot', weight: 1, value: 100 }
];

function getRandomSymbol() {
  const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const symbol of symbols) {
    random -= symbol.weight;
    if (random <= 0) {
      return symbol;
    }
  }
  
  return symbols[0]; // Fallback
}

function spinReels() {
  return [
    [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
    [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
    [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]
  ];
}

function checkWinningLines(reels) {
  const lines = [
    // Lignes horizontales
    [reels[0][0], reels[1][0], reels[2][0]], // Ligne du haut
    [reels[0][1], reels[1][1], reels[2][1]], // Ligne du milieu
    [reels[0][2], reels[1][2], reels[2][2]], // Ligne du bas
    // Diagonales
    [reels[0][0], reels[1][1], reels[2][2]], // Diagonale \
    [reels[0][2], reels[1][1], reels[2][0]]  // Diagonale /
  ];
  
  const wins = [];
  
  lines.forEach((line, index) => {
    const [first, second, third] = line;
    
    // Trois symboles identiques
    if (first.emoji === second.emoji && second.emoji === third.emoji) {
      wins.push({
        line: index,
        symbol: first,
        count: 3,
        multiplier: first.value
      });
    }
    // Deux symboles identiques (paiement réduit)
    else if (first.emoji === second.emoji || second.emoji === third.emoji) {
      const symbol = first.emoji === second.emoji ? first : second;
      wins.push({
        line: index,
        symbol: symbol,
        count: 2,
        multiplier: Math.floor(symbol.value / 3)
      });
    }
  });
  
  return wins;
}

function formatReels(reels) {
  let display = '```\n';
  display += '┌─────────────┐\n';
  
  for (let row = 0; row < 3; row++) {
    display += '│ ';
    for (let col = 0; col < 3; col++) {
      display += reels[col][row].emoji;
      if (col < 2) display += ' │ ';
    }
    display += ' │\n';
    
    if (row < 2) {
      display += '├─────────────┤\n';
    }
  }
  
  display += '└─────────────┘\n```';
  return display;
}

export const data = new SlashCommandBuilder()
  .setName('slots')
  .setDescription('Jouer aux machines à sous')
  .addNumberOption(opt => opt.setName('mise').setDescription('Montant à miser (GKC)').setRequired(true))
  .addIntegerOption(opt => opt.setName('tours').setDescription('Nombre de tours automatiques (1-10)').setRequired(false));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const amount = interaction.options.getNumber('mise');
  const autoSpins = Math.min(Math.max(interaction.options.getInteger('tours') || 1, 1), 10);
  const stake = toCents(amount);

  if (stake <= 0) return interaction.reply({ content: 'Mise invalide.', ephemeral: true });
  if (user.balance < stake * autoSpins) return interaction.reply({ content: 'Solde insuffisant pour tous les tours.', ephemeral: true });

  // Vérifier le plafond de pertes quotidien
  const event = getEvent();
  let lossCap = config.casino.daily_loss_cap * 100;
  if (event.effects && event.effects.casinoLossCapMultiplier) {
    lossCap = Math.floor(lossCap * event.effects.casinoLossCapMultiplier);
  }
  
  const currentLoss = db.getDailyLoss(uid);
  if (currentLoss + (stake * autoSpins) > lossCap) {
    return interaction.reply({ 
      content: `Cette mise dépasserait votre plafond de pertes quotidien (${formatCents(lossCap)} GKC). Revenez demain !`, 
      ephemeral: true 
    });
  }

  if (autoSpins === 1) {
    return playSingleSpin(interaction, db, config, uid, stake);
  } else {
    return playAutoSpins(interaction, db, config, uid, stake, autoSpins);
  }
}

async function playSingleSpin(interaction, db, config, uid, stake) {
  // Déduire la mise
  db.adjustBalance(uid, -stake);
  
  const reels = spinReels();
  const wins = checkWinningLines(reels);
  
  let totalPayout = 0;
  let winDescription = '';
  
  if (wins.length > 0) {
    const feePct = config.casino.fee_pct || 0.01;
    
    for (const win of wins) {
      const payout = Math.floor(stake * win.multiplier * (1 - feePct));
      totalPayout += payout;
      
      const lineNames = ['Haut', 'Milieu', 'Bas', 'Diagonale \\', 'Diagonale /'];
      winDescription += `${win.symbol.emoji} x${win.count} (${lineNames[win.line]}): +${formatCents(payout)} GKC\n`;
    }
    
    db.adjustBalance(uid, totalPayout);
  } else {
    db.addDailyLoss(uid, stake);
    winDescription = 'Aucune combinaison gagnante';
  }

  const embed = new EmbedBuilder()
    .setTitle('🎰 Machine à Sous')
    .setColor(totalPayout > 0 ? 0x4caf50 : 0xf44336)
    .setDescription(formatReels(reels))
    .addFields(
      { name: '🎯 Résultats', value: winDescription, inline: false },
      { name: '💰 Gain/Perte', value: totalPayout > 0 ? `+${formatCents(totalPayout - stake)} GKC` : `-${formatCents(stake)} GKC`, inline: true },
      { name: '💳 Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true }
    );

  // Ajouter un bouton pour rejouer
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('slots_again')
        .setLabel('Rejouer')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎰'),
      new ButtonBuilder()
        .setCustomId('slots_auto')
        .setLabel('Auto x5')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

  const response = await interaction.reply({ embeds: [embed], components: [row] });
  
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000
  });

  collector.on('collect', async i => {
    if (i.user.id !== uid) {
      return i.reply({ content: 'Cette machine n\'est pas pour vous.', ephemeral: true });
    }

    const user = db.getUser(uid);
    if (user.balance < stake) {
      return i.reply({ content: 'Solde insuffisant.', ephemeral: true });
    }

    if (i.customId === 'slots_again') {
      await i.deferUpdate();
      await playSingleSpin(i, db, config, uid, stake);
    } else if (i.customId === 'slots_auto') {
      await i.deferUpdate();
      await playAutoSpins(i, db, config, uid, stake, 5);
    }
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}

async function playAutoSpins(interaction, db, config, uid, stake, spins) {
  let totalWin = 0;
  let totalLoss = 0;
  const results = [];
  
  for (let i = 0; i < spins; i++) {
    const user = db.getUser(uid);
    if (user.balance < stake) {
      results.push(`Tour ${i + 1}: Solde insuffisant`);
      break;
    }
    
    db.adjustBalance(uid, -stake);
    const reels = spinReels();
    const wins = checkWinningLines(reels);
    
    let spinPayout = 0;
    if (wins.length > 0) {
      const feePct = config.casino.fee_pct || 0.01;
      for (const win of wins) {
        spinPayout += Math.floor(stake * win.multiplier * (1 - feePct));
      }
      db.adjustBalance(uid, spinPayout);
      totalWin += spinPayout;
      
      const bestWin = wins.reduce((best, current) => current.multiplier > best.multiplier ? current : best);
      results.push(`Tour ${i + 1}: ${bestWin.symbol.emoji} x${bestWin.count} (+${formatCents(spinPayout - stake)} GKC)`);
    } else {
      db.addDailyLoss(uid, stake);
      totalLoss += stake;
      results.push(`Tour ${i + 1}: Aucun gain (-${formatCents(stake)} GKC)`);
    }
  }
  
  const netResult = totalWin - (spins * stake);
  
  const embed = new EmbedBuilder()
    .setTitle(`🎰 Machine à Sous - Auto x${spins}`)
    .setColor(netResult > 0 ? 0x4caf50 : 0xf44336)
    .setDescription(results.join('\n'))
    .addFields(
      { name: '💰 Résultat net', value: netResult > 0 ? `+${formatCents(netResult)} GKC` : `${formatCents(netResult)} GKC`, inline: true },
      { name: '💳 Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true }
    );

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: [] });
  } else {
    await interaction.reply({ embeds: [embed] });
  }
}