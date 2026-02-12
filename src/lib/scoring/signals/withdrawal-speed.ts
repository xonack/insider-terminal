import type { PolymarketActivity } from '@/lib/polymarket/types';
import type { MarketRow } from '@/lib/db/queries';
import type { SignalResult } from '../types';
import { SIGNAL_WEIGHTS } from '@/lib/utils/constants';
import { makeSignal } from '../utils';

/**
 * Withdrawal Speed Signal (weight 5 — reduced, data-limited)
 *
 * Fast redemptions after market resolution suggest pre-planned exits.
 * For REDEEM activities, compute hours after market end_date.
 * <1hr: 1.0, <6hr: 0.7, <24hr: 0.3, else: 0.0
 *
 * Fallback: if no REDEEM activities, check for SELL activities near market
 * resolution (selling out of a winning position fast is similarly suspicious).
 */
export function scoreWithdrawalSpeed(
  activities: PolymarketActivity[],
  marketCache: Map<string, MarketRow>,
): SignalResult {
  const weight = SIGNAL_WEIGHTS.withdrawalSpeed;

  const redeems = activities.filter((a) => a.type === 'REDEEM');
  const sells = activities.filter((a) => a.type === 'TRADE' && a.side === 'SELL');

  // Try REDEEM activities first
  if (redeems.length > 0) {
    let totalScore = 0;
    let scoredCount = 0;

    for (const redeem of redeems) {
      const market = marketCache.get(redeem.conditionId);
      if (!market || market.end_date === null) continue;

      const hoursAfter = (redeem.timestamp - market.end_date) / 3600;
      if (hoursAfter < 0) continue;

      let redeemScore: number;
      if (hoursAfter < 1) {
        redeemScore = 1.0;
      } else if (hoursAfter < 6) {
        redeemScore = 0.7;
      } else if (hoursAfter < 24) {
        redeemScore = 0.3;
      } else {
        redeemScore = 0.0;
      }

      totalScore += redeemScore;
      scoredCount++;
    }

    if (scoredCount > 0) {
      const raw = totalScore / scoredCount;
      return makeSignal(raw, weight, `${scoredCount} redeems scored; avg speed = ${raw.toFixed(3)}`);
    }
  }

  // Fallback: check SELL activities near market resolution
  if (sells.length > 0) {
    let totalScore = 0;
    let scoredCount = 0;

    for (const sell of sells) {
      const market = marketCache.get(sell.conditionId);
      if (!market || market.end_date === null) continue;

      // Selling within 24h before or after resolution is suspicious
      const hoursFromEnd = Math.abs(sell.timestamp - market.end_date) / 3600;
      if (hoursFromEnd > 48) continue;

      let sellScore: number;
      if (hoursFromEnd < 2) {
        sellScore = 0.8;
      } else if (hoursFromEnd < 12) {
        sellScore = 0.5;
      } else if (hoursFromEnd < 48) {
        sellScore = 0.2;
      } else {
        sellScore = 0.0;
      }

      totalScore += sellScore;
      scoredCount++;
    }

    if (scoredCount > 0) {
      const raw = totalScore / scoredCount;
      return makeSignal(raw, weight, `${scoredCount} sells near resolution; avg speed = ${raw.toFixed(3)}`);
    }
  }

  return makeSignal(0, weight, 'No redeem or near-resolution sell activities found');
}
