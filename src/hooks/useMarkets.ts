"use client";

import { useQuery } from "@tanstack/react-query";

export interface MarketWithInsiderActivity {
  conditionId: string;
  title: string;
  slug: string;
  traderCount: number;
  totalVolume: number;
  tradeCount: number;
  insiderCount: number;
  insiderAddresses: string[];
}

export interface MarketsResponse {
  markets: MarketWithInsiderActivity[];
}

export function useMarkets() {
  return useQuery<MarketsResponse>({
    queryKey: ["markets"],
    queryFn: async () => {
      const res = await fetch("/api/markets");
      if (!res.ok) throw new Error("Failed to fetch markets");
      return res.json() as Promise<MarketsResponse>;
    },
  });
}
