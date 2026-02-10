"use client";

interface MarketBadgeProps {
  source: "polymarket" | "kalshi";
}

const BADGE_STYLES = {
  polymarket: "bg-green-500/20 text-green-400 border-green-500/30",
  kalshi: "bg-blue-500/20 text-blue-400 border-blue-500/30",
} as const;

const BADGE_LABELS = {
  polymarket: "P",
  kalshi: "K",
} as const;

const BADGE_TITLES = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
} as const;

export function MarketBadge({ source }: MarketBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded border ${BADGE_STYLES[source]}`}
      title={BADGE_TITLES[source]}
    >
      {BADGE_LABELS[source]}
    </span>
  );
}
