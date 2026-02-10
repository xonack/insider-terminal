"use client";

import { useQuery } from "@tanstack/react-query";
import type { WalletRow } from "@/lib/db/queries";

export interface LeaderboardResponse {
  wallets: WalletRow[];
  total: number;
  hasStaleData: boolean;
}

export function useLeaderboard(limit = 50, offset = 0, minScore = 0, source?: string) {
  return useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", limit, offset, minScore, source],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        minScore: String(minScore),
      });
      if (source) params.set("source", source);
      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json() as Promise<LeaderboardResponse>;
    },
  });
}
