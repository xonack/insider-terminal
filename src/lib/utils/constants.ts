export const POLYMARKET_DATA_API = 'https://data-api.polymarket.com';
export const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';
export const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

export type MarketSource = 'polymarket' | 'kalshi';
export const VALID_SOURCES: readonly string[] = ['polymarket', 'kalshi'] as const;

export function parseSource(value: string | null): MarketSource | undefined {
  if (!value) return undefined;
  if (VALID_SOURCES.includes(value)) return value as MarketSource;
  return undefined;
}

export function validateSource(value: string | null): MarketSource {
  return parseSource(value) ?? 'polymarket';
}

export const SIGNAL_WEIGHTS = {
  walletAge: 15,
  firstBetSize: 15,
  betTiming: 20,
  withdrawalSpeed: 15,
  marketSelection: 10,
  winRate: 15,
  noHedging: 10,
} as const;

export const RATE_LIMIT = {
  maxCalls: 1000,
  windowMs: 60 * 60 * 1000,
} as const;

export const CACHE_TTL = {
  trades: 5 * 60,
  positions: 2 * 60,
  marketMetadata: 60 * 60,
  leaderboard: 30 * 60,
  walletScore: 2 * 60 * 60,
} as const;

export const SCORE_BANDS = {
  CLEAN: { min: 0, max: 20, label: 'Clean', color: '#00ff00' },
  LOW: { min: 21, max: 40, label: 'Low', color: '#88ff00' },
  MODERATE: { min: 41, max: 60, label: 'Moderate', color: '#fb8b1e' },
  HIGH: { min: 61, max: 80, label: 'High', color: '#ff6b35' },
  EXTREME: { min: 81, max: 100, label: 'Extreme', color: '#ff433d' },
} as const;
