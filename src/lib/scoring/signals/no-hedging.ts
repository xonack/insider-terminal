import type { PolymarketTrade } from '@/lib/polymarket/types';
import type { SignalResult } from '../types';
import { SIGNAL_WEIGHTS } from '@/lib/utils/constants';
import { makeSignal, uniqueMarkets, sortTradesByTime } from '../utils';

/**
 * No Hedging Signal
 *
 * Insiders don't hedge -- they have conviction because they KNOW the outcome.
 * Per market: check if wallet bought both outcomes (hedge) or has multiple buys
 * at significantly different prices (DCA).
 * conviction_ratio = conviction_markets / total_markets
 * >0.9: 1.0, >0.7: 0.7, >0.5: 0.4, else: 0.0
 */
export function scoreNoHedging(trades: PolymarketTrade[]): SignalResult {
  const weight = SIGNAL_WEIGHTS.noHedging;

  const markets = uniqueMarkets(trades);

  if (markets.length === 0) {
    return makeSignal(0, weight, 'No markets traded');
  }

  const sorted = sortTradesByTime(trades);
  let convictionMarkets = 0;

  for (const conditionId of markets) {
    const marketTrades = sorted.filter(
      (t) => t.conditionId === conditionId && t.side === 'BUY',
    );

    if (marketTrades.length === 0) {
      // No buys in this market -- skip
      continue;
    }

    // Check for hedge: bought multiple different outcomes
    const outcomesTraded = new Set(marketTrades.map((t) => t.outcome));
    const isHedge = outcomesTraded.size > 1;

    // Check for DCA: multiple buys of the same outcome at different prices (>20% spread)
    let isDca = false;
    if (!isHedge && marketTrades.length >= 2) {
      const prices = marketTrades.map((t) => t.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (minPrice > 0 && (maxPrice - minPrice) / minPrice > 0.2) {
        isDca = true;
      }
    }

    if (!isHedge && !isDca) {
      convictionMarkets++;
    }
  }

  // Use total markets that had buy trades as denominator
  const marketsWithBuys = markets.filter((m) =>
    sorted.some((t) => t.conditionId === m && t.side === 'BUY'),
  ).length;

  if (marketsWithBuys === 0) {
    return makeSignal(0, weight, 'No markets with buy trades');
  }

  const ratio = convictionMarkets / marketsWithBuys;

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

  return makeSignal(
    raw,
    weight,
    `${convictionMarkets}/${marketsWithBuys} markets show conviction (ratio ${ratio.toFixed(2)})`,
  );
}
