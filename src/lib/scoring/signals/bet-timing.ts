import type { PolymarketTrade } from '@/lib/polymarket/types';
import type { MarketRow } from '@/lib/db/queries';
import type { SignalResult } from '../types';
import { SIGNAL_WEIGHTS } from '@/lib/utils/constants';
import { makeSignal, tradeUsdValue } from '../utils';

/**
 * Bet Timing Signal (weight 20 -- highest signal)
 *
 * Trades placed close to market resolution are highly suspicious.
 * For each trade, compute hours_before = (market.end_date - trade.timestamp) / 3600
 * <1hr: 1.0, <6hr: 0.8, <12hr: 0.6, <24hr: 0.3, else: 0.0
 * Final = volume-weighted average of per-trade scores.
 */
export function scoreBetTiming(
  trades: PolymarketTrade[],
  marketCache: Map<string, MarketRow>,
): SignalResult {
  const weight = SIGNAL_WEIGHTS.betTiming;

  if (trades.length === 0) {
    return makeSignal(0, weight, 'No trades found');
  }

  let weightedSum = 0;
  let totalVolume = 0;
  let scoredCount = 0;

  for (const trade of trades) {
    const market = marketCache.get(trade.conditionId);
    if (!market || market.end_date === null) continue;

    const hoursBefore = (market.end_date - trade.timestamp) / 3600;
    if (hoursBefore < 0) continue; // trade after market ended, skip

    let tradeScore: number;
    if (hoursBefore < 1) {
      tradeScore = 1.0;
    } else if (hoursBefore < 6) {
      tradeScore = 0.8;
    } else if (hoursBefore < 12) {
      tradeScore = 0.6;
    } else if (hoursBefore < 24) {
      tradeScore = 0.3;
    } else {
      tradeScore = 0.0;
    }

    const usd = tradeUsdValue(trade);
    weightedSum += tradeScore * usd;
    totalVolume += usd;
    scoredCount++;
  }

  if (totalVolume === 0 || scoredCount === 0) {
    return makeSignal(0, weight, 'No trades with market end dates available');
  }

  const raw = weightedSum / totalVolume;

  return makeSignal(
    raw,
    weight,
    `${scoredCount} trades scored for timing; volume-weighted avg = ${raw.toFixed(3)}`,
  );
}
