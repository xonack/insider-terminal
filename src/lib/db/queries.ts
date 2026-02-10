import { ensureDb } from './index';

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

export async function upsertWallet(wallet: WalletRow): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: `
      INSERT OR REPLACE INTO wallets (
        address, username, profile_image, total_score,
        signal_wallet_age, signal_first_bet, signal_bet_timing,
        signal_withdrawal_speed, signal_market_selection, signal_win_rate,
        signal_no_hedging, total_volume, total_pnl,
        first_trade_at, last_trade_at, trade_count, scored_at, created_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        COALESCE(
          (SELECT created_at FROM wallets WHERE address = ?),
          ?
        )
      )
    `,
    args: [
      wallet.address, wallet.username, wallet.profile_image, wallet.total_score,
      wallet.signal_wallet_age, wallet.signal_first_bet, wallet.signal_bet_timing,
      wallet.signal_withdrawal_speed, wallet.signal_market_selection, wallet.signal_win_rate,
      wallet.signal_no_hedging, wallet.total_volume, wallet.total_pnl,
      wallet.first_trade_at, wallet.last_trade_at, wallet.trade_count, wallet.scored_at,
      wallet.address,
      wallet.created_at,
    ],
  });
}

export async function getWallet(address: string): Promise<WalletRow | null> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: 'SELECT * FROM wallets WHERE address = ?',
    args: [address],
  });
  return (result.rows[0] as unknown as WalletRow | undefined) ?? null;
}

export async function getLeaderboard(limit: number, offset: number, minScore?: number): Promise<WalletRow[]> {
  const db = await ensureDb();
  const scoreFilter = minScore !== undefined ? 'AND total_score >= ?' : '';
  const scoreArgs = minScore !== undefined ? [minScore] : [];

  // Deduplicate: keep only the highest-scored wallet per username.
  // NULL usernames partition by address so each stays as a separate row.
  const result = await db.execute({
    sql: `
      SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (
          PARTITION BY COALESCE(username, address)
          ORDER BY total_score DESC
        ) AS rn
        FROM wallets
        WHERE 1=1 ${scoreFilter}
      ) ranked
      WHERE rn = 1
      ORDER BY total_score DESC
      LIMIT ? OFFSET ?
    `,
    args: [...scoreArgs, limit, offset],
  });
  return result.rows as unknown as WalletRow[];
}

export async function getStaleWallets(maxAgeSeconds: number, limit: number): Promise<WalletRow[]> {
  const db = await ensureDb();
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
  const result = await db.execute({
    sql: 'SELECT * FROM wallets WHERE scored_at < ? ORDER BY scored_at ASC LIMIT ?',
    args: [cutoff, limit],
  });
  return result.rows as unknown as WalletRow[];
}

export async function getWalletCount(): Promise<number> {
  const db = await ensureDb();
  // Count unique users (deduplicated by username, NULL usernames count individually)
  const result = await db.execute(
    'SELECT COUNT(*) as count FROM (SELECT 1 FROM wallets GROUP BY COALESCE(username, address))'
  );
  return Number(result.rows[0].count);
}

// --- Trade operations ---

export async function insertTrades(trades: TradeRow[]): Promise<void> {
  if (trades.length === 0) return;
  const db = await ensureDb();
  await db.batch(
    trades.map((t) => ({
      sql: `
        INSERT INTO trades (
          wallet_address, condition_id, side, size, price,
          timestamp, transaction_hash, title, outcome, event_slug
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        t.wallet_address, t.condition_id, t.side, t.size, t.price,
        t.timestamp, t.transaction_hash, t.title, t.outcome, t.event_slug,
      ],
    })),
  );
}

export async function getTradesForWallet(address: string, limit?: number): Promise<TradeRow[]> {
  const db = await ensureDb();
  if (limit !== undefined) {
    const result = await db.execute({
      sql: 'SELECT * FROM trades WHERE wallet_address = ? ORDER BY timestamp DESC LIMIT ?',
      args: [address, limit],
    });
    return result.rows as unknown as TradeRow[];
  }
  const result = await db.execute({
    sql: 'SELECT * FROM trades WHERE wallet_address = ? ORDER BY timestamp DESC',
    args: [address],
  });
  return result.rows as unknown as TradeRow[];
}

export async function clearTradesForWallet(address: string): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: 'DELETE FROM trades WHERE wallet_address = ?',
    args: [address],
  });
}

// --- Market operations ---

export async function upsertMarket(market: MarketRow): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: `
      INSERT OR REPLACE INTO markets (
        condition_id, event_id, title, slug, end_date,
        resolved_at, outcome, active, volume, cached_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      market.condition_id, market.event_id, market.title, market.slug, market.end_date,
      market.resolved_at, market.outcome, market.active, market.volume, market.cached_at,
    ],
  });
}

export async function getMarket(conditionId: string): Promise<MarketRow | null> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: 'SELECT * FROM markets WHERE condition_id = ?',
    args: [conditionId],
  });
  return (result.rows[0] as unknown as MarketRow | undefined) ?? null;
}

export async function getStaleMarkets(maxAgeSeconds: number): Promise<MarketRow[]> {
  const db = await ensureDb();
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
  const result = await db.execute({
    sql: 'SELECT * FROM markets WHERE cached_at < ? ORDER BY cached_at ASC',
    args: [cutoff],
  });
  return result.rows as unknown as MarketRow[];
}

// --- Alert operations ---

export async function insertAlert(alert: Omit<AlertRow, 'id' | 'created_at'>): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: `
      INSERT INTO alerts (wallet_address, alert_type, condition_id, details, score_at_time)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [alert.wallet_address, alert.alert_type, alert.condition_id, alert.details, alert.score_at_time],
  });
}

export async function getAlerts(limit: number, offset: number, type?: string): Promise<AlertRow[]> {
  const db = await ensureDb();
  if (type !== undefined) {
    const result = await db.execute({
      sql: 'SELECT * FROM alerts WHERE alert_type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      args: [type, limit, offset],
    });
    return result.rows as unknown as AlertRow[];
  }
  const result = await db.execute({
    sql: 'SELECT * FROM alerts ORDER BY created_at DESC LIMIT ? OFFSET ?',
    args: [limit, offset],
  });
  return result.rows as unknown as AlertRow[];
}

export async function getAlertsForWallet(address: string): Promise<AlertRow[]> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: 'SELECT * FROM alerts WHERE wallet_address = ? ORDER BY created_at DESC',
    args: [address],
  });
  return result.rows as unknown as AlertRow[];
}

export async function getAlertCount(): Promise<number> {
  const db = await ensureDb();
  const result = await db.execute('SELECT COUNT(*) as count FROM alerts');
  return Number(result.rows[0].count);
}

export async function getLastScanTime(): Promise<number | null> {
  const db = await ensureDb();
  const result = await db.execute('SELECT MAX(scored_at) as last_scan FROM wallets');
  const val = result.rows[0]?.last_scan;
  return val ? Number(val) : null;
}

// --- Activity operations ---

export async function insertActivities(activities: ActivityRow[]): Promise<void> {
  if (activities.length === 0) return;
  const db = await ensureDb();
  await db.batch(
    activities.map((a) => ({
      sql: `
        INSERT INTO activities (wallet_address, type, condition_id, size, usdc_size, timestamp, side)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [a.wallet_address, a.type, a.condition_id, a.size, a.usdc_size, a.timestamp, a.side],
    })),
  );
}

export async function getActivitiesForWallet(address: string, type?: string): Promise<ActivityRow[]> {
  const db = await ensureDb();
  if (type !== undefined) {
    const result = await db.execute({
      sql: 'SELECT * FROM activities WHERE wallet_address = ? AND type = ? ORDER BY timestamp DESC',
      args: [address, type],
    });
    return result.rows as unknown as ActivityRow[];
  }
  const result = await db.execute({
    sql: 'SELECT * FROM activities WHERE wallet_address = ? ORDER BY timestamp DESC',
    args: [address],
  });
  return result.rows as unknown as ActivityRow[];
}

export async function clearActivitiesForWallet(address: string): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: 'DELETE FROM activities WHERE wallet_address = ?',
    args: [address],
  });
}

// --- Tweet log operations ---

export interface TweetLogRow {
  id: number;
  tweet_type: string;
  ref_id: string;
  tweet_id: string | null;
  tweet_text: string;
  status: string;
  created_at: number;
}

export async function isTweetLogged(tweetType: string, refId: string): Promise<boolean> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM tweet_log WHERE tweet_type = ? AND ref_id = ? LIMIT 1',
    args: [tweetType, refId],
  });
  return result.rows.length > 0;
}

export async function insertTweetLog(
  log: Omit<TweetLogRow, 'id' | 'created_at'>
): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: `INSERT OR IGNORE INTO tweet_log (tweet_type, ref_id, tweet_id, tweet_text, status)
          VALUES (?, ?, ?, ?, ?)`,
    args: [log.tweet_type, log.ref_id, log.tweet_id, log.tweet_text, log.status],
  });
}

export async function getUntweetedAlerts(): Promise<AlertRow[]> {
  const db = await ensureDb();
  const result = await db.execute(`
    SELECT a.* FROM alerts a
    LEFT JOIN tweet_log t ON t.tweet_type = 'alert' AND t.ref_id = CAST(a.id AS TEXT)
    WHERE t.id IS NULL AND a.score_at_time > 60
    ORDER BY a.created_at DESC
    LIMIT 10
  `);
  return result.rows as unknown as AlertRow[];
}
