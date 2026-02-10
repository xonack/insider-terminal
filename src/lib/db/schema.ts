import type { Client } from '@libsql/client';

export async function initializeDatabase(db: Client): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wallets (
      address TEXT PRIMARY KEY,
      username TEXT,
      profile_image TEXT,
      total_score REAL NOT NULL DEFAULT 0,
      signal_wallet_age REAL DEFAULT 0,
      signal_first_bet REAL DEFAULT 0,
      signal_bet_timing REAL DEFAULT 0,
      signal_withdrawal_speed REAL DEFAULT 0,
      signal_market_selection REAL DEFAULT 0,
      signal_win_rate REAL DEFAULT 0,
      signal_no_hedging REAL DEFAULT 0,
      total_volume REAL DEFAULT 0,
      total_pnl REAL DEFAULT 0,
      first_trade_at INTEGER,
      last_trade_at INTEGER,
      trade_count INTEGER DEFAULT 0,
      scored_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_wallets_score ON wallets(total_score DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_wallets_scored_at ON wallets(scored_at)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      condition_id TEXT NOT NULL,
      side TEXT NOT NULL,
      size REAL NOT NULL,
      price REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      transaction_hash TEXT,
      title TEXT,
      outcome TEXT,
      event_slug TEXT,
      FOREIGN KEY (wallet_address) REFERENCES wallets(address)
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(wallet_address, timestamp DESC)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS markets (
      condition_id TEXT PRIMARY KEY,
      event_id TEXT,
      title TEXT NOT NULL,
      slug TEXT,
      end_date INTEGER,
      resolved_at INTEGER,
      outcome TEXT,
      active INTEGER DEFAULT 1,
      volume REAL DEFAULT 0,
      cached_at INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      condition_id TEXT,
      details TEXT,
      score_at_time REAL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (wallet_address) REFERENCES wallets(address)
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_alerts_wallet ON alerts(wallet_address)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      type TEXT NOT NULL,
      condition_id TEXT,
      size REAL,
      usdc_size REAL,
      timestamp INTEGER NOT NULL,
      side TEXT,
      FOREIGN KEY (wallet_address) REFERENCES wallets(address)
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_activities_wallet ON activities(wallet_address, timestamp DESC)`);
}
