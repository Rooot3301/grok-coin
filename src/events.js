import { SYMBOLS, COLORS } from './utils/symbols.js';

// Événements économiques réalistes avec effets complexes
const economicEvents = [
  {
    name: 'Bull Market',
    description: `${SYMBOLS.BULL} ${SYMBOLS.ROCKET} **BULL MARKET DÉCLARÉ !**\n\nLes marchés explosent ! Les investisseurs affluent et la confiance est au maximum. C'est le moment d'investir !`,
    type: 'economic',
    endsInHours: () => 48 + Math.floor(Math.random() * 72),
    color: COLORS.SUCCESS,
    effects: {
      jobMultiplier: 1.25,
      cryptoPriceMultiplier: 1.4,
      immoMultiplier: 1.2,
      bankInterestMultiplier: 1.1,
      casinoLossCapMultiplier: 1.5,
      stakingApyBonus: 0.03
    }
  },
  {
    name: 'Bear Market',
    description: `${SYMBOLS.BEAR} ${SYMBOLS.CHART_DOWN} **BEAR MARKET CONFIRMÉ**\n\nLes prix chutent, la peur domine les marchés. Les investisseurs vendent massivement. Temps difficiles à venir...`,
    type: 'economic',
    endsInHours: () => 72 + Math.floor(Math.random() * 96),
    color: COLORS.ERROR,
    effects: {
      jobMultiplier: 0.8,
      cryptoPriceMultiplier: 0.6,
      immoMultiplier: 0.85,
      bankInterestMultiplier: 0.9,
      casinoLossCapMultiplier: 0.7,
      loanInterestMultiplier: 1.2
    }
  },
  {
    name: 'Récession Économique',
    description: `${SYMBOLS.CHART_DOWN} ${SYMBOLS.ICE} **RÉCESSION DÉCLARÉE**\n\nL'économie se contracte, le chômage augmente. Les entreprises réduisent leurs coûts. Période d'austérité.`,
    type: 'economic',
    endsInHours: () => 120 + Math.floor(Math.random() * 120),
    color: COLORS.ERROR,
    effects: {
      jobMultiplier: 0.7,
      jobMultiplierPerJob: {
        'PDG': 0.6,
        'Consultant': 0.65,
        'Médecin': 0.9, // Secteur résistant
        'Développeur': 0.85
      },
      cryptoPriceMultiplier: 0.5,
      immoMultiplier: 0.7,
      casinoLossCapMultiplier: 0.5
    }
  },
  {
    name: 'Boom Technologique',
    description: `${SYMBOLS.ROCKET} ${SYMBOLS.FIRE} **BOOM TECH !**\n\nRévolution technologique ! L'IA et la blockchain transforment l'économie. Les développeurs sont en or !`,
    type: 'tech',
    endsInHours: () => 24 + Math.floor(Math.random() * 48),
    color: COLORS.INFO,
    effects: {
      jobMultiplierPerJob: {
        'Développeur': 1.8,
        'Trader': 1.4,
        'Ingénieur': 1.5,
        'PDG': 1.3
      },
      cryptoPriceMultiplier: 1.6,
      stakingApyBonus: 0.05
    }
  },
  {
    name: 'Crise Sanitaire',
    description: `${SYMBOLS.WARNING} ⚕️ **CRISE SANITAIRE**\n\nPandémie mondiale ! Confinements et restrictions. Seuls les secteurs essentiels fonctionnent normalement.`,
    type: 'health',
    endsInHours: () => 96 + Math.floor(Math.random() * 72),
    color: COLORS.WARNING,
    effects: {
      jobMultiplier: 0.6,
      jobMultiplierPerJob: {
        'Médecin': 1.5,
        'Développeur': 1.1, // Télétravail
        'PDG': 0.8,
        'Avocat': 0.7
      },
      casinoLossCapMultiplier: 0.3, // Casinos fermés
      immoMultiplier: 0.8
    }
  },
  {
    name: 'Halving BitGrok',
    description: `${SYMBOLS.BITGROK} ⚡ **HALVING BITGROK !**\n\nLa récompense de minage BitGrok vient d'être divisée par deux ! Événement majeur qui arrive tous les 4 ans.`,
    type: 'crypto',
    endsInHours: () => 168 + Math.floor(Math.random() * 168),
    color: COLORS.CRYPTO_GREEN,
    effects: {
      cryptoPriceMultiplier: 1.8,
      miningDifficultyMultiplier: 1.5,
      stakingApyBonus: 0.04,
      jobMultiplierPerJob: {
        'Trader': 1.3,
        'Développeur': 1.2
      }
    }
  },
  {
    name: 'Régulation Crypto',
    description: `${SYMBOLS.WARNING} ⚖️ **NOUVELLES RÉGULATIONS**\n\nLes gouvernements durcissent la régulation des cryptomonnaies. Incertitude sur les marchés.`,
    type: 'crypto',
    endsInHours: () => 48 + Math.floor(Math.random() * 72),
    color: COLORS.WARNING,
    effects: {
      cryptoPriceMultiplier: 0.7,
      tradingFeeMultiplier: 1.5,
      stakingApyBonus: -0.02,
      jobMultiplierPerJob: {
        'Avocat': 1.4,
        'Trader': 0.8
      }
    }
  },
  {
    name: 'Adoption Institutionnelle',
    description: `${SYMBOLS.ROCKET} ${SYMBOLS.BANK} **ADOPTION MASSIVE !**\n\nLes grandes banques adoptent BitGrok ! Tesla, Apple et Microsoft ajoutent BTG à leur bilan.`,
    type: 'crypto',
    endsInHours: () => 72 + Math.floor(Math.random() * 96),
    color: COLORS.CRYPTO_GREEN,
    effects: {
      cryptoPriceMultiplier: 2.1,
      stakingApyBonus: 0.06,
      jobMultiplierPerJob: {
        'Trader': 1.6,
        'PDG': 1.3,
        'Consultant': 1.4
      },
      casinoLossCapMultiplier: 2.0
    }
  },
  {
    name: 'Hack d\'Exchange',
    description: `${SYMBOLS.ERROR} ${SYMBOLS.CRASH} **EXCHANGE HACKÉ !**\n\nUn exchange majeur s'est fait pirater 500M$ en BitGrok ! Panique sur les marchés crypto.`,
    type: 'crypto',
    endsInHours: () => 24 + Math.floor(Math.random() * 48),
    color: COLORS.ERROR,
    effects: {
      cryptoPriceMultiplier: 0.4,
      tradingFeeMultiplier: 2.0,
      stakingApyBonus: -0.03,
      casinoLossCapMultiplier: 0.6
    }
  },
  {
    name: 'Bulle Immobilière',
    description: `${SYMBOLS.HOUSE} ${SYMBOLS.CHART_UP} **BULLE IMMOBILIÈRE !**\n\nLes prix de l'immobilier explosent ! Spéculation massive, tout le monde veut investir dans la pierre.`,
    type: 'real_estate',
    endsInHours: () => 96 + Math.floor(Math.random() * 72),
    color: COLORS.IMMO,
    effects: {
      immoMultiplier: 1.8,
      jobMultiplierPerJob: {
        'Architecte': 1.5,
        'Avocat': 1.3,
        'PDG': 1.2
      },
      bankInterestMultiplier: 1.2
    }
  },
  {
    name: 'Krach Immobilier',
    description: `${SYMBOLS.CRASH} ${SYMBOLS.HOUSE} **KRACH IMMOBILIER !**\n\nLa bulle éclate ! Les prix de l'immobilier s'effondrent, nombreuses faillites dans le secteur.`,
    type: 'real_estate',
    endsInHours: () => 120 + Math.floor(Math.random() * 96),
    color: COLORS.ERROR,
    effects: {
      immoMultiplier: 0.5,
      jobMultiplierPerJob: {
        'Architecte': 0.6,
        'PDG': 0.8
      },
      loanInterestMultiplier: 1.4
    }
  },
  {
    name: 'Guerre Commerciale',
    description: `${SYMBOLS.WARNING} ⚔️ **GUERRE COMMERCIALE !**\n\nTensions géopolitiques ! Tarifs douaniers et sanctions économiques perturbent le commerce mondial.`,
    type: 'geopolitical',
    endsInHours: () => 168 + Math.floor(Math.random() * 168),
    color: COLORS.WARNING,
    effects: {
      jobMultiplier: 0.85,
      cryptoPriceMultiplier: 0.8,
      immoMultiplier: 0.9,
      jobMultiplierPerJob: {
        'Trader': 0.7,
        'PDG': 0.8,
        'Consultant': 1.2 // Conseils en crise
      }
    }
  }
];

let currentEvent = null;
let cryptoPrice = 50000; // Prix initial BitGrok en centimes
let lastPriceUpdate = Date.now();

// Simulation réaliste du prix BitGrok
function updateCryptoPrice() {
  const now = Date.now();
  const timeDiff = now - lastPriceUpdate;
  const hoursPassed = timeDiff / (1000 * 60 * 60);
  
  if (hoursPassed < 0.1) return; // Mise à jour max toutes les 6 minutes
  
  let volatility = 0.08; // Volatilité de base
  let trendMultiplier = 1;
  
  if (currentEvent) {
    if (currentEvent.effects.cryptoPriceMultiplier) {
      trendMultiplier = currentEvent.effects.cryptoPriceMultiplier;
    }
    volatility *= 2.5; // Plus de volatilité pendant les événements
  }
  
  // Mouvement brownien avec tendance
  const randomChange = (Math.random() - 0.5) * volatility * hoursPassed;
  const trendChange = (trendMultiplier - 1) * 0.1 * hoursPassed;
  
  const totalChange = randomChange + trendChange;
  cryptoPrice = Math.max(1000, cryptoPrice * (1 + totalChange)); // Prix minimum 10 GKC
  
  lastPriceUpdate = now;
}

function pickRandomEvent() {
  const event = economicEvents[Math.floor(Math.random() * economicEvents.length)];
  const now = Date.now();
  const durationHours = event.endsInHours();
  
  currentEvent = {
    ...event,
    endsAt: now + durationHours * 60 * 60 * 1000,
    startedAt: now
  };
  
  // Mise à jour immédiate du prix crypto si événement crypto
  if (event.type === 'crypto') {
    updateCryptoPrice();
  }
}

export function getEvent() {
  const now = Date.now();
  
  // Vérifier si l'événement actuel est terminé
  if (!currentEvent || currentEvent.endsAt <= now) {
    // 30% de chance d'avoir un nouvel événement immédiatement
    if (Math.random() < 0.3) {
      pickRandomEvent();
    } else {
      currentEvent = null;
    }
  }
  
  // Mettre à jour le prix crypto
  updateCryptoPrice();
  
  return currentEvent;
}

export function getCurrentCryptoPrice() {
  updateCryptoPrice();
  return Math.round(cryptoPrice);
}

export function getCryptoPriceHistory(hours = 24) {
  // Simulation d'historique de prix (en production, stocker en DB)
  const history = [];
  const basePrice = cryptoPrice;
  
  for (let i = hours; i >= 0; i--) {
    const variance = (Math.random() - 0.5) * 0.1;
    const price = basePrice * (1 + variance);
    history.push({
      timestamp: Date.now() - (i * 60 * 60 * 1000),
      price: Math.round(price)
    });
  }
  
  return history;
}

export { pickRandomEvent };