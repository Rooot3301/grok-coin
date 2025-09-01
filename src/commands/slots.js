import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';

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
  
  return symbols[0];
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
    [reels[0][0], reels[1][0], reels[2][0]], // Ligne du haut
    [reels[0][1], reels[1][1], reels[2][1]], // Ligne du milieu
    [reels[0][2], reels[1][2], reels[2][2]], // Ligne du bas
    [reels[0][0], reels[1][1], reels[2][2]], // Diagonale \
    [reels[0][2], reels[1][1], reels[2][0]]  // Diagonale /
  ];
  
  const wins = [];
  
  lines.forEach((line, index) => {
    const [first, second, third] = line;
    
    if (first.emoji === second.emoji && second.emoji === third.emoji) {
      wins.push({
        line: index,
        symbol: first,
        count: 3,
        multiplier: first.value
      });
    } else if (first.emoji === second.emoji || second.emoji === third.emoji) {
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
  .setDescription('🎰 Jouer aux machines à sous')
  .addNumberOption(opt => opt.setName('mise').setDescription('Montant à miser (GKC)').setRequired(true));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const amount = interaction.options.getNumber('mise');
  const stake = toCents(amount);

  if (stake <= 0) {
    return interaction.reply({ content: '❌ Mise invalide.', flags: 64 });
  }
  
  if (user.balance < stake) {
    return interaction.reply({ content: '❌ Solde insuffisant.', flags: 64 });
  }

  // Déduire la mise
  db.adjustBalance(uid, -stake);
  db.updateVipTier(uid, stake);
  
  const reels = spinReels();
  const wins = checkWinningLines(reels);
  
  let totalPayout = 0;
  let winDescription = '';
  
  if (wins.length > 0) {
    const feePct = config.casino?.fee_pct || 0.01;
    
    for (const win of wins) {
      const payout = Math.floor(stake * win.multiplier * (1 - feePct));
      totalPayout += payout;
      
      const lineNames = ['Haut', 'Milieu', 'Bas', 'Diagonale \\', 'Diagonale /'];
      winDescription += `${win.symbol.emoji} x${win.count} (${lineNames[win.line]}): +${formatCents(payout)} GKC\n`;
    }
    
    db.adjustBalance(uid, totalPayout);
  } else {
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

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('slots_again')
        .setLabel('Rejouer')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('slots_auto')
        .setLabel('Auto x5')
        .setStyle(ButtonStyle.Secondary)
    );

  const response = await interaction.reply({ embeds: [embed], components: [row] });
  
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000
  });

  collector.on('collect', async i => {
    if (i.user.id !== uid) {
      return i.reply({ content: '❌ Cette machine n\'est pas pour vous.', flags: 64 });
    }

    const currentUser = db.getUser(uid);
    if (currentUser.balance < stake) {
      return i.reply({ content: '❌ Solde insuffisant.', flags: 64 });
    }

    if (i.customId === 'slots_again') {
      await i.deferUpdate();
      // Relancer une partie
      const newReels = spinReels();
      const newWins = checkWinningLines(newReels);
      
      db.adjustBalance(uid, -stake);
      let newPayout = 0;
      let newDescription = '';
      
      if (newWins.length > 0) {
        const feePct = config.casino?.fee_pct || 0.01;
        for (const win of newWins) {
          const payout = Math.floor(stake * win.multiplier * (1 - feePct));
          newPayout += payout;
          const lineNames = ['Haut', 'Milieu', 'Bas', 'Diagonale \\', 'Diagonale /'];
          newDescription += `${win.symbol.emoji} x${win.count} (${lineNames[win.line]}): +${formatCents(payout)} GKC\n`;
        }
        db.adjustBalance(uid, newPayout);
      } else {
        newDescription = 'Aucune combinaison gagnante';
      }

      const newEmbed = new EmbedBuilder()
        .setTitle('🎰 Machine à Sous')
        .setColor(newPayout > 0 ? 0x4caf50 : 0xf44336)
        .setDescription(formatReels(newReels))
        .addFields(
          { name: '🎯 Résultats', value: newDescription, inline: false },
          { name: '💰 Gain/Perte', value: newPayout > 0 ? `+${formatCents(newPayout - stake)} GKC` : `-${formatCents(stake)} GKC`, inline: true },
          { name: '💳 Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true }
        );

      await i.editReply({ embeds: [newEmbed], components: [row] });
    }
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        ...row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
      );
    interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}