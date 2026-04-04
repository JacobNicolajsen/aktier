const { Database } = require('node-sqlite3-wasm');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
    date TEXT NOT NULL,
    shares REAL NOT NULL CHECK(shares > 0),
    price_per_share REAL NOT NULL CHECK(price_per_share > 0),
    brokerage REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (fund_id) REFERENCES funds(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS dividends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount_per_share REAL NOT NULL CHECK(amount_per_share > 0),
    shares REAL NOT NULL CHECK(shares > 0),
    total_amount REAL NOT NULL,
    tax_rate REAL NOT NULL DEFAULT 0.27,
    tax_amount REAL NOT NULL DEFAULT 0,
    net_amount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (fund_id) REFERENCES funds(id)
  )
`);

// Migration: tilføj skatkolonner til eksisterende tabel hvis de mangler
['tax_rate REAL NOT NULL DEFAULT 0.27',
 'tax_amount REAL NOT NULL DEFAULT 0',
 'net_amount REAL NOT NULL DEFAULT 0'].forEach((col) => {
  try { db.run(`ALTER TABLE dividends ADD COLUMN ${col}`); } catch (_) { /* kolonnen findes allerede */ }
});

db.run(`
  CREATE TABLE IF NOT EXISTS monthly_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    fund_id INTEGER NOT NULL,
    shares_held REAL NOT NULL,
    price REAL NOT NULL,
    value REAL NOT NULL,
    avg_cost REAL NOT NULL,
    unrealized_gain REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (fund_id) REFERENCES funds(id),
    UNIQUE(year, month, fund_id)
  )
`);

module.exports = db;
