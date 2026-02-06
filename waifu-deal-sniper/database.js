// =====================================
// 💾 DATABASE - sql.js User Management
// Pure JavaScript SQLite (no native compilation!)
// =====================================

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './data/waifu.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
let SQL = null;
let initialized = false;

// Initialize database
async function initDb() {
  if (initialized && db) return db;
  
  SQL = await initSqlJs();
  
  // Load existing database or create new
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }
  
  // Initialize tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT UNIQUE NOT NULL,
      username TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_searches INTEGER DEFAULT 0,
      deals_found INTEGER DEFAULT 0
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      query TEXT NOT NULL,
      max_price INTEGER DEFAULT 999999,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_checked DATETIME,
      times_notified INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, query)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      query TEXT NOT NULL,
      results_count INTEGER DEFAULT 0,
      searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS notified_deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_url TEXT NOT NULL,
      notified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, product_url)
    )
  `);
  
  // Create indexes
  try {
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_discord ON users(discord_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_watchlist_active ON watchlist(active)`);
  } catch (e) {
    // Indexes might already exist
  }
  
  initialized = true;
  saveDb();
  return db;
}

// Save database to file
function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

// Auto-save every 30 seconds
setInterval(saveDb, 30000);

// Helper to run queries
function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDb();
}

function get(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// ===== USER FUNCTIONS =====

function getOrCreateUser(discordId, username = null) {
  let user = get('SELECT * FROM users WHERE discord_id = ?', [discordId]);
  
  if (!user) {
    run('INSERT INTO users (discord_id, username) VALUES (?, ?)', [discordId, username]);
    user = get('SELECT * FROM users WHERE discord_id = ?', [discordId]);
  } else if (username && user.username !== username) {
    run('UPDATE users SET username = ? WHERE id = ?', [username, user.id]);
  }
  
  return user;
}

function updateUserActivity(discordId) {
  run('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE discord_id = ?', [discordId]);
}

function incrementSearchCount(userId) {
  run('UPDATE users SET total_searches = total_searches + 1 WHERE id = ?', [userId]);
}

function incrementDealsFound(userId, count = 1) {
  run('UPDATE users SET deals_found = deals_found + ? WHERE id = ?', [count, userId]);
}

function isNewUser(discordId) {
  const user = get('SELECT total_searches FROM users WHERE discord_id = ?', [discordId]);
  return !user || user.total_searches === 0;
}

// ===== WATCHLIST FUNCTIONS =====

function addToWatchlist(userId, query, maxPrice = 999999) {
  const existing = get(
    'SELECT id FROM watchlist WHERE user_id = ? AND query = ?',
    [userId, query.toLowerCase()]
  );
  
  if (existing) {
    run(
      'UPDATE watchlist SET max_price = ?, active = 1 WHERE id = ?',
      [maxPrice, existing.id]
    );
    return { success: true, new: false };
  }
  
  run(
    'INSERT INTO watchlist (user_id, query, max_price) VALUES (?, ?, ?)',
    [userId, query.toLowerCase(), maxPrice]
  );
  return { success: true, new: true };
}

function removeFromWatchlist(userId, query) {
  const before = get('SELECT COUNT(*) as count FROM watchlist WHERE user_id = ? AND active = 1', [userId]);
  run(
    'UPDATE watchlist SET active = 0 WHERE user_id = ? AND query LIKE ?',
    [userId, `%${query.toLowerCase()}%`]
  );
  const after = get('SELECT COUNT(*) as count FROM watchlist WHERE user_id = ? AND active = 1', [userId]);
  return before.count > after.count;
}

function getUserWatchlist(userId) {
  return all(
    'SELECT * FROM watchlist WHERE user_id = ? AND active = 1 ORDER BY created_at DESC',
    [userId]
  );
}

function getAllActiveWatches() {
  return all(`
    SELECT w.*, u.discord_id 
    FROM watchlist w 
    JOIN users u ON w.user_id = u.id 
    WHERE w.active = 1
  `);
}

function updateWatchChecked(watchId) {
  run('UPDATE watchlist SET last_checked = CURRENT_TIMESTAMP WHERE id = ?', [watchId]);
}

function incrementWatchNotified(watchId) {
  run('UPDATE watchlist SET times_notified = times_notified + 1 WHERE id = ?', [watchId]);
}

// ===== NOTIFICATION DEDUP =====

function hasBeenNotified(userId, productUrl) {
  const result = get(
    'SELECT 1 FROM notified_deals WHERE user_id = ? AND product_url = ?',
    [userId, productUrl]
  );
  return !!result;
}

function markNotified(userId, productUrl) {
  try {
    run(
      'INSERT OR IGNORE INTO notified_deals (user_id, product_url) VALUES (?, ?)',
      [userId, productUrl]
    );
  } catch (e) {
    // Ignore duplicates
  }
}

// ===== SEARCH HISTORY =====

function logSearch(userId, query, resultsCount) {
  run(
    'INSERT INTO search_history (user_id, query, results_count) VALUES (?, ?, ?)',
    [userId, query, resultsCount]
  );
}

// ===== STATS =====

function getStats() {
  const users = get('SELECT COUNT(*) as count FROM users');
  const searches = get('SELECT SUM(total_searches) as count FROM users');
  const watches = get('SELECT COUNT(*) as count FROM watchlist WHERE active = 1');
  
  return {
    totalUsers: users?.count || 0,
    totalSearches: searches?.count || 0,
    activeWatches: watches?.count || 0,
  };
}

function getUserStats(discordId) {
  const user = get('SELECT * FROM users WHERE discord_id = ?', [discordId]);
  if (!user) return null;
  
  const watches = get(
    'SELECT COUNT(*) as count FROM watchlist WHERE user_id = ? AND active = 1',
    [user.id]
  );
  
  return {
    ...user,
    active_watches: watches?.count || 0,
  };
}

module.exports = {
  initDb,
  getOrCreateUser,
  updateUserActivity,
  incrementSearchCount,
  incrementDealsFound,
  isNewUser,
  addToWatchlist,
  removeFromWatchlist,
  getUserWatchlist,
  getAllActiveWatches,
  updateWatchChecked,
  incrementWatchNotified,
  hasBeenNotified,
  markNotified,
  logSearch,
  getStats,
  getUserStats,
  get db() { return db; },
};
