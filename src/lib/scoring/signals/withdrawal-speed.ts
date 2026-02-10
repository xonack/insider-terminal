import type { PolymarketActivity } from '@/lib/polymarket/types';
import type { MarketRow } from '@/lib/db/queries';
import type { SignalResult } from '../types';
import { SIGNAL_WEIGHTS } from '@/lib/utils/constants';
import { makeSignal } from '../utils';

/**
 * Withdrawal Speed Signal
 *
 * Fast redemptions after market resolution suggest pre-planned exits.
 * For REDEEM activities, compute hours after market end_date.
 * <1hr: 1.0, <6hr: 0.7, <24hr: 0.3, else: 0.0
 * Final = average of all redeem scores. No redeems = 0.0
 */
export function scoreWithdrawalSpeed(
  activities: PolymarketActivity[],
  marketCache: Map<string, MarketRow>,
): SignalResult {
  const weight = SIGNAL_WEIGHTS.withdrawalSpeed;

  const redeems = activities.filter((a) => a.type === 'REDEEM');

  if (redeems.length === 0) {
    return makeSignal(0, weight, 'No redeem activities found');
  }

  let totalScore = 0;
  let scoredCount = 0;

  for (const redeem of redeems) {
    const market = marketCache.get(redeem.conditionId);
    if (!market || market.end_date === null) continue;

    const hoursAfter = (redeem.timestamp - market.end_date) / 3600;
    if (hoursAfter < 0) continue; // redeemed before market ended, skip

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

  if (scoredCount === 0) {
    return makeSignal(0, weight, 'No redeems with matching market end dates');
  }

  const raw = totalScore / scoredCount;

  return makeSignal(
    raw,
    weight,
    `${scoredCount} redeems scored; avg withdrawal speed = ${raw.toFixed(3)}`,
  );
}
