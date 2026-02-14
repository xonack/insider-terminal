export interface PolymarketTrade {
  proxyWallet: string;
  side: 'BUY' | 'SELL';
  asset: string;
  conditionId: string;
  size: number;
  price: number;
  timestamp: number;
  title: string;
  slug: string;
  icon?: string;
  eventSlug?: string;
  outcome: string;
  outcomeIndex: number;
  name?: string;
  pseudonym?: string;
  bio?: string;
  profileImage?: string;
  profileImageOptimized?: string;
  transactionHash: string;
}

export interface PolymarketPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  curPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  realizedPnl: number;
  percentPnl: number;
  percentRealizedPnl: number;
  totalBought: number;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset: string;
  title: string;
  slug: string;
  icon: string;
  eventId: string;
  eventSlug: string;
  endDate: string;
  redeemable: boolean;
  mergeable: boolean;
  negativeRisk: boolean;
}

export interface PolymarketActivity {
  id: string;
  type: 'TRADE' | 'REDEEM' | 'SPLIT' | 'MERGE';
  conditionId: string;
  size: string;
  usdcSize: string;
  timestamp: number;
  side: 'BUY' | 'SELL' | '';
  outcome: string;
  outcomeIndex: number;
  title: string;
  slug: string;
  transactionHash: string;
  price: string;
}

export interface PolymarketMarket {
  conditionId: string;
  questionId: string;
  slug: string;
  title: string;
  question?: string;
  description: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  acceptingOrders: boolean;
  volume: string;
  volumeNum: number;
  liquidity: string;
  liquidityNum: number;
  outcomePrices: string;
  bestAsk: number;
  bestBid: number;
  clobTokenIds: string;
  outcomes: string;
  image: string;
  icon: string;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  enableOrderBook: boolean;
  resolution: string;
  resolvedBy: string;
  closedTime: string;
  umaResolutionStatus: string;
  pagerDutyNotificationEnabled: boolean;
  events: PolymarketEventRef[];
}

export interface PolymarketEventRef {
  id: string;
  slug: string;
  title: string;
}

export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  markets: PolymarketMarket[];
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  volume: number;
  liquidity: number;
  commentCount: number;
}

export interface PolymarketLeaderboardEntry {
  address: string;
  username: string;
  profileImage: string;
  pnl: number;
  volume: number;
  positions: number;
  marketsTraded: number;
  rank: number;
}

export interface PolymarketProfile {
  address: string;
  username: string;
  profileImage: string;
  bio: string;
  proxyWallet: string;
  lastSeen: number;
  name: string;
}

export interface WalletData {
  trades: PolymarketTrade[];
  positions: PolymarketPosition[];
  activities: PolymarketActivity[];
  profile: PolymarketProfile | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor?: string;
  limit: number;
  count: number;
}
