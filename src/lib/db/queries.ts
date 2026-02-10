import { getDb } from './index';

export interface WalletRow {
  address: string;
  username: string | null;
  profile_image: string | null;
  total_score: number;
  signal_wallet_age: number | null;
  signal_first_bet: number | null;
  signal_bet_timing: number | null;
  signal_withdrawal_speed: number | null;
  signal_market_selection: number | null;
  signal_win_rate: number | null;
  signal_no_hedging: number | null;
  total_volume: number | null;
  total_pnl: number | null;
  first_trade_at: number | null;
  last_trade_at: number | null;
  trade_count: number | null;
  scored_at: number;
  created_at: number;
}

export interface TradeRow {
  id?: number;
  wallet_address: string;
  condition_id: string;
  side: string;
  size: number;
  price: number;
  timestamp: number;
  transaction_hash: string | null;
  title: string | null;
  outcome: string | null;
  event_slug: string | null;
}

export interface MarketRow {
  condition_id: string;
  event_id: string | null;
  title: string;
  slug: string | null;
  end_date: number | null;
  resolved_at: number | null;
  outcome: string | null;
  active: number | null;
  volume: number | null;
  cached_at: number;
}

export interface AlertRow {
  id: number;
  wallet_address: string;
  alert_type: string;
  condition_id: string | null;
  details: string | null;
  score_at_time: number | null;
  created_at: number;
}

export interface ActivityRow {
  id?: number;
  wallet_address: string;
  type: string;
  condition_id: string | null;
  size: number | null;
  usdc_size: number | null;
  timestamp: number;
  side: string | null;
}

// --- Wallet operations ---

export function upsertWallet(wallet: WalletRow): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO wallets (
      address, username, profile_image, total_score,
      signal_wallet_age, signal_first_bet, signal_bet_timing,
      signal_withdrawal_speed, signal_market_selection, signal_win_rate,
      signal_no_hedging, total_volume, total_pnl,
      first_trade_at, last_trade_at, trade_count, scored_at, created_at
    ) VALUES (
      @address, @username, @profile_image, @total_score,
      @signal_wallet_age, @signal_first_bet, @signal_bet_timing,
      @signal_withdrawal_speed, @signal_market_selection, @signal_win_rate,
      @signal_no_hedging, @total_volume, @total_pnl,
      @first_trade_at, @last_trade_at, @trade_count, @scored_at,
      COALESCE(
        (SELECT created_at FROM wallets WHERE address = @address),
        @created_at
      )
    )
  `);
  stmt.run(wallet);
}

export function getWallet(address: string): WalletRow | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM wallets WHERE address = ?');
  return (stmt.get(address) as WalletRow | undefined) ?? null;
}

export function getLeaderboard(limit: number, offset: number, minScore?: number): WalletRow[] {
  const db = getDb();
  if (minScore !== undefined) {
    const stmt = db.prepare(
      'SELECT * FROM wallets WHERE total_score >= ? ORDER BY total_score DESC LIMIT ? OFFSET ?'
    );
    return stmt.all(minScore, limit, offset) as WalletRow[];
  }
  const stmt = db.prepare(
    'SELECT * FROM wallets ORDER BY total_score DESC LIMIT ? OFFSET ?'
  );
  return stmt.all(limit, offset) as WalletRow[];
}

export function getStaleWallets(maxAgeSeconds: number, limit: number): WalletRow[] {
  const db = getDb();
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
  const stmt = db.prepare(
    'SELECT * FROM wallets WHERE scored_at < ? ORDER BY scored_at ASC LIMIT ?'
  );
  return stmt.all(cutoff, limit) as WalletRow[];
}

export function getWalletCount(): number {
  const db = getDb();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM wallets');
  const result = stmt.get() as { count: number };
  return result.count;
}

// --- Trade operations ---

export function insertTrades(trades: TradeRow[]): void {
  if (trades.length === 0) return;
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO trades (
      wallet_address, condition_id, side, size, price,
      timestamp, transaction_hash, title, outcome, event_slug
    ) VALUES (
      @wallet_address, @condition_id, @side, @size, @price,
      @timestamp, @transaction_hash, @title, @outcome, @event_slug
    )
  `);
  const insertMany = db.transaction((rows: TradeRow[]) => {
    for (const row of rows) {
      stmt.run(row);
    }
  });
  insertMany(trades);
}

export function getTradesForWallet(address: string, limit?: number): TradeRow[] {
  const db = getDb();
  if (limit !== undefined) {
    const stmt = db.prepare(
      'SELECT * FROM trades WHERE wallet_address = ? ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(address, limit) as TradeRow[];
  }
  const stmt = db.prepare(
    'SELECT * FROM trades WHERE wallet_address = ? ORDER BY timestamp DESC'
  );
  return stmt.all(address) as TradeRow[];
}

export function clearTradesForWallet(address: string): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM trades WHERE wallet_address = ?');
  stmt.run(address);
}

// --- Market operations ---

export function upsertMarket(market: MarketRow): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO markets (
      condition_id, event_id, title, slug, end_date,
      resolved_at, outcome, active, volume, cached_at
    ) VALUES (
      @condition_id, @event_id, @title, @slug, @end_date,
      @resolved_at, @outcome, @active, @volume, @cached_at
    )
  `);
  stmt.run(market);
}

export function getMarket(conditionId: string): MarketRow | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM markets WHERE condition_id = ?');
  return (stmt.get(conditionId) as MarketRow | undefined) ?? null;
}

export function getStaleMarkets(maxAgeSeconds: number): MarketRow[] {
  const db = getDb();
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
  const stmt = db.prepare(
    'SELECT * FROM markets WHERE cached_at < ? ORDER BY cached_at ASC'
  );
  return stmt.all(cutoff) as MarketRow[];
}

// --- Alert operations ---

export function insertAlert(alert: Omit<AlertRow, 'id' | 'created_at'>): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO alerts (wallet_address, alert_type, condition_id, details, score_at_time)
    VALUES (@wallet_address, @alert_type, @condition_id, @details, @score_at_time)
  `);
  stmt.run(alert);
}

export function getAlerts(limit: number, offset: number, type?: string): AlertRow[] {
  const db = getDb();
  if (type !== undefined) {
    const stmt = db.prepare(
      'SELECT * FROM alerts WHERE alert_type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    return stmt.all(type, limit, offset) as AlertRow[];
  }
  const stmt = db.prepare(
    'SELECT * FROM alerts ORDER BY created_at DESC LIMIT ? OFFSET ?'
  );
  return stmt.all(limit, offset) as AlertRow[];
}

export function getAlertsForWallet(address: string): AlertRow[] {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM alerts WHERE wallet_address = ? ORDER BY created_at DESC'
  );
  return stmt.all(address) as AlertRow[];
}

export function getAlertCount(): number {
  const db = getDb();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM alerts');
  const result = stmt.get() as { count: number };
  return result.count;
}

// --- Activity operations ---

export function insertActivities(activities: ActivityRow[]): void {
  if (activities.length === 0) return;
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO activities (wallet_address, type, condition_id, size, usdc_size, timestamp, side)
    VALUES (@wallet_address, @type, @condition_id, @size, @usdc_size, @timestamp, @side)
  `);
  const insertMany = db.transaction((rows: ActivityRow[]) => {
    for (const row of rows) {
      stmt.run(row);
    }
  });
  insertMany(activities);
}

export function getActivitiesForWallet(address: string, type?: string): ActivityRow[] {
  const db = getDb();
  if (type !== undefined) {
    const stmt = db.prepare(
      'SELECT * FROM activities WHERE wallet_address = ? AND type = ? ORDER BY timestamp DESC'
    );
    return stmt.all(address, type) as ActivityRow[];
  }
  const stmt = db.prepare(
    'SELECT * FROM activities WHERE wallet_address = ? ORDER BY timestamp DESC'
  );
  return stmt.all(address) as ActivityRow[];
}

export function clearActivitiesForWallet(address: string): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM activities WHERE wallet_address = ?');
  stmt.run(address);
}
