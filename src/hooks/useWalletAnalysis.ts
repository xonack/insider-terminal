"use client";

import { useQuery } from "@tanstack/react-query";

export interface WalletAnalysisResponse {
  address: string;
  totalScore: number;
  band: { min: number; max: number; label: string; color: string };
  signals: Record<string, number | null>;
  metadata: {
    totalVolume: number | null;
    totalPnl: number | null;
    tradeCount: number | null;
    firstTradeAt: number | null;
    lastTradeAt: number | null;
  };
  username: string | null;
  profileImage: string | null;
  trades: unknown[];
  alerts: unknown[];
  cachedAt: number;
  fresh: boolean;
}

export function useWalletAnalysis(address: string | null) {
  return useQuery<WalletAnalysisResponse>({
    queryKey: ["wallet", address],
    queryFn: async () => {
      const res = await fetch(`/api/wallet/${address}`);
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return res.json() as Promise<WalletAnalysisResponse>;
    },
    enabled: !!address,
  });
}
