import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
// Load configuration without JSON import assertions for better compatibility
const configPath = new URL('./config.json', import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath));

// Resolve DB path: either from environment or default location
const DB_PATH = process.env.DB_PATH || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'grokcoin.db');

// Ensure the directory exists for the database
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Initialise tables
function init() {
  db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    alias TEXT,
    job TEXT,
    balance INTEGER NOT NULL,
    bank_balance INTEGER NOT NULL,
    last_shift INTEGER DEFAULT 0,
    shifts_count INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 0,
    criminal_record INTEGER DEFAULT 0
  )`).run();

  // Extend columns on the users table if missing
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const colNames = columns.map(col => col.name);
  // last_interest column stores the timestamp of the last time a user claimed interest on their bank balance
  if (!colNames.includes('last_interest')) {
    db.prepare('ALTER TABLE users ADD COLUMN last_interest INTEGER DEFAULT 0').run();
  }
  // daily_loss and loss_day are used to enforce daily casino loss caps
  if (!colNames.includes('daily_loss')) {
    db.prepare('ALTER TABLE users ADD COLUMN daily_loss INTEGER DEFAULT 0').run();
  }
  if (!colNames.includes('loss_day')) {
    db.prepare('ALTER TABLE users ADD COLUMN loss_day INTEGER DEFAULT 0').run();
  }
  // stable_balance holds a user’s balance in the stablecoin (sGKC)
  if (!colNames.includes('stable_balance')) {
    db.prepare('ALTER TABLE users ADD COLUMN stable_balance INTEGER NOT NULL DEFAULT 0').run();
  }
  // staking_balance holds the amount of stablecoin currently staked
  if (!colNames.includes('staking_balance')) {
    db.prepare('ALTER TABLE users ADD COLUMN staking_balance INTEGER NOT NULL DEFAULT 0').run();
  }
  // staking_last stores the timestamp of the last accrual of staking rewards
  if (!colNames.includes('staking_last')) {
    db.prepare('ALTER TABLE users ADD COLUMN staking_last INTEGER NOT NULL DEFAULT 0').run();
  }
  // nodes records how many mining nodes a user has purchased
  if (!colNames.includes('nodes')) {
    db.prepare('ALTER TABLE users ADD COLUMN nodes INTEGER NOT NULL DEFAULT 0').run();
  }
  // last_node stores the timestamp of the last node payout calculation
  if (!colNames.includes('last_node')) {
    db.prepare('ALTER TABLE users ADD COLUMN last_node INTEGER NOT NULL DEFAULT 0').run();
  }
  // crypto_balance holds BitGrok balance in satoshis
  if (!colNames.includes('crypto_balance')) {
    db.prepare('ALTER TABLE users ADD COLUMN crypto_balance INTEGER NOT NULL DEFAULT 0').run();
  }
  // crypto_staking holds staked BitGrok in satoshis
  if (!colNames.includes('crypto_staking')) {
    db.prepare('ALTER TABLE users ADD COLUMN crypto_staking INTEGER NOT NULL DEFAULT 0').run();
  }
  // staking_last_claim stores timestamp of last staking rewards claim
  if (!colNames.includes('staking_last_claim')) {
    db.prepare('ALTER TABLE users ADD COLUMN staking_last_claim INTEGER NOT NULL DEFAULT 0').run();
  }
  // vip_tier stores user's VIP status
  if (!colNames.includes('vip_tier')) {
    db.prepare('ALTER TABLE users ADD COLUMN vip_tier TEXT DEFAULT NULL').run();
  }
  // total_wagered tracks lifetime casino spending for VIP tiers
  if (!colNames.includes('total_wagered')) {
    db.prepare('ALTER TABLE users ADD COLUMN total_wagered INTEGER NOT NULL DEFAULT 0').run();
  }
  // guild_id tracks which guild the user belongs to
  if (!colNames.includes('guild_id')) {
    db.prepare('ALTER TABLE users ADD COLUMN guild_id INTEGER DEFAULT NULL').run();
  }

  db.prepare(`CREATE TABLE IF NOT EXISTS loans (
    user_id TEXT PRIMARY KEY,
    principal INTEGER NOT NULL,
    interest INTEGER NOT NULL DEFAULT 0,
    last_update INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    rent INTEGER NOT NULL
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS user_properties (
    user_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    purchased_at INTEGER NOT NULL,
    last_rent INTEGER NOT NULL,
    PRIMARY KEY (user_id, property_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  )`).run();

  // Create settings table for storing server-level configuration
  db.prepare(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`).run();

  // Create news table for storing dynamic CopaingCity news
  db.prepare(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    effect TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER
  )`).run();

  // Create guilds table
  db.prepare(`CREATE TABLE IF NOT EXISTS guilds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    leader_id TEXT NOT NULL,
    treasury INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    experience INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (leader_id) REFERENCES users(id)
  )`).run();

  // Create guild_members table
  db.prepare(`CREATE TABLE IF NOT EXISTS guild_members (
    guild_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    rank TEXT NOT NULL DEFAULT 'member',
    joined_at INTEGER NOT NULL,
    contribution INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();

  // Create guild_wars table
  db.prepare(`CREATE TABLE IF NOT EXISTS guild_wars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attacker_id INTEGER NOT NULL,
    defender_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    started_at INTEGER NOT NULL,
    ends_at INTEGER,
    FOREIGN KEY (attacker_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (defender_id) REFERENCES guilds(id) ON DELETE CASCADE
  )`).run();

  // Create guild_alliances table
  db.prepare(`CREATE TABLE IF NOT EXISTS guild_alliances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild1_id INTEGER NOT NULL,
    guild2_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (guild1_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (guild2_id) REFERENCES guilds(id) ON DELETE CASCADE
  )`).run();

  // Create guild_contributions table for tracking member contributions
  db.prepare(`CREATE TABLE IF NOT EXISTS guild_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();

  // Create guild_attacks table for PvP tracking
  db.prepare(`CREATE TABLE IF NOT EXISTS guild_attacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attacker_guild_id INTEGER NOT NULL,
    target_guild_id INTEGER NOT NULL,
    attack_type TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (attacker_guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (target_guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  )`).run();

  // Create guild_defenses table for tracking active defenses
  db.prepare(`CREATE TABLE IF NOT EXISTS guild_defenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    defense_type TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  )`).run();

  // Insert default properties if not present
  const existing = db.prepare('SELECT COUNT(*) AS count FROM properties').get().count;
  if (existing === 0) {
    const insert = db.prepare('INSERT INTO properties (id, name, price, rent) VALUES (?, ?, ?, ?)');
    for (const prop of config.immo.properties) {
      insert.run(prop.id, prop.name, prop.price, prop.rent);
    }
  }
}

// Create or get user row
function getUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    // Create new user with default values
    const startingBalance = config.economy.starting_balance || 0;
    db.prepare('INSERT INTO users (id, balance, bank_balance) VALUES (?, ?, ?)').run(userId, startingBalance * 100, 0);
    
    // Assign default housing (cardboard box)
    const defaultHousing = config.immo.default_housing;
    db.prepare('INSERT INTO user_properties (user_id, property_id, purchased_at, last_rent) VALUES (?, ?, ?, ?)').run(userId, defaultHousing.id, Date.now(), Date.now());
    
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  }
  return user;
}

function updateUser(userId, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const assignments = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  values.push(userId);
  db.prepare(`UPDATE users SET ${assignments} WHERE id = ?`).run(...values);
}

function adjustBalance(userId, delta) {
  const user = getUser(userId);
  const newBalance = Math.max(0, user.balance + delta);
  updateUser(userId, { balance: newBalance });
  return newBalance;
}

function adjustBankBalance(userId, delta) {
  const user = getUser(userId);
  const newBalance = Math.max(0, user.bank_balance + delta);
  updateUser(userId, { bank_balance: newBalance });
  return newBalance;
}

// Stable balance functions (sGKC)
function adjustStableBalance(userId, delta) {
  const user = getUser(userId);
  const newBalance = Math.max(0, user.stable_balance + delta);
  updateUser(userId, { stable_balance: newBalance });
  return newBalance;
}

// Staking: accrue staking interest before any operation
function updateStakingInterest(userId) {
  const user = getUser(userId);
  const amount = user.staking_balance || 0;
  if (amount <= 0) return { added: 0 };
  const now = Date.now();
  const last = user.staking_last || 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((now - last) / dayMs);
  if (days <= 0) return { added: 0 };
  // Use average daily yield from config range
  const range = config.crypto?.staking?.daily_yield_range || [0.003, 0.006];
  const avgRate = (range[0] + range[1]) / 2;
  const added = Math.floor(amount * avgRate * days);
  updateUser(userId, {
    staking_balance: amount + added,
    staking_last: last + days * dayMs
  });
  return { added };
}

function depositStake(userId, amountCents) {
  // move from stable_balance to staking_balance
  updateStakingInterest(userId);
  const user = getUser(userId);
  if (user.stable_balance < amountCents) throw new Error('Solde stable insuffisant');
  updateUser(userId, {
    stable_balance: user.stable_balance - amountCents,
    staking_balance: user.staking_balance + amountCents,
    staking_last: user.staking_last || Date.now()
  });
}

function withdrawStake(userId, amountCents) {
  updateStakingInterest(userId);
  const user = getUser(userId);
  const toWithdraw = Math.min(amountCents, user.staking_balance);
  updateUser(userId, {
    staking_balance: user.staking_balance - toWithdraw,
    stable_balance: user.stable_balance + toWithdraw
  });
  return toWithdraw;
}

// Crypto balance functions (BitGrok in satoshis)
function adjustCryptoBalance(userId, delta) {
  const user = getUser(userId);
  const newBalance = Math.max(0, (user.crypto_balance || 0) + delta);
  updateUser(userId, { crypto_balance: newBalance });
  return newBalance;
}

function adjustCryptoStaking(userId, delta) {
  const user = getUser(userId);
  const newBalance = Math.max(0, (user.crypto_staking || 0) + delta);
  updateUser(userId, { crypto_staking: newBalance });
  return newBalance;
}

// VIP system
function updateVipTier(userId, wageredAmount = 0) {
  const user = getUser(userId);
  const totalWagered = (user.total_wagered || 0) + wageredAmount;
  updateUser(userId, { total_wagered: totalWagered });
  
  let newTier = null;
  if (totalWagered >= 1000000) newTier = 'diamond';
  else if (totalWagered >= 200000) newTier = 'gold';
  else if (totalWagered >= 50000) newTier = 'silver';
  else if (totalWagered >= 10000) newTier = 'bronze';
  
  if (newTier !== user.vip_tier) {
    updateUser(userId, { vip_tier: newTier });
  }
  
  return newTier;
}

function getVipTier(userId) {
  const user = getUser(userId);
  return user.vip_tier;
}

// Mining nodes
function getNodeInfo(userId) {
  const user = getUser(userId);
  return { nodes: user.nodes || 0, last: user.last_node || 0 };
}

function addNode(userId) {
  const user = getUser(userId);
  updateUser(userId, {
    nodes: (user.nodes || 0) + 1,
    last_node: user.last_node || Date.now()
  });
}

function claimNodeYield(userId) {
  const user = getUser(userId);
  const nodes = user.nodes || 0;
  if (nodes <= 0) return { payout: 0 };
  const now = Date.now();
  const last = user.last_node || 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((now - last) / dayMs);
  if (days <= 0) return { payout: 0 };
  const yieldPerDay = config.crypto.node_daily_yield || 0;
  const costPerDay = config.crypto.node_daily_cost || 0;
  const netPerDay = yieldPerDay - costPerDay;
  const total = Math.floor(netPerDay * nodes * days);
  // credit to user balance
  adjustBalance(userId, total * 100); // convert GKC to cents
  updateUser(userId, { last_node: last + days * dayMs });
  return { payout: total };
}

function setJob(userId, job) {
  updateUser(userId, { job });
}

function updateShift(userId) {
  const now = Date.now();
  updateUser(userId, { last_shift: now, shifts_count: 1 });
}

function incrementShiftCount(userId) {
  const user = getUser(userId);
  const count = user.shifts_count || 0;
  updateUser(userId, { shifts_count: count + 1 });
}

function resetDailyShifts(userId) {
  updateUser(userId, { shifts_count: 0 });
}

// Loan functions
function getLoan(userId) {
  return db.prepare('SELECT * FROM loans WHERE user_id = ?').get(userId);
}

function createLoan(userId, principal, dailyRate) {
  const now = Date.now();
  db.prepare('INSERT INTO loans (user_id, principal, interest, last_update) VALUES (?, ?, 0, ?)').run(userId, principal, now);
}

function updateLoanInterest(userId) {
  const loan = getLoan(userId);
  if (!loan) return { added: 0 };
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((now - loan.last_update) / dayMs);
  if (days <= 0) return { added: 0 };
  const rate = config.economy.loan_interest_daily_pct;
  const added = Math.floor(loan.principal * rate * days);
  db.prepare('UPDATE loans SET interest = interest + ?, last_update = ? WHERE user_id = ?').run(added, loan.last_update + days * dayMs, userId);
  return { added };
}

function repayLoan(userId, amountCents) {
  const loan = getLoan(userId);
  if (!loan) return { repaid: 0 };
  // update interest first
  updateLoanInterest(userId);
  const current = getLoan(userId);
  let pay = amountCents;
  let interest = current.interest;
  let principal = current.principal;
  // Pay interest
  const payInterest = Math.min(pay, interest);
  interest -= payInterest;
  pay -= payInterest;
  // Pay principal
  const payPrincipal = Math.min(pay, principal);
  principal -= payPrincipal;
  pay -= payPrincipal;
  if (principal === 0 && interest === 0) {
    db.prepare('DELETE FROM loans WHERE user_id = ?').run(userId);
  } else {
    db.prepare('UPDATE loans SET principal = ?, interest = ? WHERE user_id = ?').run(principal, interest, userId);
  }
  return { principal, interest };
}

// Property functions
function getAllProperties() {
  return db.prepare('SELECT * FROM properties').all();
}

function getUserProperties(userId) {
  return db.prepare('SELECT p.* FROM user_properties up JOIN properties p ON up.property_id = p.id WHERE up.user_id = ?').all(userId);
}

function addPropertyToUser(userId, propId) {
  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(propId);
  if (!prop) throw new Error('Property not found');
  db.prepare('INSERT OR IGNORE INTO user_properties (user_id, property_id, purchased_at, last_rent) VALUES (?, ?, ?, ?)')
    .run(userId, propId, Date.now(), Date.now());
}

// Housing functions
function getUserHousing(userId) {
  return db.prepare(`
    SELECT p.*, up.last_rent 
    FROM user_properties up 
    JOIN properties p ON up.property_id = p.id 
    WHERE up.user_id = ? AND p.rent > 0
    ORDER BY p.rent ASC
    LIMIT 1
  `).get(userId);
}

function payRent(userId) {
  const housing = getUserHousing(userId);
  if (!housing) return { paid: 0, property: null };
  
  const user = getUser(userId);
  const rentCents = housing.rent * 100;
  
  if (user.balance >= rentCents) {
    adjustBalance(userId, -rentCents);
    db.prepare('UPDATE user_properties SET last_rent = ? WHERE user_id = ? AND property_id = ?')
      .run(Date.now(), userId, housing.id);
    return { paid: rentCents, property: housing };
  }
  
  return { paid: 0, property: housing };
}

function checkRentDue(userId) {
  const housing = getUserHousing(userId);
  if (!housing) return { due: false, daysLate: 0 };
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysSinceLastRent = Math.floor((now - housing.last_rent) / dayMs);
  
  return { 
    due: daysSinceLastRent >= 7, // Rent due weekly
    daysLate: Math.max(0, daysSinceLastRent - 7),
    housing: housing
  };
}
// Daily loss functions used to enforce casino loss cap

// Settings functions: store and retrieve persistent configuration values
function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value));
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

// News functions: manage dynamic CopaingCity news
function addNews(text, effect = null, durationHours = null) {
  const now = Date.now();
  let expiresAt = null;
  if (durationHours) {
    expiresAt = now + durationHours * 60 * 60 * 1000;
  }
  db.prepare('INSERT INTO news (text, effect, created_at, expires_at) VALUES (?, ?, ?, ?)').run(text, effect ? JSON.stringify(effect) : null, now, expiresAt);
}

function getActiveNews() {
  const now = Date.now();
  return db.prepare('SELECT id, text, effect, created_at, expires_at FROM news WHERE expires_at IS NULL OR expires_at > ? ORDER BY created_at DESC').all(now).map(n => {
    return {
      id: n.id,
      text: n.text,
      effect: n.effect ? JSON.parse(n.effect) : null,
      createdAt: n.created_at,
      expiresAt: n.expires_at
    };
  });
}

// Calculate total GKC in circulation (cash + bank) in cents
function getTotalCirculation() {
  const row = db.prepare('SELECT SUM(balance) AS bal, SUM(bank_balance) AS bank FROM users').get();
  const total = (row?.bal || 0) + (row?.bank || 0);
  return total;
}

// Guild functions
function createGuild(name, description, leaderId) {
  const now = Date.now();
  const result = db.prepare('INSERT INTO guilds (name, description, leader_id, created_at) VALUES (?, ?, ?, ?)').run(name, description, leaderId, now);
  const guildId = result.lastInsertRowid;
  
  // Add leader as member
  db.prepare('INSERT INTO guild_members (guild_id, user_id, rank, joined_at) VALUES (?, ?, ?, ?)').run(guildId, leaderId, 'leader', now);
  
  return guildId;
}

function getGuildByName(name) {
  return db.prepare('SELECT * FROM guilds WHERE name = ?').get(name);
}

function getUserGuild(userId) {
  return db.prepare(`
    SELECT g.*, gm.rank, gm.joined_at, gm.contribution 
    FROM guilds g 
    JOIN guild_members gm ON g.id = gm.guild_id 
    WHERE gm.user_id = ?
  `).get(userId);
}

function getAllGuilds() {
  return db.prepare('SELECT * FROM guilds ORDER BY level DESC, experience DESC').all();
}

function joinGuild(userId, guildId) {
  const now = Date.now();
  db.prepare('INSERT INTO guild_members (guild_id, user_id, rank, joined_at) VALUES (?, ?, ?, ?)').run(guildId, userId, 'member', now);
  db.prepare('UPDATE users SET guild_id = ? WHERE id = ?').run(guildId, userId);
}

function leaveGuild(userId) {
  db.prepare('DELETE FROM guild_members WHERE user_id = ?').run(userId);
  db.prepare('UPDATE users SET guild_id = NULL WHERE id = ?').run(userId);
}

function getGuildMembers(guildId) {
  return db.prepare('SELECT * FROM guild_members WHERE guild_id = ? ORDER BY rank DESC, joined_at ASC').all(guildId);
}

function getGuildMember(guildId, userId) {
  return db.prepare('SELECT * FROM guild_members WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
}

function adjustGuildTreasury(guildId, delta) {
  const guild = db.prepare('SELECT treasury FROM guilds WHERE id = ?').get(guildId);
  const newTreasury = Math.max(0, guild.treasury + delta);
  db.prepare('UPDATE guilds SET treasury = ? WHERE id = ?').run(newTreasury, guildId);
  return newTreasury;
}

function addGuildExperience(guildId, exp) {
  const guild = db.prepare('SELECT level, experience FROM guilds WHERE id = ?').get(guildId);
  let newExp = guild.experience + exp;
  let newLevel = guild.level;
  
  // Level up logic
  const expNeeded = newLevel * 1000;
  if (newExp >= expNeeded) {
    newLevel++;
    newExp -= expNeeded;
  }
  
  db.prepare('UPDATE guilds SET level = ?, experience = ? WHERE id = ?').run(newLevel, newExp, guildId);
}

function getGuildWars(guildId) {
  return db.prepare(`
    SELECT gw.*, 
           CASE WHEN gw.attacker_id = ? THEN g2.name ELSE g1.name END as target_name
    FROM guild_wars gw
    JOIN guilds g1 ON gw.attacker_id = g1.id
    JOIN guilds g2 ON gw.defender_id = g2.id
    WHERE (gw.attacker_id = ? OR gw.defender_id = ?) AND gw.status = 'active'
  `).all(guildId, guildId, guildId);
}

function getGuildAlliances(guildId) {
  return db.prepare(`
    SELECT ga.*, 
           CASE WHEN ga.guild1_id = ? THEN g2.name ELSE g1.name END as ally_name
    FROM guild_alliances ga
    JOIN guilds g1 ON ga.guild1_id = g1.id
    JOIN guilds g2 ON ga.guild2_id = g2.id
    WHERE (ga.guild1_id = ? OR ga.guild2_id = ?) AND ga.status = 'active'
  `).all(guildId, guildId, guildId);
}

// New guild PvP functions
function declareWar(attackerGuildId, defenderGuildId) {
  const now = Date.now();
  const endsAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days
  db.prepare('INSERT INTO guild_wars (attacker_id, defender_id, started_at, ends_at) VALUES (?, ?, ?, ?)').run(attackerGuildId, defenderGuildId, now, endsAt);
}

function getWarBetweenGuilds(guild1Id, guild2Id) {
  return db.prepare(`
    SELECT * FROM guild_wars 
    WHERE ((attacker_id = ? AND defender_id = ?) OR (attacker_id = ? AND defender_id = ?)) 
    AND status = 'active' AND ends_at > ?
  `).get(guild1Id, guild2Id, guild2Id, guild1Id, Date.now());
}

function recordGuildAttack(attackerGuildId, targetGuildId, attackType, success) {
  const now = Date.now();
  db.prepare('INSERT INTO guild_attacks (attacker_guild_id, target_guild_id, attack_type, success, timestamp) VALUES (?, ?, ?, ?, ?)').run(attackerGuildId, targetGuildId, attackType, success, now);
}

function getGuildRecentAttacks(guildId, hours = 24) {
  const since = Date.now() - (hours * 60 * 60 * 1000);
  return db.prepare('SELECT * FROM guild_attacks WHERE (attacker_guild_id = ? OR target_guild_id = ?) AND timestamp > ?').all(guildId, guildId, since);
}

function activateGuildDefense(guildId, defenseType, durationHours) {
  const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
  db.prepare('INSERT INTO guild_defenses (guild_id, defense_type, expires_at) VALUES (?, ?, ?)').run(guildId, defenseType, expiresAt);
}

function hasActiveDefense(guildId, defenseType) {
  const now = Date.now();
  const defense = db.prepare('SELECT * FROM guild_defenses WHERE guild_id = ? AND defense_type = ? AND expires_at > ?').get(guildId, defenseType, now);
  return !!defense;
}

function recordGuildContribution(guildId, userId, amount) {
  const now = Date.now();
  db.prepare('INSERT INTO guild_contributions (guild_id, user_id, amount, timestamp) VALUES (?, ?, ?, ?)').run(guildId, userId, amount, now);
}

function getGuildContributions(guildId, limit = 10) {
  return db.prepare('SELECT * FROM guild_contributions WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?').all(guildId, limit);
}

function proposeAlliance(guild1Id, guild2Id) {
  const now = Date.now();
  db.prepare('INSERT INTO guild_alliances (guild1_id, guild2_id, status, created_at) VALUES (?, ?, ?, ?)').run(guild1Id, guild2Id, 'pending', now);
}

function getAllianceBetweenGuilds(guild1Id, guild2Id) {
  return db.prepare(`
    SELECT * FROM guild_alliances 
    WHERE ((guild1_id = ? AND guild2_id = ?) OR (guild1_id = ? AND guild2_id = ?)) 
    AND status IN ('pending', 'active')
  `).get(guild1Id, guild2Id, guild2Id, guild1Id);
}

function getGuild(guildId) {
  return db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
}

export default {
  init,
  getUser,
  updateUser,
  adjustBalance,
  adjustBankBalance,
  setJob,
  updateShift,
  incrementShiftCount,
  resetDailyShifts,
  getLoan,
  createLoan,
  updateLoanInterest,
  repayLoan,
  getAllProperties,
  getUserProperties,
  addPropertyToUser
  ,
  // Housing functions
  getUserHousing,
  payRent,
  checkRentDue,
  // Stablecoin and staking functions
  adjustStableBalance,
  updateStakingInterest,
  depositStake,
  withdrawStake,
  // Mining node functions
  getNodeInfo,
  addNode,
  claimNodeYield
  ,
  // Crypto functions
  adjustCryptoBalance,
  adjustCryptoStaking,
  updateVipTier,
  getVipTier,
  // Daily loss functions (removed caps but kept functions for compatibility)
  getDailyLoss: (userId) => 0, // Always return 0 since no caps
  addDailyLoss: (userId, amount) => {}, // Do nothing since no caps
  // Settings and news functions
  setSetting,
  getSetting,
  addNews,
  getActiveNews,
  getTotalCirculation,
  // Guild functions
  createGuild,
  getGuildByName,
  getUserGuild,
  getAllGuilds,
  joinGuild,
  leaveGuild,
  getGuildMembers,
  getGuildMember,
  adjustGuildTreasury,
  addGuildExperience,
  getGuildWars,
  getGuildAlliances,
  // New PvP functions
  declareWar,
  getWarBetweenGuilds,
  recordGuildAttack,
  getGuildRecentAttacks,
  activateGuildDefense,
  hasActiveDefense,
  recordGuildContribution,
  getGuildContributions,
  proposeAlliance,
  getAllianceBetweenGuilds,
  getGuild
};