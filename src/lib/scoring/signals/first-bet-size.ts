import type { PolymarketTrade } from '@/lib/polymarket/types';
import type { SignalResult } from '../types';
import { SIGNAL_WEIGHTS } from '@/lib/utils/constants';
import { clamp, makeSignal, sortTradesByTime, tradeUsdValue } from '../utils';

/**
 * First Bet Size Signal
 *
 * Large first bets are suspicious -- experienced wallets don't usually start big.
 * first_bet_usd = earliest_trade.size * earliest_trade.price
 * >$100k: 1.0, >$50k: 0.9, >$25k: 0.7, >$10k: 0.4, >$5k: 0.2, else: 0.0
 * Bonus: if first 3 trades are same market, multiply by 1.2 (cap at 1.0)
 */
export function scoreFirstBetSize(trades: PolymarketTrade[]): SignalResult {
  const weight = SIGNAL_WEIGHTS.firstBetSize;

  if (trades.length === 0) {
    return makeSignal(0, weight, 'No trades found');
  }

  const sorted = sortTradesByTime(trades);
  const firstBetUsd = tradeUsdValue(sorted[0]);

  let raw: number;
  if (firstBetUsd > 25_000) {
    raw = 1.0;
  } else if (firstBetUsd > 10_000) {
    raw = 0.9;
  } else if (firstBetUsd > 5_000) {
    raw = 0.7;
  } else if (firstBetUsd > 2_000) {
    raw = 0.5;
  } else if (firstBetUsd > 500) {
    raw = 0.3;
  } else if (firstBetUsd > 100) {
    raw = 0.1;
  } else {
    raw = 0.0;
  }

  // Bonus: if first 3 trades target the same market, multiply by 1.2
  if (sorted.length >= 3) {
    const firstMarket = sorted[0].conditionId;
    const allSameMarket =
      sorted[1].conditionId === firstMarket && sorted[2].conditionId === firstMarket;
    if (allSameMarket) {
      raw = clamp(raw * 1.2, 0, 1);
    }
  }

  return makeSignal(
    raw,
    weight,
    `First bet: $${firstBetUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD`,
  );
}
