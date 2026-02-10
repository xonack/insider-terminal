import { POLYMARKET_DATA_API } from '@/lib/utils/constants';
import { polyFetch } from './client';
import type {
  PolymarketActivity,
  PolymarketLeaderboardEntry,
  PolymarketPosition,
  PolymarketProfile,
  PolymarketTrade,
} from './types';

export async function getTrades(
  address: string,
  limit: number = 300,
): Promise<PolymarketTrade[]> {
  // The Polymarket Data API uses proxyWallet as the primary query param
  const params = new URLSearchParams({ proxyWallet: address, limit: String(limit) });
  const trades = await polyFetch<PolymarketTrade[]>(
    `${POLYMARKET_DATA_API}/trades?${params}`,
  );
  return trades ?? [];
}

export async function getPositions(address: string): Promise<PolymarketPosition[]> {
  const result = await polyFetch<PolymarketPosition[]>(
    `${POLYMARKET_DATA_API}/positions?user=${encodeURIComponent(address)}`,
  );
  return result ?? [];
}

export async function getActivity(
  address: string,
  limit: number = 100,
): Promise<PolymarketActivity[]> {
  const params = new URLSearchParams({
    user: address,
    limit: String(limit),
  });
  const result = await polyFetch<PolymarketActivity[]>(
    `${POLYMARKET_DATA_API}/activity?${params}`,
  );
  return result ?? [];
}

export async function getLeaderboard(params: {
  timePeriod?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}): Promise<PolymarketLeaderboardEntry[]> {
  const searchParams = new URLSearchParams();
  if (params.timePeriod) searchParams.set('timePeriod', params.timePeriod);
  if (params.orderBy) searchParams.set('orderBy', params.orderBy);
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

  const result = await polyFetch<PolymarketLeaderboardEntry[]>(
    `${POLYMARKET_DATA_API}/leaderboard?${searchParams}`,
  );
  return result ?? [];
}

/** Discover active wallets from recent global trades (works when /leaderboard is down). */
export async function getRecentTraders(limit: number = 500): Promise<string[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const trades = await polyFetch<PolymarketTrade[]>(
    `${POLYMARKET_DATA_API}/trades?${params}`,
  );
  if (!trades) return [];

  // Extract unique proxy wallet addresses, ordered by first appearance
  const seen = new Set<string>();
  const wallets: string[] = [];
  for (const t of trades) {
    const addr = (t.proxyWallet ?? '').toLowerCase();
    if (addr && !seen.has(addr)) {
      seen.add(addr);
      wallets.push(addr);
    }
  }
  return wallets;
}

export async function getProfile(address: string): Promise<PolymarketProfile | null> {
  return polyFetch<PolymarketProfile | null>(
    `${POLYMARKET_DATA_API}/profile?address=${encodeURIComponent(address)}`,
  );
}
