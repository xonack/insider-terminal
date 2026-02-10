/** Kalshi public trade (from /markets/trades — no user attribution). */
export interface KalshiTrade {
  trade_id: string;
  ticker: string;
  count: number;
  count_fp: string;
  yes_price: number; // cents
  no_price: number; // cents
  yes_price_dollars: string;
  no_price_dollars: string;
  taker_side: 'yes' | 'no';
  created_time: string; // ISO 8601
}

/** Kalshi fill (from /portfolio/fills — authenticated, own account only). */
export interface KalshiFill {
  fill_id: string;
  trade_id: string;
  order_id: string;
  ticker: string;
  market_ticker: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  count: number;
  count_fp: string;
  yes_price: number; // cents
  no_price: number; // cents
  yes_price_fixed: string;
  no_price_fixed: string;
  is_taker: boolean;
  created_time: string;
  fee_cost: string;
  ts: number;
}

/** Kalshi market position (from /portfolio/positions). */
export interface KalshiMarketPosition {
  ticker: string;
  position: number; // negative = NO, positive = YES
  total_traded: number; // cents
  market_exposure: number; // cents
  realized_pnl: number; // cents
  fees_paid: number; // cents
  total_traded_dollars: string;
  market_exposure_dollars: string;
  realized_pnl_dollars: string;
  fees_paid_dollars: string;
}

/** Kalshi event position. */
export interface KalshiEventPosition {
  event_ticker: string;
  total_cost: number;
  total_cost_shares: number;
  event_exposure: number;
  realized_pnl: number;
  fees_paid: number;
}

/** Kalshi market metadata (from /markets). */
export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  market_type: 'binary' | 'scalar';
  title: string;
  subtitle: string;
  status: 'unopened' | 'open' | 'paused' | 'closed' | 'settled';
  result: string;
  yes_bid_dollars: string;
  yes_ask_dollars: string;
  no_bid_dollars: string;
  no_ask_dollars: string;
  last_price_dollars: string;
  volume_fp: string;
  volume_24h_fp: string;
  open_interest_fp: string;
  created_time: string;
  updated_time: string;
  open_time: string;
  close_time: string;
  settlement_value_dollars: string;
}

/** Paginated response wrapper for Kalshi API. */
export interface KalshiPaginatedResponse<T> {
  cursor: string;
}

export interface KalshiFillsResponse {
  fills: KalshiFill[];
  cursor: string;
}

export interface KalshiPositionsResponse {
  market_positions: KalshiMarketPosition[];
  event_positions: KalshiEventPosition[];
  cursor: string;
}

export interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor: string;
}

export interface KalshiTradesResponse {
  trades: KalshiTrade[];
  cursor: string;
}
