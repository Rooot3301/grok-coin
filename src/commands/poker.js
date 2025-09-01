import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';
import { getEvent } from '../events.js';

const suits = ['♠️', '♥️', '♦️', '♣️'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const rankValues = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: rankValues[rank] });
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatCard(card) {
  return `${card.rank}${card.suit}`;
}

function formatHand(hand) {
  return hand.map(formatCard).join(' ');
}

function evaluateHand(hand) {
  const sorted = [...hand].sort((a, b) => b.value - a.value);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);
  const values = sorted.map(c => c.value);
  
  // Compter les occurrences
  const rankCounts = {};
  ranks.forEach(rank => rankCounts[rank] = (rankCounts[rank] || 0) + 1);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  // Vérifier la couleur
  const isFlush = suits.every(suit => suit === suits[0]);
  
  // Vérifier la suite
  let isStraight = false;
  if (values.length === 5) {
    // Suite normale
    isStraight = values[0] - values[4] === 4 && new Set(values).size === 5;
    
    // Suite A-2-3-4-5 (roue)
    if (!isStraight && values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
      isStraight = true;
    }
  }
  
  // Évaluer la main
  if (isStraight && isFlush) {
    if (values[0] === 14 && values[1] === 13) return { rank: 9, name: 'Quinte Flush Royale' };
    return { rank: 8, name: 'Quinte Flush' };
  }
  if (counts[0] === 4) return { rank: 7, name: 'Carré' };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 6, name: 'Full House' };
  if (isFlush) return { rank: 5, name: 'Couleur' };
  if (isStraight) return { rank: 4, name: 'Suite' };
  if (counts[0] === 3) return { rank: 3, name: 'Brelan' };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 2, name: 'Double Paire' };
  if (counts[0] === 2) return { rank: 1, name: 'Paire' };
  return { rank: 0, name: 'Carte Haute' };
}

const payoutTable = {
  9: 800,  // Quinte Flush Royale
  8: 50,   // Quinte Flush
  7: 25,   // Carré
  6: 9,    // Full House
  5: 6,    // Couleur
  4: 4,    // Suite
  3: 3,    // Brelan
  2: 2,    // Double Paire
  1: 1,    // Paire de Valets ou mieux
  0: 0     // Rien
};

export const data = new SlashCommandBuilder()
  .setName('poker')
  .setDescription('Jouer au Video Poker (Jacks or Better)')
  .addNumberOption(opt => opt.setName('mise').setDescription('Montant à miser (GKC)').setRequired(true));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const amount = interaction.options.getNumber('mise');
  const stake = toCents(amount);

  if (stake <= 0) return interaction.reply({ content: 'Mise invalide.', ephemeral: true });
  if (user.balance < stake) return interaction.reply({ content: 'Solde insuffisant.', ephemeral: true });

  // Vérifier le plafond de pertes quotidien
  const event = getEvent();
  let lossCap = config.casino.daily_loss_cap * 100;
  if (event.effects && event.effects.casinoLossCapMultiplier) {
    lossCap = Math.floor(lossCap * event.effects.casinoLossCapMultiplier);
  }
  
  const currentLoss = db.getDailyLoss(uid);
  if (currentLoss + stake > lossCap) {
    return interaction.reply({ 
      content: `Vous avez atteint votre plafond de pertes quotidien (${formatCents(lossCap)} GKC). Revenez demain !`, 
      ephemeral: true 
    });
  }

  // Déduire la mise
  db.adjustBalance(uid, -stake);

  // Distribuer 5 cartes
  const deck = createDeck();
  const hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
  
  const gameState = {
    deck,
    hand,
    stake,
    held: [false, false, false, false, false],
    firstDraw: true
  };

  return showPokerHand(interaction, gameState, uid);
}

async function showPokerHand(interaction, gameState, uid) {
  const { hand, held, firstDraw, stake } = gameState;
  const evaluation = evaluateHand(hand);
  
  // Créer l'affichage des cartes avec indicateurs de hold
  const cardDisplay = hand.map((card, i) => {
    const cardStr = formatCard(card);
    return held[i] ? `[${cardStr}]` : cardStr;
  }).join('  ');

  const embed = new EmbedBuilder()
    .setTitle('🃏 Video Poker - Jacks or Better')
    .setColor(0x9c27b0)
    .addFields(
      { name: '🎴 Votre main', value: cardDisplay, inline: false },
      { name: '🎯 Combinaison', value: evaluation.name, inline: true },
      { name: '💰 Mise', value: `${formatCents(stake)} GKC`, inline: true }
    );

  if (firstDraw) {
    embed.setDescription('Sélectionnez les cartes à garder, puis tirez de nouvelles cartes.');
    
    // Créer les boutons pour chaque carte
    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();
    
    for (let i = 0; i < 5; i++) {
      const button = new ButtonBuilder()
        .setCustomId(`poker_hold_${i}`)
        .setLabel(`${i + 1}`)
        .setStyle(held[i] ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji(held[i] ? '🔒' : '🃏');
      
      if (i < 3) row1.addComponents(button);
      else row2.addComponents(button);
    }
    
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId('poker_draw')
        .setLabel('Tirer')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎲')
    );

    const response = await interaction.reply({ embeds: [embed], components: [row1, row2] });
    
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.user.id !== uid) {
        return i.reply({ content: 'Cette partie n\'est pas pour vous.', ephemeral: true });
      }

      if (i.customId.startsWith('poker_hold_')) {
        const cardIndex = parseInt(i.customId.split('_')[2]);
        gameState.held[cardIndex] = !gameState.held[cardIndex];
        await updatePokerDisplay(i, gameState, uid);
      } else if (i.customId === 'poker_draw') {
        await drawNewCards(i, gameState, uid);
      }
    });

    collector.on('end', () => {
      if (gameState.firstDraw) {
        interaction.editReply({ components: [] });
      }
    });
  } else {
    // Deuxième tirage - calculer les gains
    await calculatePokerPayout(interaction, gameState, uid);
  }
}

async function updatePokerDisplay(interaction, gameState, uid) {
  const { hand, held, stake } = gameState;
  const evaluation = evaluateHand(hand);
  
  const cardDisplay = hand.map((card, i) => {
    const cardStr = formatCard(card);
    return held[i] ? `[${cardStr}]` : cardStr;
  }).join('  ');

  const embed = new EmbedBuilder()
    .setTitle('🃏 Video Poker - Jacks or Better')
    .setColor(0x9c27b0)
    .setDescription('Sélectionnez les cartes à garder, puis tirez de nouvelles cartes.')
    .addFields(
      { name: '🎴 Votre main', value: cardDisplay, inline: false },
      { name: '🎯 Combinaison', value: evaluation.name, inline: true },
      { name: '💰 Mise', value: `${formatCents(stake)} GKC`, inline: true }
    );

  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();
  
  for (let i = 0; i < 5; i++) {
    const button = new ButtonBuilder()
      .setCustomId(`poker_hold_${i}`)
      .setLabel(`${i + 1}`)
      .setStyle(held[i] ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji(held[i] ? '🔒' : '🃏');
    
    if (i < 3) row1.addComponents(button);
    else row2.addComponents(button);
  }
  
  row2.addComponents(
    new ButtonBuilder()
      .setCustomId('poker_draw')
      .setLabel('Tirer')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎲')
  );

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function drawNewCards(interaction, gameState, uid) {
  const { deck, hand, held } = gameState;
  
  // Remplacer les cartes non gardées
  for (let i = 0; i < 5; i++) {
    if (!held[i]) {
      hand[i] = deck.pop();
    }
  }
  
  gameState.firstDraw = false;
  await showPokerHand(interaction, gameState, uid);
}

async function calculatePokerPayout(interaction, gameState, uid) {
  const { hand, stake } = gameState;
  const evaluation = evaluateHand(hand);
  
  let payout = 0;
  let multiplier = 0;
  
  // Vérifier si c'est une paire payante (Valets ou mieux)
  if (evaluation.rank === 1) {
    const ranks = hand.map(c => c.rank);
    const rankCounts = {};
    ranks.forEach(rank => rankCounts[rank] = (rankCounts[rank] || 0) + 1);
    
    const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
    if (['J', 'Q', 'K', 'A'].includes(pairRank)) {
      multiplier = payoutTable[1];
    }
  } else if (evaluation.rank > 1) {
    multiplier = payoutTable[evaluation.rank];
  }
  
  if (multiplier > 0) {
    const feePct = config.casino.fee_pct || 0.01;
    payout = Math.floor(stake * (multiplier + 1) * (1 - feePct));
    db.adjustBalance(uid, payout);
  } else {
    db.addDailyLoss(uid, stake);
  }

  const cardDisplay = hand.map(formatCard).join('  ');
  
  const embed = new EmbedBuilder()
    .setTitle('🃏 Video Poker - Résultat')
    .setColor(payout > 0 ? 0x4caf50 : 0xf44336)
    .addFields(
      { name: '🎴 Main finale', value: cardDisplay, inline: false },
      { name: '🎯 Combinaison', value: evaluation.name, inline: true },
      { name: '💰 Multiplicateur', value: multiplier > 0 ? `x${multiplier}` : 'Aucun', inline: true },
      { name: '💵 Gain/Perte', value: payout > stake ? `+${formatCents(payout - stake)} GKC` : `-${formatCents(stake)} GKC`, inline: true },
      { name: '💳 Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true }
    );

  if (payout > 0) {
    embed.setDescription(payout > stake * 10 ? '🎉 **GROS GAIN !**' : '✅ **VICTOIRE !**');
  } else {
    embed.setDescription('😞 **Aucune combinaison payante**');
  }

  await interaction.update({ embeds: [embed], components: [] });
}