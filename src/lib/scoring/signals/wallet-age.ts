import type { PolymarketTrade } from '@/lib/polymarket/types';
import type { SignalResult } from '../types';
import { SIGNAL_WEIGHTS } from '@/lib/utils/constants';
import { makeSignal, sortTradesByTime, nowUnix } from '../utils';

/**
 * Wallet Age Signal
 *
 * Newer wallets score higher (more suspicious for insider trading).
 * wallet_age_days = (now - first_trade_timestamp) / 86400
 * <7d: 1.0, <14d: 0.8, <30d: 0.6, <90d: 0.3, <180d: 0.1, else: 0.0
 */
export function scoreWalletAge(trades: PolymarketTrade[]): SignalResult {
  const weight = SIGNAL_WEIGHTS.walletAge;

  if (trades.length === 0) {
    return makeSignal(0, weight, 'No trades found');
  }

  const sorted = sortTradesByTime(trades);
  const firstTradeTimestamp = sorted[0].timestamp;
  const ageDays = (nowUnix() - firstTradeTimestamp) / 86400;

  let raw: number;
  if (ageDays < 1) {
    raw = 1.0;
  } else if (ageDays < 3) {
    raw = 0.8;
  } else if (ageDays < 7) {
    raw = 0.6;
  } else if (ageDays < 14) {
    raw = 0.3;
  } else if (ageDays < 30) {
    raw = 0.1;
  } else {
    raw = 0.0;
  }

  return makeSignal(
    raw,
    weight,
    `Wallet age: ${Math.floor(ageDays)} days (first trade ${new Date(firstTradeTimestamp * 1000).toISOString().slice(0, 10)})`,
  );
}
