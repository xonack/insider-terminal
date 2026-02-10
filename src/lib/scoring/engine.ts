import { getTrades, getPositions, getActivity } from '@/lib/polymarket/data-api';
import { getMarketBySlug } from '@/lib/polymarket/gamma';
import { getFills as getKalshiFills, getPositions as getKalshiPositions, getMarket as getKalshiMarket } from '@/lib/kalshi/data-api';
import type { KalshiFill, KalshiMarketPosition } from '@/lib/kalshi/types';
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
import type { MarketRow, MarketSource } from '@/lib/db/queries';
import { SIGNAL_WEIGHTS, CACHE_TTL } from '@/lib/utils/constants';
import type { PolymarketTrade, PolymarketPosition, PolymarketActivity } from '@/lib/polymarket/types';
import type { ScoringResult, SignalResults } from './types';
import { isoToUnix, nowUnix, sortTradesByTime, tradeUsdValue } from './utils';
import { scoreWalletAge } from './signals/wallet-age';
import { scoreFirstBetSize } from './signals/first-bet-size';
import { scoreBetTiming } from './signals/bet-timing';
import { scoreWithdrawalSpeed } from './signals/withdrawal-speed';
import { scoreMarketSelection } from './signals/market-selection';
import { scoreWinRate } from './signals/win-rate';
import { scoreNoHedging } from './signals/no-hedging';

// --- Kalshi → Polymarket normalizers ---

/** Convert Kalshi fill to PolymarketTrade shape for signal compatibility. */
function normalizeKalshiFill(fill: KalshiFill): PolymarketTrade {
  // Kalshi prices are in cents, normalize to 0-1 range
  const price = fill.yes_price / 100;
  return {
    proxyWallet: '', // Kalshi uses user IDs, not wallets
    side: fill.action === 'buy' ? 'BUY' : 'SELL',
    asset: fill.ticker,
    conditionId: fill.ticker,
    size: fill.count,
    price,
    timestamp: Math.floor(new Date(fill.created_time).getTime() / 1000),
    title: fill.ticker,
    slug: fill.ticker,
    outcome: fill.side, // 'yes' or 'no'
    outcomeIndex: fill.side === 'yes' ? 0 : 1,
    transactionHash: fill.fill_id,
  };
}

/** Convert Kalshi market position to PolymarketPosition shape. */
function normalizeKalshiPosition(pos: KalshiMarketPosition): PolymarketPosition {
  // Kalshi values are in cents, convert to dollars
  return {
    proxyWallet: '',
    asset: pos.ticker,
    conditionId: pos.ticker,
    size: Math.abs(pos.position),
    avgPrice: 0,
    curPrice: 0,
    initialValue: pos.total_traded / 100,
    currentValue: pos.market_exposure / 100,
    cashPnl: 0,
    realizedPnl: pos.realized_pnl / 100,
    percentPnl: 0,
    percentRealizedPnl: 0,
    totalBought: pos.total_traded / 100,
    outcome: pos.position > 0 ? 'Yes' : 'No',
    outcomeIndex: pos.position > 0 ? 0 : 1,
    oppositeOutcome: pos.position > 0 ? 'No' : 'Yes',
    oppositeAsset: '',
    title: pos.ticker,
    slug: pos.ticker,
    icon: '',
    eventId: '',
    eventSlug: '',
    endDate: '',
    redeemable: false,
    mergeable: false,
    negativeRisk: false,
  };
}

// --- Market cache builders ---

/**
 * Fetch and cache market metadata for Polymarket trades.
 */
async function buildPolymarketCache(trades: PolymarketTrade[], source: MarketSource): Promise<Map<string, MarketRow>> {
  const cache = new Map<string, MarketRow>();
  const now = nowUnix();

  const slugMap = new Map<string, string>();
  for (const t of trades) {
    if (t.conditionId && t.slug && !slugMap.has(t.conditionId)) {
      slugMap.set(t.conditionId, t.slug);
    }
  }

  const toFetch: Array<{ conditionId: string; slug: string }> = [];
  for (const [conditionId, slug] of slugMap) {
    const cached = await getMarketFromDb(conditionId);
    if (cached && now - cached.cached_at < CACHE_TTL.marketMetadata) {
      cache.set(conditionId, cached);
    } else {
      toFetch.push({ conditionId, slug });
    }
  }

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
        market_source: source,
        cached_at: now,
      };

      await upsertMarket(row);
      cache.set(batch[j].conditionId, row);
    }
  }

  return cache;
}

/**
 * Fetch and cache market metadata for Kalshi trades.
 */
async function buildKalshiCache(trades: PolymarketTrade[], source: MarketSource): Promise<Map<string, MarketRow>> {
  const cache = new Map<string, MarketRow>();
  const now = nowUnix();

  const tickers = new Set<string>();
  for (const t of trades) {
    if (t.conditionId && !tickers.has(t.conditionId)) {
      tickers.add(t.conditionId);
    }
  }

  const toFetch: string[] = [];
  for (const ticker of tickers) {
    const cached = await getMarketFromDb(ticker);
    if (cached && now - cached.cached_at < CACHE_TTL.marketMetadata) {
      cache.set(ticker, cached);
    } else {
      toFetch.push(ticker);
    }
  }

  const BATCH_SIZE = 5;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((ticker) => getKalshiMarket(ticker)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status !== 'fulfilled' || !result.value) continue;

      const apiMarket = result.value;
      const isSettled = apiMarket.status === 'settled' || apiMarket.status === 'closed';

      const row: MarketRow = {
        condition_id: apiMarket.ticker,
        event_id: apiMarket.event_ticker || null,
        title: apiMarket.title,
        slug: apiMarket.ticker,
        end_date: isoToUnix(apiMarket.close_time),
        resolved_at: isSettled ? isoToUnix(apiMarket.updated_time) : null,
        outcome: apiMarket.result || null,
        active: apiMarket.status === 'open' ? 1 : 0,
        volume: parseFloat(apiMarket.volume_fp) || 0,
        market_source: source,
        cached_at: now,
      };

      await upsertMarket(row);
      cache.set(batch[j], row);
    }
  }

  return cache;
}

// --- Main scoring function ---

/**
 * Score a wallet/user for insider trading signals.
 *
 * 1. Fetch all data from the appropriate market API
 * 2. Fetch and cache market metadata
 * 3. Run all 7 signals
 * 4. Compute weighted composite score
 * 5. Store results in DB
 * 6. Generate alerts if score > 60
 * 7. Return ScoringResult
 */
export async function scoreWallet(
  address: string,
  source: MarketSource = 'polymarket',
): Promise<ScoringResult> {
  let trades: PolymarketTrade[];
  let positions: PolymarketPosition[];
  let activities: PolymarketActivity[];
  let marketCache: Map<string, MarketRow>;

  if (source === 'kalshi') {
    // Fetch from Kalshi and normalize to Polymarket shapes
    const [kalshiFills, kalshiPositions] = await Promise.all([
      getKalshiFills(undefined, 300),
      getKalshiPositions(),
    ]);

    trades = kalshiFills.map(normalizeKalshiFill);
    positions = kalshiPositions.map(normalizeKalshiPosition);
    activities = []; // Kalshi doesn't have separate activity feed
    marketCache = await buildKalshiCache(trades, source);
  } else {
    // Polymarket (default)
    const [polyTrades, polyPositions, polyActivities] = await Promise.all([
      getTrades(address),
      getPositions(address),
      getActivity(address),
    ]);

    trades = polyTrades;
    positions = polyPositions;
    activities = polyActivities;
    marketCache = await buildPolymarketCache(trades, source);
  }

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
  const totalPnl = positions.reduce((sum, p) => sum + (Number(p.realizedPnl) || 0) + (Number(p.cashPnl) || 0), 0);

  console.log(`[scoreWallet] ${address.slice(0, 10)}… [${source}] | positions: ${positions.length} | totalPnl: ${totalPnl.toFixed(2)} | sample:`, positions.length > 0 ? { cashPnl: positions[0].cashPnl, realizedPnl: positions[0].realizedPnl, types: { cashPnl: typeof positions[0].cashPnl, realizedPnl: typeof positions[0].realizedPnl } } : 'none');

  const metadata = {
    totalVolume,
    totalPnl,
    tradeCount: trades.length,
    firstTradeAt: sorted.length > 0 ? sorted[0].timestamp : null,
    lastTradeAt: sorted.length > 0 ? sorted[sorted.length - 1].timestamp : null,
  };

  // 5. Store in DB
  const now = nowUnix();

  const username = trades[0]?.name || trades[0]?.pseudonym || null;
  const profileImage = trades[0]?.profileImage || null;

  await upsertWallet({
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
    market_source: source,
    scored_at: now,
    created_at: now,
  });

  // Clear old trades/activities and re-insert fresh data
  await clearTradesForWallet(address);
  await clearActivitiesForWallet(address);

  await insertTrades(
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
      market_source: source,
    })),
  );

  await insertActivities(
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

    await insertAlert({
      wallet_address: address,
      alert_type: totalScore > 80 ? 'EXTREME' : 'HIGH',
      condition_id: null,
      details: `[${source}] Score ${totalScore}/100. Top signals: ${topSignals}`,
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
