import type { PolymarketPosition, PolymarketTrade } from '@/lib/polymarket/types';
import type { MarketRow } from '@/lib/db/queries';
import type { SignalResult } from '../types';
import { SIGNAL_WEIGHTS } from '@/lib/utils/constants';
import { makeSignal, sortTradesByTime, tradeUsdValue } from '../utils';

/**
 * Win Rate Signal (weight 25 — strongest insider indicator)
 *
 * High win rates on resolved markets suggest insider knowledge.
 *
 * Two data sources, merged:
 * 1. Positions with realized PnL on resolved markets (original approach)
 * 2. Trades on resolved markets where the trader bought the winning outcome
 *    (catches cases where position API doesn't return resolved data)
 *
 * >0.90 & count>=3: 1.0, >0.80 & count>=3: 0.8, >0.70 & count>=2: 0.6,
 * >0.60 & count>=2: 0.3, else: 0.0
 */
export function scoreWinRate(
  positions: PolymarketPosition[],
  trades: PolymarketTrade[],
  marketCache: Map<string, MarketRow>,
): SignalResult {
  const weight = SIGNAL_WEIGHTS.winRate;

  if (positions.length === 0 && trades.length === 0) {
    return makeSignal(0, weight, 'No positions or trades found');
  }

  // Build a map of first trade timestamp per market
  const sorted = sortTradesByTime(trades);
  const firstTradePerMarket = new Map<string, number>();
  for (const trade of sorted) {
    if (!firstTradePerMarket.has(trade.conditionId)) {
      firstTradePerMarket.set(trade.conditionId, trade.timestamp);
    }
  }

  // Track wins/losses per market (deduplicated by conditionId)
  const marketResults = new Map<string, 'win' | 'loss'>();

  // Source 1: Positions with PnL on resolved markets (90-day window)
  const ninetyDays = 90 * 24 * 3600;
  for (const pos of positions) {
    const market = marketCache.get(pos.conditionId);
    if (!market || market.end_date === null || market.resolved_at === null) continue;

    const firstTrade = firstTradePerMarket.get(pos.conditionId);
    if (firstTrade === undefined) continue;

    const resolvedWithin = market.end_date - firstTrade;
    if (resolvedWithin < 0 || resolvedWithin > ninetyDays) continue;

    const pnl = Number(pos.realizedPnl) + Number(pos.cashPnl);
    if (pnl > 0) {
      marketResults.set(pos.conditionId, 'win');
    } else if (pnl < 0) {
      marketResults.set(pos.conditionId, 'loss');
    }
  }

  // Source 2: Trades on resolved markets — check if trader bought the winning outcome
  // This catches markets where the position API doesn't show resolved data
  // Group buys by market, check outcome against resolution
  const buysByMarket = new Map<string, PolymarketTrade[]>();
  for (const trade of sorted) {
    if (trade.side !== 'BUY') continue;
    const market = marketCache.get(trade.conditionId);
    if (!market || market.resolved_at === null || market.outcome === null) continue;

    const firstTrade = firstTradePerMarket.get(trade.conditionId);
    if (firstTrade === undefined) continue;
    const resolvedWithin = (market.end_date ?? market.resolved_at) - firstTrade;
    if (resolvedWithin < 0 || resolvedWithin > ninetyDays) continue;

    // Only count if not already determined by positions
    if (marketResults.has(trade.conditionId)) continue;

    const existing = buysByMarket.get(trade.conditionId) ?? [];
    existing.push(trade);
    buysByMarket.set(trade.conditionId, existing);
  }

  for (const [conditionId, buys] of buysByMarket) {
    const market = marketCache.get(conditionId);
    if (!market || !market.outcome) continue;

    // Volume-weight the outcome: which outcome did they bet more on?
    const volumeByOutcome = new Map<string, number>();
    for (const buy of buys) {
      const outcome = (buy.outcome ?? '').toLowerCase();
      volumeByOutcome.set(outcome, (volumeByOutcome.get(outcome) ?? 0) + tradeUsdValue(buy));
    }

    // Find their dominant bet
    let dominantOutcome = '';
    let maxVol = 0;
    for (const [outcome, vol] of volumeByOutcome) {
      if (vol > maxVol) {
        maxVol = vol;
        dominantOutcome = outcome;
      }
    }

    const resolvedOutcome = market.outcome.toLowerCase();
    if (dominantOutcome === resolvedOutcome) {
      marketResults.set(conditionId, 'win');
    } else if (dominantOutcome) {
      marketResults.set(conditionId, 'loss');
    }
  }

  let wins = 0;
  let losses = 0;
  for (const result of marketResults.values()) {
    if (result === 'win') wins++;
    else losses++;
  }

  const total = wins + losses;

  if (total < 1) {
    return makeSignal(0, weight, `No qualifying resolved markets found`);
  }

  const winRate = wins / total;

  let raw: number;
  if (winRate > 0.9 && total >= 3) {
    raw = 1.0;
  } else if (winRate > 0.8 && total >= 3) {
    raw = 0.8;
  } else if (winRate > 0.7 && total >= 2) {
    raw = 0.6;
  } else if (winRate > 0.6 && total >= 2) {
    raw = 0.3;
  } else if (total === 1 && wins === 1) {
    raw = 0.2; // Single winning bet on a resolved market — mild signal
  } else {
    raw = 0.0;
  }

  return makeSignal(
    raw,
    weight,
    `Win rate: ${wins}/${total} = ${(winRate * 100).toFixed(1)}% on resolved markets`,
  );
}
