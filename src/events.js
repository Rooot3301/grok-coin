// Basic event system for GrokCoin bot

const eventsList = [
  {
    name: 'Bull run',
    description: '💹 La valeur du GKC explose ! Bonus sur certains gains.',
    endsInHours: () => 24 + Math.floor(Math.random() * 48),
    effects: {
      jobMultiplier: 1.2, // +20% salaire
      casinoLossCapMultiplier: 1.2
    }
  },
  {
    name: 'Crash',
    description: '📉 GKC en chute libre. Les salaires diminuent un peu.',
    endsInHours: () => 24 + Math.floor(Math.random() * 48),
    effects: {
      jobMultiplier: 0.9,
      casinoLossCapMultiplier: 0.8
    }
  },
  {
    name: 'Pandémie',
    description: '🩺 Pandémie mondiale. Les médecins sont très demandés, les commerces ralentissent.',
    endsInHours: () => 24 + Math.floor(Math.random() * 48),
    effects: {
      jobMultiplierPerJob: {
        'Médecin': 1.2,
        'Commerçant': 0.9
      }
    }
  },
  {
    name: 'Contrôles police',
    description: '🚔 Contrôles renforcés : plus de risques pour les activités illégales.',
    endsInHours: () => 24 + Math.floor(Math.random() * 48),
    effects: {
      crimeDetectionBoost: 0.3
    }
  },
  {
    name: 'Pénurie',
    description: '🧳 Pénurie de matériel : les objets coûtent plus cher.',
    endsInHours: () => 24 + Math.floor(Math.random() * 48),
    effects: {
      priceIndexBoost: 1.2
    }
  }
];

let currentEvent = null;

// Pick random event and set its end timestamp
function pickRandomEvent() {
  const event = eventsList[Math.floor(Math.random() * eventsList.length)];
  const now = Date.now();
  const durationHours = event.endsInHours();
  currentEvent = {
    ...event,
    endsAt: now + durationHours * 60 * 60 * 1000
  };
}

function getEvent() {
  const now = Date.now();
  if (!currentEvent || currentEvent.endsAt <= now) {
    pickRandomEvent();
  }
  return currentEvent;
}

export { getEvent, pickRandomEvent };