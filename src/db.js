import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Load configuration
const configPath = new URL('./config.json', import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath));

// Create libsql client
const db = createClient({
  url: 'file:grokcoin.db'
});

// Cache for user data to improve performance
const userCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}

// Clear cache every 5 minutes
setInterval(clearExpiredCache, 5 * 60 * 1000);

// Initialise tables
async function init() {
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    alias TEXT,
    job TEXT,
    balance INTEGER NOT NULL,
    bank_balance INTEGER NOT NULL,
    last_shift INTEGER DEFAULT 0,
    shifts_count INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 0,
    criminal_record INTEGER DEFAULT 0,
    last_interest INTEGER DEFAULT 0,
    daily_loss INTEGER DEFAULT 0,
    loss_day INTEGER DEFAULT 0,
    stable_balance INTEGER NOT NULL DEFAULT 0,
    staking_balance INTEGER NOT NULL DEFAULT 0,
    staking_last INTEGER NOT NULL DEFAULT 0,
    nodes INTEGER NOT NULL DEFAULT 0,
    last_node INTEGER NOT NULL DEFAULT 0,
    crypto_balance INTEGER NOT NULL DEFAULT 0,
    crypto_staking INTEGER NOT NULL DEFAULT 0,
    staking_last_claim INTEGER NOT NULL DEFAULT 0,
    vip_tier TEXT DEFAULT NULL,
    total_wagered INTEGER NOT NULL DEFAULT 0,
    guild_id INTEGER DEFAULT NULL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS loans (
    user_id TEXT PRIMARY KEY,
    principal INTEGER NOT NULL,
    interest INTEGER NOT NULL DEFAULT 0,
    last_update INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    rent INTEGER NOT NULL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS user_properties (
    user_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    purchased_at INTEGER NOT NULL,
    last_rent INTEGER NOT NULL,
    PRIMARY KEY (user_id, property_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    effect TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS guilds (
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
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS guild_members (
    guild_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    rank TEXT NOT NULL DEFAULT 'member',
    joined_at INTEGER NOT NULL,
    contribution INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS guild_wars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attacker_id INTEGER NOT NULL,
    defender_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    started_at INTEGER NOT NULL,
    ends_at INTEGER,
    FOREIGN KEY (attacker_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (defender_id) REFERENCES guilds(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS guild_alliances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild1_id INTEGER NOT NULL,
    guild2_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (guild1_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (guild2_id) REFERENCES guilds(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS guild_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS guild_attacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attacker_guild_id INTEGER NOT NULL,
    target_guild_id INTEGER NOT NULL,
    attack_type TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (attacker_guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (target_guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS guild_defenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    defense_type TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  )`);

  // Insert default properties if not present
  const existing = await db.execute('SELECT COUNT(*) AS count FROM properties');
  if (existing.rows[0].count === 0) {
    for (const prop of config.immo.properties) {
      await db.execute('INSERT INTO properties (id, name, price, rent) VALUES (?, ?, ?, ?)', [prop.id, prop.name, prop.price, prop.rent]);
    }
  }
}

// Create or get user row with caching
async function getUser(userId) {
  // Check cache first
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const result = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
  let user = result.rows[0];
  
  if (!user) {
    // Create new user with default values
    const startingBalance = config.economy.starting_balance || 0;
    await db.execute('INSERT INTO users (id, balance, bank_balance) VALUES (?, ?, ?)', [userId, startingBalance * 100, 0]);
    
    // Assign default housing (cardboard box)
    const defaultHousing = config.immo.default_housing;
    await db.execute('INSERT INTO user_properties (user_id, property_id, purchased_at, last_rent) VALUES (?, ?, ?, ?)', [userId, defaultHousing.id, Date.now(), Date.now()]);
    
    const newResult = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    user = newResult.rows[0];
  }

  // Cache the user data
  userCache.set(userId, {
    data: user,
    timestamp: Date.now()
  });

  return user;
}

async function updateUser(userId, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  
  const assignments = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  values.push(userId);
  
  await db.execute(`UPDATE users SET ${assignments} WHERE id = ?`, values);
  
  // Invalidate cache
  userCache.delete(userId);
}

async function adjustBalance(userId, delta) {
  const user = await getUser(userId);
  const newBalance = Math.max(0, user.balance + delta);
  await updateUser(userId, { balance: newBalance });
  return newBalance;
}

async function adjustBankBalance(userId, delta) {
  const user = await getUser(userId);
  const newBalance = Math.max(0, user.bank_balance + delta);
  await updateUser(userId, { bank_balance: newBalance });
  return newBalance;
}

// Stable balance functions (sGKC)
async function adjustStableBalance(userId, delta) {
  const user = await getUser(userId);
  const newBalance = Math.max(0, user.stable_balance + delta);
  await updateUser(userId, { stable_balance: newBalance });
  return newBalance;
}

// Staking: accrue staking interest before any operation
async function updateStakingInterest(userId) {
  const user = await getUser(userId);
  const amount = user.staking_balance || 0;
  if (amount <= 0) return { added: 0 };
  const now = Date.now();
  const last = user.staking_last || 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((now - last) / dayMs);
  if (days <= 0) return { added: 0 };
  
  const range = config.crypto?.staking?.daily_yield_range || [0.003, 0.006];
  const avgRate = (range[0] + range[1]) / 2;
  const added = Math.floor(amount * avgRate * days);
  
  await updateUser(userId, {
    staking_balance: amount + added,
    staking_last: last + days * dayMs
  });
  
  return { added };
}

async function depositStake(userId, amountCents) {
  await updateStakingInterest(userId);
  const user = await getUser(userId);
  if (user.stable_balance < amountCents) throw new Error('Solde stable insuffisant');
  
  await updateUser(userId, {
    stable_balance: user.stable_balance - amountCents,
    staking_balance: user.staking_balance + amountCents,
    staking_last: user.staking_last || Date.now()
  });
}

async function withdrawStake(userId, amountCents) {
  await updateStakingInterest(userId);
  const user = await getUser(userId);
  const toWithdraw = Math.min(amountCents, user.staking_balance);
  
  await updateUser(userId, {
    staking_balance: user.staking_balance - toWithdraw,
    stable_balance: user.stable_balance + toWithdraw
  });
  
  return toWithdraw;
}

// Crypto balance functions (BitGrok in satoshis)
async function adjustCryptoBalance(userId, delta) {
  const user = await getUser(userId);
  const newBalance = Math.max(0, (user.crypto_balance || 0) + delta);
  await updateUser(userId, { crypto_balance: newBalance });
  return newBalance;
}

async function adjustCryptoStaking(userId, delta) {
  const user = await getUser(userId);
  const newBalance = Math.max(0, (user.crypto_staking || 0) + delta);
  await updateUser(userId, { crypto_staking: newBalance });
  return newBalance;
}

// VIP system
async function updateVipTier(userId, wageredAmount = 0) {
  const user = await getUser(userId);
  const totalWagered = (user.total_wagered || 0) + wageredAmount;
  await updateUser(userId, { total_wagered: totalWagered });
  
  let newTier = null;
  if (totalWagered >= 1000000) newTier = 'diamond';
  else if (totalWagered >= 200000) newTier = 'gold';
  else if (totalWagered >= 50000) newTier = 'silver';
  else if (totalWagered >= 10000) newTier = 'bronze';
  
  if (newTier !== user.vip_tier) {
    await updateUser(userId, { vip_tier: newTier });
  }
  
  return newTier;
}

async function getVipTier(userId) {
  const user = await getUser(userId);
  return user.vip_tier;
}

// Mining nodes
async function getNodeInfo(userId) {
  const user = await getUser(userId);
  return { nodes: user.nodes || 0, last: user.last_node || 0 };
}

async function addNode(userId) {
  const user = await getUser(userId);
  await updateUser(userId, {
    nodes: (user.nodes || 0) + 1,
    last_node: user.last_node || Date.now()
  });
}

async function claimNodeYield(userId) {
  const user = await getUser(userId);
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
  
  await adjustBalance(userId, total * 100);
  await updateUser(userId, { last_node: last + days * dayMs });
  
  return { payout: total };
}

async function setJob(userId, job) {
  await updateUser(userId, { job });
}

async function updateShift(userId) {
  const now = Date.now();
  await updateUser(userId, { last_shift: now, shifts_count: 1 });
}

async function incrementShiftCount(userId) {
  const user = await getUser(userId);
  const count = user.shifts_count || 0;
  await updateUser(userId, { shifts_count: count + 1 });
}

async function resetDailyShifts(userId) {
  await updateUser(userId, { shifts_count: 0 });
}

// Loan functions
async function getLoan(userId) {
  const result = await db.execute('SELECT * FROM loans WHERE user_id = ?', [userId]);
  return result.rows[0];
}

async function createLoan(userId, principal, dailyRate) {
  const now = Date.now();
  await db.execute('INSERT INTO loans (user_id, principal, interest, last_update) VALUES (?, ?, 0, ?)', [userId, principal, now]);
}

async function updateLoanInterest(userId) {
  const loan = await getLoan(userId);
  if (!loan) return { added: 0 };
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((now - loan.last_update) / dayMs);
  if (days <= 0) return { added: 0 };
  
  const rate = config.economy.loan_interest_daily_pct;
  const added = Math.floor(loan.principal * rate * days);
  
  await db.execute('UPDATE loans SET interest = interest + ?, last_update = ? WHERE user_id = ?', [added, loan.last_update + days * dayMs, userId]);
  
  return { added };
}

async function repayLoan(userId, amountCents) {
  const loan = await getLoan(userId);
  if (!loan) return { repaid: 0 };
  
  await updateLoanInterest(userId);
  const current = await getLoan(userId);
  
  let pay = amountCents;
  let interest = current.interest;
  let principal = current.principal;
  
  const payInterest = Math.min(pay, interest);
  interest -= payInterest;
  pay -= payInterest;
  
  const payPrincipal = Math.min(pay, principal);
  principal -= payPrincipal;
  pay -= payPrincipal;
  
  if (principal === 0 && interest === 0) {
    await db.execute('DELETE FROM loans WHERE user_id = ?', [userId]);
  } else {
    await db.execute('UPDATE loans SET principal = ?, interest = ? WHERE user_id = ?', [principal, interest, userId]);
  }
  
  return { principal, interest };
}

// Property functions
async function getAllProperties() {
  const result = await db.execute('SELECT * FROM properties');
  return result.rows;
}

async function getUserProperties(userId) {
  const result = await db.execute('SELECT p.* FROM user_properties up JOIN properties p ON up.property_id = p.id WHERE up.user_id = ?', [userId]);
  return result.rows;
}

async function addPropertyToUser(userId, propId) {
  const propResult = await db.execute('SELECT * FROM properties WHERE id = ?', [propId]);
  if (propResult.rows.length === 0) throw new Error('Property not found');
  
  await db.execute('INSERT OR IGNORE INTO user_properties (user_id, property_id, purchased_at, last_rent) VALUES (?, ?, ?, ?)', [userId, propId, Date.now(), Date.now()]);
}

// Housing functions
async function getUserHousing(userId) {
  const result = await db.execute(`
    SELECT p.*, up.last_rent 
    FROM user_properties up 
    JOIN properties p ON up.property_id = p.id 
    WHERE up.user_id = ? AND p.rent > 0
    ORDER BY p.rent ASC
    LIMIT 1
  `, [userId]);
  return result.rows[0];
}

async function payRent(userId) {
  const housing = await getUserHousing(userId);
  if (!housing) return { paid: 0, property: null };
  
  const user = await getUser(userId);
  const rentCents = housing.rent * 100;
  
  if (user.balance >= rentCents) {
    await adjustBalance(userId, -rentCents);
    await db.execute('UPDATE user_properties SET last_rent = ? WHERE user_id = ? AND property_id = ?', [Date.now(), userId, housing.id]);
    return { paid: rentCents, property: housing };
  }
  
  return { paid: 0, property: housing };
}

async function checkRentDue(userId) {
  const housing = await getUserHousing(userId);
  if (!housing) return { due: false, daysLate: 0 };
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysSinceLastRent = Math.floor((now - housing.last_rent) / dayMs);
  
  return { 
    due: daysSinceLastRent >= 7,
    daysLate: Math.max(0, daysSinceLastRent - 7),
    housing: housing
  };
}

// Settings functions
async function setSetting(key, value) {
  await db.execute('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, JSON.stringify(value)]);
}

async function getSetting(key) {
  const result = await db.execute('SELECT value FROM settings WHERE key = ?', [key]);
  if (result.rows.length === 0) return null;
  
  try {
    return JSON.parse(result.rows[0].value);
  } catch {
    return result.rows[0].value;
  }
}

// News functions
async function addNews(text, effect = null, durationHours = null) {
  const now = Date.now();
  let expiresAt = null;
  if (durationHours) {
    expiresAt = now + durationHours * 60 * 60 * 1000;
  }
  await db.execute('INSERT INTO news (text, effect, created_at, expires_at) VALUES (?, ?, ?, ?)', [text, effect ? JSON.stringify(effect) : null, now, expiresAt]);
}

async function getActiveNews() {
  const now = Date.now();
  const result = await db.execute('SELECT id, text, effect, created_at, expires_at FROM news WHERE expires_at IS NULL OR expires_at > ? ORDER BY created_at DESC', [now]);
  
  return result.rows.map(n => ({
    id: n.id,
    text: n.text,
    effect: n.effect ? JSON.parse(n.effect) : null,
    createdAt: n.created_at,
    expiresAt: n.expires_at
  }));
}

// Calculate total GKC in circulation
async function getTotalCirculation() {
  const result = await db.execute('SELECT SUM(balance) AS bal, SUM(bank_balance) AS bank FROM users');
  const row = result.rows[0];
  const total = (row?.bal || 0) + (row?.bank || 0);
  return total;
}

// Guild functions
async function createGuild(name, description, leaderId) {
  const now = Date.now();
  const result = await db.execute('INSERT INTO guilds (name, description, leader_id, created_at) VALUES (?, ?, ?, ?)', [name, description, leaderId, now]);
  const guildId = result.meta.last_insert_rowid;
  
  await db.execute('INSERT INTO guild_members (guild_id, user_id, rank, joined_at) VALUES (?, ?, ?, ?)', [guildId, leaderId, 'leader', now]);
  
  return guildId;
}

async function getGuildByName(name) {
  const result = await db.execute('SELECT * FROM guilds WHERE name = ?', [name]);
  return result.rows[0];
}

async function getUserGuild(userId) {
  const result = await db.execute(`
    SELECT g.*, gm.rank, gm.joined_at, gm.contribution 
    FROM guilds g 
    JOIN guild_members gm ON g.id = gm.guild_id 
    WHERE gm.user_id = ?
  `, [userId]);
  return result.rows[0];
}

async function getAllGuilds() {
  const result = await db.execute('SELECT * FROM guilds ORDER BY level DESC, experience DESC');
  return result.rows;
}

async function joinGuild(userId, guildId) {
  const now = Date.now();
  await db.execute('INSERT INTO guild_members (guild_id, user_id, rank, joined_at) VALUES (?, ?, ?, ?)', [guildId, userId, 'member', now]);
  await db.execute('UPDATE users SET guild_id = ? WHERE id = ?', [guildId, userId]);
}

async function leaveGuild(userId) {
  await db.execute('DELETE FROM guild_members WHERE user_id = ?', [userId]);
  await db.execute('UPDATE users SET guild_id = NULL WHERE id = ?', [userId]);
}

async function getGuildMembers(guildId) {
  const result = await db.execute('SELECT * FROM guild_members WHERE guild_id = ? ORDER BY rank DESC, joined_at ASC', [guildId]);
  return result.rows;
}

async function getGuildMember(guildId, userId) {
  const result = await db.execute('SELECT * FROM guild_members WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
  return result.rows[0];
}

async function adjustGuildTreasury(guildId, delta) {
  const result = await db.execute('SELECT treasury FROM guilds WHERE id = ?', [guildId]);
  const guild = result.rows[0];
  const newTreasury = Math.max(0, guild.treasury + delta);
  await db.execute('UPDATE guilds SET treasury = ? WHERE id = ?', [newTreasury, guildId]);
  return newTreasury;
}

async function addGuildExperience(guildId, exp) {
  const result = await db.execute('SELECT level, experience FROM guilds WHERE id = ?', [guildId]);
  const guild = result.rows[0];
  let newExp = guild.experience + exp;
  let newLevel = guild.level;
  
  const expNeeded = newLevel * 1000;
  if (newExp >= expNeeded) {
    newLevel++;
    newExp -= expNeeded;
  }
  
  await db.execute('UPDATE guilds SET level = ?, experience = ? WHERE id = ?', [newLevel, newExp, guildId]);
}

async function getGuildWars(guildId) {
  const result = await db.execute(`
    SELECT gw.*, 
           CASE WHEN gw.attacker_id = ? THEN g2.name ELSE g1.name END as target_name
    FROM guild_wars gw
    JOIN guilds g1 ON gw.attacker_id = g1.id
    JOIN guilds g2 ON gw.defender_id = g2.id
    WHERE (gw.attacker_id = ? OR gw.defender_id = ?) AND gw.status = 'active'
  `, [guildId, guildId, guildId]);
  return result.rows;
}

async function getGuildAlliances(guildId) {
  const result = await db.execute(`
    SELECT ga.*, 
           CASE WHEN ga.guild1_id = ? THEN g2.name ELSE g1.name END as ally_name
    FROM guild_alliances ga
    JOIN guilds g1 ON ga.guild1_id = g1.id
    JOIN guilds g2 ON ga.guild2_id = g2.id
    WHERE (ga.guild1_id = ? OR ga.guild2_id = ?) AND ga.status = 'active'
  `, [guildId, guildId, guildId]);
  return result.rows;
}

async function declareWar(attackerGuildId, defenderGuildId) {
  const now = Date.now();
  const endsAt = now + (7 * 24 * 60 * 60 * 1000);
  await db.execute('INSERT INTO guild_wars (attacker_id, defender_id, started_at, ends_at) VALUES (?, ?, ?, ?)', [attackerGuildId, defenderGuildId, now, endsAt]);
}

async function getWarBetweenGuilds(guild1Id, guild2Id) {
  const result = await db.execute(`
    SELECT * FROM guild_wars 
    WHERE ((attacker_id = ? AND defender_id = ?) OR (attacker_id = ? AND defender_id = ?)) 
    AND status = 'active' AND ends_at > ?
  `, [guild1Id, guild2Id, guild2Id, guild1Id, Date.now()]);
  return result.rows[0];
}

async function recordGuildAttack(attackerGuildId, targetGuildId, attackType, success) {
  const now = Date.now();
  await db.execute('INSERT INTO guild_attacks (attacker_guild_id, target_guild_id, attack_type, success, timestamp) VALUES (?, ?, ?, ?, ?)', [attackerGuildId, targetGuildId, attackType, success, now]);
}

async function getGuildRecentAttacks(guildId, hours = 24) {
  const since = Date.now() - (hours * 60 * 60 * 1000);
  const result = await db.execute('SELECT * FROM guild_attacks WHERE (attacker_guild_id = ? OR target_guild_id = ?) AND timestamp > ?', [guildId, guildId, since]);
  return result.rows;
}

async function activateGuildDefense(guildId, defenseType, durationHours) {
  const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
  await db.execute('INSERT INTO guild_defenses (guild_id, defense_type, expires_at) VALUES (?, ?, ?)', [guildId, defenseType, expiresAt]);
}

async function hasActiveDefense(guildId, defenseType) {
  const now = Date.now();
  const result = await db.execute('SELECT * FROM guild_defenses WHERE guild_id = ? AND defense_type = ? AND expires_at > ?', [guildId, defenseType, now]);
  return result.rows.length > 0;
}

async function recordGuildContribution(guildId, userId, amount) {
  const now = Date.now();
  await db.execute('INSERT INTO guild_contributions (guild_id, user_id, amount, timestamp) VALUES (?, ?, ?, ?)', [guildId, userId, amount, now]);
}

async function getGuildContributions(guildId, limit = 10) {
  const result = await db.execute('SELECT * FROM guild_contributions WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?', [guildId, limit]);
  return result.rows;
}

async function proposeAlliance(guild1Id, guild2Id) {
  const now = Date.now();
  await db.execute('INSERT INTO guild_alliances (guild1_id, guild2_id, status, created_at) VALUES (?, ?, ?, ?)', [guild1Id, guild2Id, 'pending', now]);
}

async function getAllianceBetweenGuilds(guild1Id, guild2Id) {
  const result = await db.execute(`
    SELECT * FROM guild_alliances 
    WHERE ((guild1_id = ? AND guild2_id = ?) OR (guild1_id = ? AND guild2_id = ?)) 
    AND status IN ('pending', 'active')
  `, [guild1Id, guild2Id, guild2Id, guild1Id]);
  return result.rows[0];
}

async function getGuild(guildId) {
  const result = await db.execute('SELECT * FROM guilds WHERE id = ?', [guildId]);
  return result.rows[0];
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
  addPropertyToUser,
  getUserHousing,
  payRent,
  checkRentDue,
  adjustStableBalance,
  updateStakingInterest,
  depositStake,
  withdrawStake,
  getNodeInfo,
  addNode,
  claimNodeYield,
  adjustCryptoBalance,
  adjustCryptoStaking,
  updateVipTier,
  getVipTier,
  getDailyLoss: (userId) => 0,
  addDailyLoss: (userId, amount) => {},
  setSetting,
  getSetting,
  addNews,
  getActiveNews,
  getTotalCirculation,
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