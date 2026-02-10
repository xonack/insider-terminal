"use client";

import { useQuery } from "@tanstack/react-query";
import type { AlertRow } from "@/lib/db/queries";

interface AlertWithUsername extends AlertRow {
  username: string | null;
}

export interface AlertsResponse {
  alerts: AlertWithUsername[];
  total: number;
}

export function useAlerts(limit = 100, offset = 0, type?: string) {
  return useQuery<AlertsResponse>({
    queryKey: ["alerts", limit, offset, type],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (type) params.set("type", type);
      const res = await fetch(`/api/alerts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json() as Promise<AlertsResponse>;
    },
  });
}
