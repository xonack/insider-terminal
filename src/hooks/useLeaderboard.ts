"use client";

import { useQuery } from "@tanstack/react-query";
import type { WalletRow } from "@/lib/db/queries";

export interface LeaderboardResponse {
  wallets: WalletRow[];
  total: number;
  hasStaleData: boolean;
}

export function useLeaderboard(limit = 50, offset = 0, minScore = 0) {
  return useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", limit, offset, minScore],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        minScore: String(minScore),
      });
      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json() as Promise<LeaderboardResponse>;
    },
  });
}
