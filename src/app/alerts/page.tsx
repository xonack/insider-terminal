"use client";

import { useState } from "react";
import { AlertFeed } from "@/components/alerts/AlertFeed";
import { useAlerts } from "@/hooks/useAlerts";

const ALERT_TYPES = [
  "ALL",
  "HIGH_SCORE",
  "LARGE_BET",
  "PRE_RESOLUTION",
  "NEW_WALLET_BIG_BET",
  "FAST_WITHDRAWAL",
] as const;

export default function AlertsPage() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const { data } = useAlerts(1, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <h1 className="text-terminal-green text-sm uppercase tracking-wider font-bold">
            Alert Feed
          </h1>
          {data && data.total > 0 && (
            <span className="bg-terminal-red/20 text-terminal-red text-[10px] font-bold px-1.5 py-0.5">
              {data.total}
            </span>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-terminal-border overflow-x-auto">
        {ALERT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveFilter(type)}
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 transition-colors shrink-0 ${
              activeFilter === type
                ? "bg-terminal-surface text-terminal-green border border-terminal-green/30"
                : "text-terminal-dim hover:text-terminal-muted border border-transparent"
            }`}
          >
            {type.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <AlertFeed typeFilter={activeFilter} />
      </div>
    </div>
  );
}
