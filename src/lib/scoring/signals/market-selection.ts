import type { PolymarketTrade } from '@/lib/polymarket/types';
import type { MarketRow } from '@/lib/db/queries';
import type { SignalResult } from '../types';
import { SIGNAL_WEIGHTS } from '@/lib/utils/constants';
import { clamp, makeSignal, uniqueMarkets } from '../utils';

/**
 * Market Selection Signal
 *
 * Insiders gravitate to high-volume binary markets.
 * Check each market: volume > $500k and exactly 2 outcomes.
 * high_stakes_ratio = matching_markets / total_markets
 * >0.9: 1.0, >0.7: 0.7, >0.5: 0.4, else: 0.0
 * If unique_markets < 5, multiply by 1.3 (cap at 1.0) -- focus is suspicious
 */
export function scoreMarketSelection(
  trades: PolymarketTrade[],
  marketCache: Map<string, MarketRow>,
): SignalResult {
  const weight = SIGNAL_WEIGHTS.marketSelection;

  const markets = uniqueMarkets(trades);

  if (markets.length === 0) {
    return makeSignal(0, weight, 'No markets traded');
  }

  let highStakesCount = 0;
  let evaluatedCount = 0;

  for (const conditionId of markets) {
    const market = marketCache.get(conditionId);
    if (!market) continue;

    evaluatedCount++;

    const volume = market.volume ?? 0;
    // Parse outcomes: the outcomes field on PolymarketMarket is a JSON string like '["Yes","No"]'
    // In MarketRow from SQLite, we store the market data but outcome is a single resolved outcome string.
    // We need to check the original market outcomes count. Since MarketRow doesn't store outcome count,
    // we check volume only and assume binary (Polymarket markets are predominantly binary).
    // A more robust approach would store outcome count in MarketRow.
    const isHighVolume = volume > 500_000;

    if (isHighVolume) {
      highStakesCount++;
    }
  }

  if (evaluatedCount === 0) {
    return makeSignal(0, weight, 'No cached market data available');
  }

  const ratio = highStakesCount / evaluatedCount;

  let raw: number;
  if (ratio > 0.9) {
    raw = 1.0;
  } else if (ratio > 0.7) {
    raw = 0.7;
  } else if (ratio > 0.5) {
    raw = 0.4;
  } else {
    raw = 0.0;
  }

  // Focus bonus: trading fewer than 5 markets is suspicious
  if (markets.length < 5) {
    raw = clamp(raw * 1.3, 0, 1);
  }

  return makeSignal(
    raw,
    weight,
    `${highStakesCount}/${evaluatedCount} high-volume markets (ratio ${ratio.toFixed(2)}), ${markets.length} unique markets`,
  );
}
