import { getTrades, getPositions, getActivity } from '@/lib/polymarket/data-api';
import { getMarketBySlug } from '@/lib/polymarket/gamma';
import {
  upsertWallet,
  getMarket as getMarketFromDb,
  upsertMarket,
  insertTrades,
  insertActivities,
  insertAlert,
  clearTradesForWallet,
  clearActivitiesForWallet,
} from '@/lib/db/queries';
import type { MarketRow } from '@/lib/db/queries';
import { SIGNAL_WEIGHTS, CACHE_TTL } from '@/lib/utils/constants';
import type { PolymarketTrade } from '@/lib/polymarket/types';
import type { ScoringResult, SignalResults } from './types';
import { isoToUnix, nowUnix, sortTradesByTime, tradeUsdValue } from './utils';
import { scoreWalletAge } from './signals/wallet-age';
import { scoreFirstBetSize } from './signals/first-bet-size';
import { scoreBetTiming } from './signals/bet-timing';
import { scoreWithdrawalSpeed } from './signals/withdrawal-speed';
import { scoreMarketSelection } from './signals/market-selection';
import { scoreWinRate } from './signals/win-rate';
import { scoreNoHedging } from './signals/no-hedging';

/**
 * Fetch and cache market metadata for each unique market in the trade list.
 * Returns a Map of conditionId -> MarketRow for use by signal functions.
 */
async function buildMarketCache(trades: PolymarketTrade[]): Promise<Map<string, MarketRow>> {
  const cache = new Map<string, MarketRow>();
  const now = nowUnix();

  // Build a map of conditionId -> slug from trade data
  const slugMap = new Map<string, string>();
  for (const t of trades) {
    if (t.conditionId && t.slug && !slugMap.has(t.conditionId)) {
      slugMap.set(t.conditionId, t.slug);
    }
  }

  // First pass: load all cached markets from SQLite
  const toFetch: Array<{ conditionId: string; slug: string }> = [];
  for (const [conditionId, slug] of slugMap) {
    const cached = getMarketFromDb(conditionId);
    if (cached && now - cached.cached_at < CACHE_TTL.marketMetadata) {
      cache.set(conditionId, cached);
    } else {
      toFetch.push({ conditionId, slug });
    }
  }

  // Second pass: fetch uncached markets via slug lookup (batches of 5)
  const BATCH_SIZE = 5;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((item) => getMarketBySlug(item.slug)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status !== 'fulfilled' || !result.value) continue;

      const apiMarket = result.value;
      // Gamma API uses 'question' not 'title'
      const title = apiMarket.title || apiMarket.question || batch[j].slug;

      const row: MarketRow = {
        condition_id: batch[j].conditionId,
        event_id: apiMarket.events?.[0]?.id ?? null,
        title,
        slug: apiMarket.slug,
        end_date: isoToUnix(apiMarket.endDate),
        resolved_at: apiMarket.closed ? isoToUnix(apiMarket.updatedAt) : null,
        outcome: apiMarket.resolution || null,
        active: apiMarket.active ? 1 : 0,
        volume: apiMarket.volumeNum ?? 0,
        cached_at: now,
      };

      upsertMarket(row);
      cache.set(batch[j].conditionId, row);
    }
  }

  return cache;
}

/**
 * Score a wallet address for insider trading signals.
 *
 * 1. Fetch all wallet data from Polymarket APIs
 * 2. Fetch and cache market metadata
 * 3. Run all 7 signals
 * 4. Compute weighted composite score
 * 5. Store results in SQLite
 * 6. Generate alerts if score > 60
 * 7. Return ScoringResult
 */
export async function scoreWallet(address: string): Promise<ScoringResult> {
  // 1. Fetch wallet data (profile endpoint is unreliable/404, skip it)
  const [trades, positions, activities] = await Promise.all([
    getTrades(address),
    getPositions(address),
    getActivity(address),
  ]);

  // 2. Build market cache
  const marketCache = await buildMarketCache(trades);

  // 3. Run all 7 signals
  const signals: SignalResults = {
    walletAge: scoreWalletAge(trades),
    firstBetSize: scoreFirstBetSize(trades),
    betTiming: scoreBetTiming(trades, marketCache),
    withdrawalSpeed: scoreWithdrawalSpeed(activities, marketCache),
    marketSelection: scoreMarketSelection(trades, marketCache),
    winRate: scoreWinRate(positions, trades, marketCache),
    noHedging: scoreNoHedging(trades),
  };

  // 4. Compute total score (weights sum to 100, so the weighted sum IS the score)
  const totalScore = Math.round(
    signals.walletAge.weighted +
    signals.firstBetSize.weighted +
    signals.betTiming.weighted +
    signals.withdrawalSpeed.weighted +
    signals.marketSelection.weighted +
    signals.winRate.weighted +
    signals.noHedging.weighted,
  );

  // Compute metadata
  const sorted = sortTradesByTime(trades);
  const totalVolume = trades.reduce((sum, t) => sum + tradeUsdValue(t), 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.realizedPnl + p.curPnl, 0);

  const metadata = {
    totalVolume,
    totalPnl,
    tradeCount: trades.length,
    firstTradeAt: sorted.length > 0 ? sorted[0].timestamp : null,
    lastTradeAt: sorted.length > 0 ? sorted[sorted.length - 1].timestamp : null,
  };

  // 5. Store in SQLite
  const now = nowUnix();

  // Extract username from trade data (the API includes name/pseudonym per trade)
  const username = trades[0]?.name || trades[0]?.pseudonym || null;
  const profileImage = trades[0]?.profileImage || null;

  // Upsert wallet FIRST (trades/activities have FK to wallets)
  upsertWallet({
    address,
    username,
    profile_image: profileImage,
    total_score: totalScore,
    signal_wallet_age: signals.walletAge.weighted,
    signal_first_bet: signals.firstBetSize.weighted,
    signal_bet_timing: signals.betTiming.weighted,
    signal_withdrawal_speed: signals.withdrawalSpeed.weighted,
    signal_market_selection: signals.marketSelection.weighted,
    signal_win_rate: signals.winRate.weighted,
    signal_no_hedging: signals.noHedging.weighted,
    total_volume: metadata.totalVolume,
    total_pnl: metadata.totalPnl,
    first_trade_at: metadata.firstTradeAt,
    last_trade_at: metadata.lastTradeAt,
    trade_count: metadata.tradeCount,
    scored_at: now,
    created_at: now,
  });

  // Clear old trades/activities and re-insert fresh data
  clearTradesForWallet(address);
  clearActivitiesForWallet(address);

  insertTrades(
    trades.map((t) => ({
      wallet_address: address,
      condition_id: t.conditionId,
      side: t.side,
      size: t.size,
      price: t.price,
      timestamp: t.timestamp,
      transaction_hash: t.transactionHash || null,
      title: t.title || null,
      outcome: t.outcome || null,
      event_slug: t.eventSlug || null,
    })),
  );

  insertActivities(
    activities.map((a) => ({
      wallet_address: address,
      type: a.type,
      condition_id: a.conditionId || null,
      size: a.size ? parseFloat(a.size) : null,
      usdc_size: a.usdcSize ? parseFloat(a.usdcSize) : null,
      timestamp: a.timestamp,
      side: a.side || null,
    })),
  );

  // 6. Generate alert if score > 60
  if (totalScore > 60) {
    const topSignals = Object.entries(signals)
      .sort(([, a], [, b]) => b.weighted - a.weighted)
      .slice(0, 3)
      .map(([name, s]) => `${name}: ${s.weighted.toFixed(1)}`)
      .join(', ');

    insertAlert({
      wallet_address: address,
      alert_type: totalScore > 80 ? 'EXTREME' : 'HIGH',
      condition_id: null,
      details: `Score ${totalScore}/100. Top signals: ${topSignals}`,
      score_at_time: totalScore,
    });
  }

  // 7. Return result
  return {
    address,
    totalScore,
    signals,
    metadata,
  };
}

/** Verify that signal weights sum to 100 (compile-time sanity). */
function _assertWeightsSum(): void {
  const sum = Object.values(SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    throw new Error(`Signal weights must sum to 100, got ${sum}`);
  }
}
_assertWeightsSum();
