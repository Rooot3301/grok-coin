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
  if (card.rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(card.rank)) return 0;
  return parseInt(card.rank) || 10; // 10 vaut 0 au baccarat
}

function calculateHandValue(hand) {
  const total = hand.reduce((sum, card) => sum + getCardValue(card), 0);
  return total % 10; // Seul le chiffre des unités compte
}

function formatCard(card) {
  return `${card.rank}${card.suit}`;
}

function formatHand(hand) {
  return hand.map(formatCard).join(' ');
}

function shouldPlayerDraw(playerValue, bankerCard) {
  return playerValue <= 5;
}

function shouldBankerDraw(bankerValue, playerThirdCard) {
  if (bankerValue <= 2) return true;
  if (bankerValue === 3 && playerThirdCard !== 8) return true;
  if (bankerValue === 4 && [2, 3, 4, 5, 6, 7].includes(playerThirdCard)) return true;
  if (bankerValue === 5 && [4, 5, 6, 7].includes(playerThirdCard)) return true;
  if (bankerValue === 6 && [6, 7].includes(playerThirdCard)) return true;
  return false;
}

export const data = new SlashCommandBuilder()
  .setName('baccarat')
  .setDescription('Jouer au Baccarat')
  .addNumberOption(opt => opt.setName('mise').setDescription('Montant à miser (GKC)').setRequired(true))
  .addStringOption(opt => opt.setName('pari').setDescription('Sur quoi parier').setRequired(true).addChoices(
    { name: 'Joueur', value: 'player' },
    { name: 'Banquier', value: 'banker' },
    { name: 'Égalité', value: 'tie' }
  ));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const amount = interaction.options.getNumber('mise');
  const bet = interaction.options.getString('pari');
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

  // Créer le deck et distribuer les cartes initiales
  const deck = createDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const bankerHand = [deck.pop(), deck.pop()];

  let playerValue = calculateHandValue(playerHand);
  let bankerValue = calculateHandValue(bankerHand);

  // Vérifier si c'est un "naturel" (8 ou 9)
  const playerNatural = playerValue >= 8;
  const bankerNatural = bankerValue >= 8;

  let playerThirdCard = null;
  let bankerThirdCard = null;

  // Règles de tirage si pas de naturel
  if (!playerNatural && !bankerNatural) {
    // Joueur tire une troisième carte si nécessaire
    if (shouldPlayerDraw(playerValue)) {
      playerThirdCard = deck.pop();
      playerHand.push(playerThirdCard);
      playerValue = calculateHandValue(playerHand);
    }

    // Banquier tire selon les règles complexes
    const thirdCardValue = playerThirdCard ? getCardValue(playerThirdCard) : null;
    if (shouldBankerDraw(bankerValue, thirdCardValue)) {
      bankerThirdCard = deck.pop();
      bankerHand.push(bankerThirdCard);
      bankerValue = calculateHandValue(bankerHand);
    }
  }

  // Déterminer le gagnant
  let winner;
  if (playerValue > bankerValue) {
    winner = 'player';
  } else if (bankerValue > playerValue) {
    winner = 'banker';
  } else {
    winner = 'tie';
  }

  // Calculer les gains
  let payout = 0;
  let result = '';
  const feePct = config.casino.fee_pct || 0.01;

  if (bet === winner) {
    if (bet === 'player') {
      payout = Math.floor(stake * 2 * (1 - feePct));
      result = '🎉 **VICTOIRE !** Le Joueur gagne.';
    } else if (bet === 'banker') {
      // Commission de 5% sur les gains du banquier
      payout = Math.floor(stake * 2 * (1 - feePct - 0.05));
      result = '🎉 **VICTOIRE !** Le Banquier gagne.';
    } else if (bet === 'tie') {
      payout = Math.floor(stake * 9 * (1 - feePct)); // Paiement 8:1
      result = '🎊 **ÉGALITÉ !** Paiement 8:1.';
    }
    db.adjustBalance(uid, payout);
  } else {
    db.addDailyLoss(uid, stake);
    if (winner === 'player') {
      result = '😞 **DÉFAITE** - Le Joueur gagne.';
    } else if (winner === 'banker') {
      result = '😞 **DÉFAITE** - Le Banquier gagne.';
    } else {
      result = '😐 **ÉGALITÉ** - Pas de gain sur votre pari.';
    }
  }

  // Créer l'affichage des cartes avec animation
  const gameState = {
    playerHand,
    bankerHand,
    playerValue,
    bankerValue,
    bet,
    winner,
    payout,
    stake,
    result,
    step: 0
  };

  return showBaccaratAnimation(interaction, gameState, uid);
}

async function showBaccaratAnimation(interaction, gameState, uid) {
  const { playerHand, bankerHand, playerValue, bankerValue, bet, winner, payout, stake, result, step } = gameState;
  
  let description = '';
  let playerDisplay = '';
  let bankerDisplay = '';
  
  // Animation progressive
  if (step === 0) {
    // Cartes initiales
    playerDisplay = `${formatCard(playerHand[0])} ${formatCard(playerHand[1])} (${calculateHandValue(playerHand.slice(0, 2))})`;
    bankerDisplay = `${formatCard(bankerHand[0])} ${formatCard(bankerHand[1])} (${calculateHandValue(bankerHand.slice(0, 2))})`;
    description = '🎴 **Distribution des cartes initiales...**';
  } else {
    // Résultat final
    playerDisplay = `${formatHand(playerHand)} (${playerValue})`;
    bankerDisplay = `${formatHand(bankerHand)} (${bankerValue})`;
    description = result;
  }

  const betNames = { player: 'Joueur', banker: 'Banquier', tie: 'Égalité' };
  
  const embed = new EmbedBuilder()
    .setTitle('🎴 Baccarat')
    .setColor(step === 0 ? 0x2196f3 : (payout > 0 ? 0x4caf50 : 0xf44336))
    .setDescription(description)
    .addFields(
      { name: '👤 Joueur', value: playerDisplay, inline: true },
      { name: '🏦 Banquier', value: bankerDisplay, inline: true },
      { name: '🎯 Votre pari', value: `${betNames[bet]} (${formatCents(stake)} GKC)`, inline: true }
    );

  if (step > 0) {
    embed.addFields(
      { name: '💰 Gain/Perte', value: payout > stake ? `+${formatCents(payout - stake)} GKC` : `-${formatCents(stake)} GKC`, inline: true },
      { name: '💳 Solde actuel', value: `${formatCents(db.getUser(uid).balance)} GKC`, inline: true }
    );
  }

  if (step === 0) {
    // Première étape - montrer l'animation
    const response = await interaction.reply({ embeds: [embed] });
    
    // Attendre 2 secondes puis montrer le résultat
    setTimeout(async () => {
      gameState.step = 1;
      await showBaccaratAnimation({ editReply: response.edit.bind(response) }, gameState, uid);
    }, 2000);
  } else {
    // Résultat final avec bouton rejouer
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('baccarat_again_player')
          .setLabel('Rejouer (Joueur)')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👤'),
        new ButtonBuilder()
          .setCustomId('baccarat_again_banker')
          .setLabel('Rejouer (Banquier)')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🏦'),
        new ButtonBuilder()
          .setCustomId('baccarat_again_tie')
          .setLabel('Rejouer (Égalité)')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🤝')
      );

    if (interaction.editReply) {
      await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
      const response = await interaction.reply({ embeds: [embed], components: [row] });
      
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
      });

      collector.on('collect', async i => {
        if (i.user.id !== uid) {
          return i.reply({ content: 'Cette partie n\'est pas pour vous.', ephemeral: true });
        }

        const user = db.getUser(uid);
        if (user.balance < stake) {
          return i.reply({ content: 'Solde insuffisant.', ephemeral: true });
        }

        const newBet = i.customId.split('_')[2]; // player, banker, ou tie
        
        // Créer une nouvelle partie avec le même montant
        await i.deferUpdate();
        const newInteraction = {
          ...interaction,
          options: {
            getNumber: () => stake / 100,
            getString: () => newBet
          },
          reply: i.editReply.bind(i)
        };
        
        await execute(newInteraction, db, config);
      });

      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
    }
  }
}