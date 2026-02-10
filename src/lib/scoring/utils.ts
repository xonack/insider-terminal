import type { PolymarketTrade } from '@/lib/polymarket/types';

/** Clamp a number between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Compute the USD value of a trade: size * price. Both fields are strings on PolymarketTrade. */
export function tradeUsdValue(trade: PolymarketTrade): number {
  return trade.size * trade.price;
}

/** Sort trades by timestamp ascending (earliest first). */
export function sortTradesByTime(trades: PolymarketTrade[]): PolymarketTrade[] {
  return [...trades].sort((a, b) => a.timestamp - b.timestamp);
}

/** Get unique market condition IDs from a list of trades. */
export function uniqueMarkets(trades: PolymarketTrade[]): string[] {
  return [...new Set(trades.map((t) => t.conditionId))];
}

/** Convert an ISO date string to a Unix timestamp in seconds. Returns null if invalid. */
export function isoToUnix(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

/** Get current time as Unix timestamp in seconds. */
export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

/** Build a SignalResult object. Raw is clamped to [0, 1]. */
export function makeSignal(raw: number, weight: number, details: string) {
  const clamped = clamp(raw, 0, 1);
  return {
    raw: clamped,
    weight,
    weighted: clamped * weight,
    details,
  };
}
