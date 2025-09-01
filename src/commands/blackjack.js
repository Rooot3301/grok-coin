import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { toCents, formatCents } from '../utils/money.js';
import { getEvent } from '../events.js';

const suits = ['♠️', '♥️', '♦️', '♣️'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
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

function getCardValue(card) {
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank);
}

function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;
  
  for (const card of hand) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }
  
  // Ajuster les As si nécessaire
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  
  return value;
}

function formatHand(hand) {
  return hand.map(card => `${card.rank}${card.suit}`).join(' ');
}

function isBlackjack(hand) {
  return hand.length === 2 && calculateHandValue(hand) === 21;
}

export const data = new SlashCommandBuilder()
  .setName('blackjack')
  .setDescription('Jouer au Blackjack contre le croupier')
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
  // No loss cap - players can bet freely

  // Déduire la mise
  db.adjustBalance(uid, -stake);

  // Créer le deck et distribuer les cartes
  const deck = createDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const dealerHand = [deck.pop(), deck.pop()];

  const gameState = {
    deck,
    playerHand,
    dealerHand,
    stake,
    gameOver: false,
    playerStand: false
  };

  // Vérifier blackjack naturel
  const playerValue = calculateHandValue(playerHand);
  const dealerValue = calculateHandValue(dealerHand);
  const playerBJ = isBlackjack(playerHand);
  const dealerBJ = isBlackjack(dealerHand);

  if (playerBJ || dealerBJ) {
    gameState.gameOver = true;
    return handleGameEnd(interaction, db, config, gameState, uid);
  }

  return showGameState(interaction, gameState, uid);
}

async function showGameState(interaction, gameState, uid) {
  const { playerHand, dealerHand, gameOver, playerStand } = gameState;
  
  const playerValue = calculateHandValue(playerHand);
  const dealerValue = calculateHandValue(dealerHand);
  
  // Affichage des cartes du croupier (cacher la deuxième si le jeu n'est pas fini)
  let dealerDisplay;
  if (gameOver || playerStand) {
    dealerDisplay = `${formatHand(dealerHand)} (${dealerValue})`;
  } else {
    dealerDisplay = `${dealerHand[0].rank}${dealerHand[0].suit} 🂠 (${getCardValue(dealerHand[0])} + ?)`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🃏 Blackjack')
    .setColor(playerValue > 21 ? 0xf44336 : 0x4caf50)
    .addFields(
      { name: '🎩 Croupier', value: dealerDisplay, inline: false },
      { name: '👤 Vous', value: `${formatHand(playerHand)} (${playerValue})`, inline: false },
      { name: '💰 Mise', value: `${formatCents(gameState.stake)} GKC`, inline: true }
    );

  if (gameOver) {
    return handleGameEnd(interaction, null, null, gameState, uid);
  }

  if (playerValue > 21) {
    gameState.gameOver = true;
    return handleGameEnd(interaction, null, null, gameState, uid);
  }

  // Créer les boutons d'action
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('bj_hit')
        .setLabel('Tirer')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🃏'),
      new ButtonBuilder()
        .setCustomId('bj_stand')
        .setLabel('Rester')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✋')
    );

  // Ajouter le bouton double si possible
  if (playerHand.length === 2) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('bj_double')
        .setLabel('Doubler')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💰')
    );
  }

  const response = await interaction.reply({ embeds: [embed], components: [row] });
  
  // Collecter les interactions
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== uid) {
      return i.reply({ content: 'Cette partie n\'est pas pour vous.', ephemeral: true });
    }

    if (i.customId === 'bj_hit') {
      gameState.playerHand.push(gameState.deck.pop());
      const newValue = calculateHandValue(gameState.playerHand);
      
      if (newValue > 21) {
        gameState.gameOver = true;
      }
      
      await updateGameDisplay(i, gameState, uid);
    } else if (i.customId === 'bj_stand') {
      gameState.playerStand = true;
      await dealerPlay(i, gameState, uid);
    } else if (i.customId === 'bj_double') {
      const user = db.getUser(uid);
      if (user.balance < gameState.stake) {
        return i.reply({ content: 'Solde insuffisant pour doubler.', ephemeral: true });
      }
      
      db.adjustBalance(uid, -gameState.stake);
      gameState.stake *= 2;
      gameState.playerHand.push(gameState.deck.pop());
      gameState.playerStand = true;
      
      await dealerPlay(i, gameState, uid);
    }
  });

  collector.on('end', () => {
    if (!gameState.gameOver) {
      interaction.editReply({ components: [] });
    }
  });
}

async function updateGameDisplay(interaction, gameState, uid) {
  const playerValue = calculateHandValue(gameState.playerHand);
  
  const embed = new EmbedBuilder()
    .setTitle('🃏 Blackjack')
    .setColor(playerValue > 21 ? 0xf44336 : 0x4caf50)
    .addFields(
      { name: '🎩 Croupier', value: `${gameState.dealerHand[0].rank}${gameState.dealerHand[0].suit} 🂠 (${getCardValue(gameState.dealerHand[0])} + ?)`, inline: false },
      { name: '👤 Vous', value: `${formatHand(gameState.playerHand)} (${playerValue})`, inline: false },
      { name: '💰 Mise', value: `${formatCents(gameState.stake)} GKC`, inline: true }
    );

  if (gameState.gameOver) {
    return handleGameEnd(interaction, db, config, gameState, uid);
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('bj_hit')
        .setLabel('Tirer')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🃏'),
      new ButtonBuilder()
        .setCustomId('bj_stand')
        .setLabel('Rester')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✋')
    );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function dealerPlay(interaction, gameState, uid) {
  // Le croupier tire jusqu'à 17
  while (calculateHandValue(gameState.dealerHand) < 17) {
    gameState.dealerHand.push(gameState.deck.pop());
  }
  
  gameState.gameOver = true;
  await handleGameEnd(interaction, db, config, gameState, uid);
}

async function handleGameEnd(interaction, database, configuration, gameState, uid) {
  const playerValue = calculateHandValue(gameState.playerHand);
  const dealerValue = calculateHandValue(gameState.dealerHand);
  const playerBJ = isBlackjack(gameState.playerHand);
  const dealerBJ = isBlackjack(gameState.dealerHand);

  let result, payout = 0, color = 0xf44336;
  const feePct = config?.casino?.fee_pct || 0.01;

  if (playerValue > 21) {
    result = '💥 **BUST !** Vous avez dépassé 21.';
    // No daily loss tracking needed
  } else if (dealerValue > 21) {
    result = '🎉 **VICTOIRE !** Le croupier a fait bust.';
    payout = Math.floor(gameState.stake * 2 * (1 - feePct));
    color = 0x4caf50;
  } else if (playerBJ && !dealerBJ) {
    result = '🃏 **BLACKJACK !** Paiement 3:2.';
    payout = Math.floor(gameState.stake * 2.5 * (1 - feePct));
    color = 0xffd700;
  } else if (dealerBJ && !playerBJ) {
    result = '😞 **DÉFAITE** - Le croupier a un blackjack.';
    // No daily loss tracking needed
  } else if (playerBJ && dealerBJ) {
    result = '🤝 **ÉGALITÉ** - Double blackjack.';
    payout = gameState.stake;
    color = 0xff9800;
  } else if (playerValue > dealerValue) {
    result = '🎉 **VICTOIRE !** Votre main est supérieure.';
    payout = Math.floor(gameState.stake * 2 * (1 - feePct));
    color = 0x4caf50;
  } else if (dealerValue > playerValue) {
    result = '😞 **DÉFAITE** - La main du croupier est supérieure.';
    // No daily loss tracking needed
  } else {
    result = '🤝 **ÉGALITÉ** - Même valeur.';
    payout = gameState.stake;
    color = 0xff9800;
  }

  if (payout > 0) {
    db.adjustBalance(uid, payout);
  }

  const embed = new EmbedBuilder()
    .setTitle('🃏 Blackjack - Résultat')
    .setColor(color)
    .setDescription(result)
    .addFields(
      { name: '🎩 Croupier', value: `${formatHand(gameState.dealerHand)} (${dealerValue})`, inline: false },
      { name: '👤 Vous', value: `${formatHand(gameState.playerHand)} (${playerValue})`, inline: false },
      { name: '💰 Gain/Perte', value: payout > gameState.stake ? `+${formatCents(payout - gameState.stake)} GKC` : payout === gameState.stake ? '±0.00 GKC' : `-${formatCents(gameState.stake)} GKC`, inline: true },
      { name: '💳 Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true }
    );

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: [] });
  } else {
    await interaction.reply({ embeds: [embed] });
  }
}