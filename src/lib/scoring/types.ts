export interface SignalResult {
  raw: number; // 0.0 to 1.0
  weight: number;
  weighted: number; // raw * weight
  details: string; // human-readable explanation
}

export interface SignalResults {
  walletAge: SignalResult;
  firstBetSize: SignalResult;
  betTiming: SignalResult;
  withdrawalSpeed: SignalResult;
  marketSelection: SignalResult;
  winRate: SignalResult;
  noHedging: SignalResult;
}

export interface ScoringResult {
  address: string;
  totalScore: number; // 0-100
  signals: SignalResults;
  metadata: {
    totalVolume: number;
    totalPnl: number;
    tradeCount: number;
    firstTradeAt: number | null;
    lastTradeAt: number | null;
  };
}
