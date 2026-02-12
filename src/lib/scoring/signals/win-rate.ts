import type { PolymarketPosition, PolymarketTrade } from '@/lib/polymarket/types';
import type { MarketRow } from '@/lib/db/queries';
import type { SignalResult } from '../types';
import { SIGNAL_WEIGHTS } from '@/lib/utils/constants';
import { makeSignal, sortTradesByTime } from '../utils';

/**
 * Win Rate Signal
 *
 * High win rates on recently-resolved markets suggest insider knowledge.
 * Filter positions where the market resolved within 7 days of first trade on that market.
 * wins = positions with positive PnL, losses = negative PnL
 * >0.95 & count>=3: 1.0, >0.85 & count>=3: 0.8, >0.70 & count>=5: 0.6, >0.70 & count>=3: 0.4
 * If total < 3: 0.0
 */
export function scoreWinRate(
  positions: PolymarketPosition[],
  trades: PolymarketTrade[],
  marketCache: Map<string, MarketRow>,
): SignalResult {
  const weight = SIGNAL_WEIGHTS.winRate;

  if (positions.length === 0) {
    return makeSignal(0, weight, 'No positions found');
  }

  // Build a map of first trade timestamp per market (conditionId)
  const sorted = sortTradesByTime(trades);
  const firstTradePerMarket = new Map<string, number>();
  for (const trade of sorted) {
    if (!firstTradePerMarket.has(trade.conditionId)) {
      firstTradePerMarket.set(trade.conditionId, trade.timestamp);
    }
  }

  // Filter positions: market must be closed and resolved within 30 days of first trade
  const thirtyDays = 30 * 24 * 3600;
  let wins = 0;
  let losses = 0;

  for (const pos of positions) {
    const market = marketCache.get(pos.conditionId);
    if (!market || market.end_date === null) continue;

    // Position is "closed" if the market has resolved
    if (market.resolved_at === null) continue;

    const firstTrade = firstTradePerMarket.get(pos.conditionId);
    if (firstTrade === undefined) continue;

    const resolvedWithin = market.end_date - firstTrade;
    if (resolvedWithin < 0 || resolvedWithin > thirtyDays) continue;

    // Check both realizedPnl and cashPnl for win/loss determination
    const pnl = Number(pos.realizedPnl) + Number(pos.cashPnl);
    if (pnl > 0) {
      wins++;
    } else if (pnl < 0) {
      losses++;
    }
    // Zero PnL positions are excluded
  }

  const total = wins + losses;

  if (total < 2) {
    return makeSignal(
      0,
      weight,
      `Only ${total} qualifying positions (need >= 2)`,
    );
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
  } else {
    raw = 0.0;
  }

  return makeSignal(
    raw,
    weight,
    `Win rate: ${wins}/${total} = ${(winRate * 100).toFixed(1)}% on quick-resolution markets`,
  );
}
