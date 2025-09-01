// Symboles et emojis pour GrokCoin
export const SYMBOLS = {
  // Monnaies
  GROKCOIN: 'Ǥ',
  BITGROK: '₿',
  
  // Économie
  BANK: '🏦',
  WALLET: '💰',
  CHART_UP: '📈',
  CHART_DOWN: '📉',
  MONEY_BAG: '💰',
  COIN: '🪙',
  DIAMOND: '💎',
  
  // Casino
  CASINO: '🎰',
  CARDS: '🃏',
  DICE: '🎲',
  ROULETTE: '🎡',
  CHIPS: '🔴',
  
  // Immobilier
  HOUSE: '🏠',
  BUILDING: '🏢',
  CITY: '🏙️',
  CONSTRUCTION: '🏗️',
  
  // Statuts
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  
  // Rangs VIP
  VIP_BRONZE: '🥉',
  VIP_SILVER: '🥈',
  VIP_GOLD: '🥇',
  VIP_DIAMOND: '💎',
  
  // Événements
  BULL: '🐂',
  BEAR: '🐻',
  ROCKET: '🚀',
  CRASH: '💥',
  FIRE: '🔥',
  ICE: '🧊'
};

// Couleurs pour les embeds
export const COLORS = {
  SUCCESS: 0x00ff88,
  ERROR: 0xff4757,
  WARNING: 0xffa502,
  INFO: 0x3742fa,
  NEUTRAL: 0x747d8c,
  GOLD: 0xf1c40f,
  SILVER: 0x95a5a6,
  BRONZE: 0xd35400,
  DIAMOND: 0x9b59b6,
  CRYPTO_GREEN: 0x00d4aa,
  CRYPTO_RED: 0xff6b6b,
  CASINO: 0xe74c3c,
  BANK: 0x3498db,
  IMMO: 0x27ae60
};

// Formatage des montants
export function formatGrokCoin(cents) {
  const amount = cents / 100;
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${SYMBOLS.GROKCOIN}`;
}

export function formatBitGrok(satoshis) {
  const amount = satoshis / 100000000; // 1 BitGrok = 100M satoshis
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 8, maximumFractionDigits: 8 })} ${SYMBOLS.BITGROK}`;
}

export function formatPrice(cents) {
  const amount = cents / 100;
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Générateur d'embeds stylisés
export function createStyledEmbed(title, description, color = COLORS.INFO) {
  return {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'GrokCity • Économie Virtuelle',
      icon_url: 'https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg?auto=compress&cs=tinysrgb&w=32&h=32'
    }
  };
}