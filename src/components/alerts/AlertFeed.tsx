"use client";

import { useAlerts } from "@/hooks/useAlerts";
import { AlertCard } from "./AlertCard";

interface AlertFeedProps {
  typeFilter?: string;
}

export function AlertFeed({ typeFilter }: AlertFeedProps) {
  const { data, isLoading, error } = useAlerts(
    200,
    0,
    typeFilter === "ALL" ? undefined : typeFilter,
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-terminal-panel border border-terminal-border h-9 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-terminal-red text-xs font-mono">
        ERROR: Failed to fetch alerts. {error.message}
      </div>
    );
  }

  if (!data || data.alerts.length === 0) {
    return (
      <div className="p-4 text-terminal-dim text-xs font-mono text-center mt-8 max-w-md mx-auto">
        <p className="mb-3">No alerts detected yet.</p>
        <p className="text-terminal-muted leading-relaxed">
          Alerts trigger when a wallet scores above <span className="text-terminal-orange font-bold">60/100</span> on
          the insider probability index. The system scans wallets automatically every 10 minutes, scoring 7 behavioral
          signals: wallet age, first bet size, bet timing vs resolution, withdrawal speed, market selection,
          win rate, and hedging patterns.
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] uppercase tracking-wider">
          <span className="text-terminal-orange">61-80 HIGH</span>
          <span className="text-terminal-red">81-100 EXTREME</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2 overflow-y-auto">
      {data.alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alertType={alert.alert_type}
          walletAddress={alert.wallet_address}
          username={alert.username}
          scoreAtTime={alert.score_at_time}
          details={alert.details}
          conditionId={alert.condition_id}
          createdAt={alert.created_at}
        />
      ))}
    </div>
  );
}
