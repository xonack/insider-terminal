"use client";

import { useMarkets } from "@/hooks/useMarkets";
import { InsiderIndicator } from "./InsiderIndicator";
import { formatCompact, timeUntil } from "@/lib/utils/format";

export function MarketGrid() {
  const { data, isLoading, error } = useMarkets();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-terminal-panel border border-terminal-border h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-terminal-red text-xs font-mono">
        ERROR: Failed to fetch markets. {error.message}
      </div>
    );
  }

  if (!data || data.markets.length === 0) {
    return (
      <div className="p-4 text-terminal-dim text-xs font-mono text-center mt-8">
        No markets with insider activity detected.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 p-2">
      {data.markets.map((market) => (
        <MarketCard
          key={market.conditionId}
          conditionId={market.conditionId}
          title={market.title}
          slug={market.slug}
          endDate={market.endDate}
          volume={market.volume}
          insiderCount={market.insiderCount}
        />
      ))}
    </div>
  );
}

interface MarketCardProps {
  conditionId: string;
  title: string;
  slug: string;
  endDate: string;
  volume: number;
  insiderCount: number;
}

function MarketCard({
  conditionId,
  title,
  slug,
  endDate,
  volume,
  insiderCount,
}: MarketCardProps) {
  const endMs = new Date(endDate).getTime();
  const resolveLabel = timeUntil(endMs);
  const polymarketUrl = `https://polymarket.com/event/${slug}`;

  return (
    <a
      href={polymarketUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-terminal-panel border border-terminal-border p-3 flex flex-col gap-2 hover:border-terminal-dim transition-colors group"
    >
      {/* Title */}
      <h3
        className="text-terminal-text text-xs font-bold leading-tight group-hover:text-terminal-green transition-colors"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </h3>

      {/* Resolution time */}
      <div className="flex items-center justify-between">
        <span className="text-terminal-yellow text-[10px] uppercase tracking-wider font-bold">
          Resolves {resolveLabel}
        </span>
        <span className="text-terminal-dim text-[10px] font-mono" title={conditionId}>
          {conditionId.slice(0, 8)}...
        </span>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-between border-t border-terminal-border pt-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-terminal-dim uppercase tracking-wider">
            Volume
          </span>
          <span className="text-terminal-text text-xs font-bold">
            {formatCompact(volume)}
          </span>
        </div>

        {/* Insider indicator */}
        <InsiderIndicator count={insiderCount} />
      </div>
    </a>
  );
}
