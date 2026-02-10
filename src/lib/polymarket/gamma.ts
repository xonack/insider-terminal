import { POLYMARKET_GAMMA_API } from '@/lib/utils/constants';
import { polyFetch } from './client';
import type { PolymarketEvent, PolymarketMarket } from './types';

export async function getMarket(conditionId: string): Promise<PolymarketMarket | null> {
  // Gamma API condition_id filter is unreliable — this is a fallback
  const results = await polyFetch<PolymarketMarket[]>(
    `${POLYMARKET_GAMMA_API}/markets?condition_id=${encodeURIComponent(conditionId)}&limit=1`,
  );
  if (!results || results.length === 0) return null;
  return results.find((m) => m.conditionId === conditionId) ?? null;
}

/** Look up a market by slug (more reliable than conditionId on Gamma API). */
export async function getMarketBySlug(slug: string): Promise<PolymarketMarket | null> {
  const results = await polyFetch<PolymarketMarket[]>(
    `${POLYMARKET_GAMMA_API}/markets?slug=${encodeURIComponent(slug)}&limit=1`,
  );
  if (!results || results.length === 0) return null;
  return results[0];
}

export async function getEvent(eventId: string): Promise<PolymarketEvent | null> {
  return polyFetch<PolymarketEvent | null>(
    `${POLYMARKET_GAMMA_API}/events/${encodeURIComponent(eventId)}`,
  );
}

export async function getActiveMarkets(params?: {
  limit?: number;
  offset?: number;
  closed?: boolean;
}): Promise<PolymarketMarket[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('active', 'true');
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
  if (params?.closed !== undefined) searchParams.set('closed', String(params.closed));

  const result = await polyFetch<PolymarketMarket[]>(
    `${POLYMARKET_GAMMA_API}/markets?${searchParams}`,
  );
  return result ?? [];
}
