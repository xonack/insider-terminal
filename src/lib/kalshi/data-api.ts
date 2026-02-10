import { KALSHI_API_BASE } from '@/lib/utils/constants';
import { kalshiFetch, kalshiAuthFetch } from './client';
import type {
  KalshiFill,
  KalshiFillsResponse,
  KalshiMarket,
  KalshiMarketPosition,
  KalshiMarketsResponse,
  KalshiPositionsResponse,
  KalshiTrade,
  KalshiTradesResponse,
} from './types';

/**
 * Get fills for the authenticated user (requires API key).
 * A fill is a matched trade belonging to the authenticated account.
 */
export async function getFills(
  ticker?: string,
  limit: number = 100,
): Promise<KalshiFill[]> {
  const params = new URLSearchParams({ limit: String(Math.min(limit, 200)) });
  if (ticker) params.set('ticker', ticker);

  const result = await kalshiAuthFetch<KalshiFillsResponse>(
    `/portfolio/fills?${params}`,
  );
  return result?.fills ?? [];
}

/**
 * Get positions for the authenticated user (requires API key).
 */
export async function getPositions(
  ticker?: string,
): Promise<KalshiMarketPosition[]> {
  const params = new URLSearchParams({ limit: '1000' });
  if (ticker) params.set('ticker', ticker);

  const result = await kalshiAuthFetch<KalshiPositionsResponse>(
    `/portfolio/positions?${params}`,
  );
  return result?.market_positions ?? [];
}

/**
 * Get public trades for a market (no auth required).
 * Note: Public trades do NOT include user attribution.
 */
export async function getPublicTrades(
  ticker: string,
  limit: number = 100,
): Promise<KalshiTrade[]> {
  const params = new URLSearchParams({
    ticker,
    limit: String(Math.min(limit, 1000)),
  });

  const result = await kalshiFetch<KalshiTradesResponse>(
    `${KALSHI_API_BASE}/markets/trades?${params}`,
  );
  return result?.trades ?? [];
}

/**
 * Get a single market by ticker (public, no auth).
 */
export async function getMarket(ticker: string): Promise<KalshiMarket | null> {
  const result = await kalshiFetch<{ market: KalshiMarket }>(
    `${KALSHI_API_BASE}/markets/${encodeURIComponent(ticker)}`,
  );
  return result?.market ?? null;
}

/**
 * Get multiple markets (public, no auth).
 */
export async function getMarkets(params?: {
  status?: string;
  eventTicker?: string;
  limit?: number;
}): Promise<KalshiMarket[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.eventTicker) searchParams.set('event_ticker', params.eventTicker);
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const result = await kalshiFetch<KalshiMarketsResponse>(
    `${KALSHI_API_BASE}/markets?${searchParams}`,
  );
  return result?.markets ?? [];
}
