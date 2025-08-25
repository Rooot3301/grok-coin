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

// Daily loss functions used to enforce casino loss cap
function getDailyLoss(userId) {
  const user = getUser(userId);
  const today = new Date().toDateString();
  const lossDay = user.loss_day ? new Date(user.loss_day).toDateString() : null;
  if (lossDay !== today) {
    // reset counter
    updateUser(userId, { daily_loss: 0, loss_day: Date.now() });
    return 0;
  }
  return user.daily_loss || 0;
}

function addDailyLoss(userId, amountCents) {
  const currentLoss = getDailyLoss(userId);
  const newLoss = currentLoss + amountCents;
  updateUser(userId, { daily_loss: newLoss, loss_day: Date.now() });
  return newLoss;
}

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
  getDailyLoss,
  addDailyLoss
  ,
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
  // Settings and news functions
  setSetting,
  getSetting,
  addNews,
  getActiveNews,
  getTotalCirculation
};