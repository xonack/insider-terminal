"use client";

interface MarketBadgeProps {
  source: "polymarket" | "kalshi";
}

const BADGE_STYLES = {
  polymarket: "bg-[#2e5cff]/20 text-[#5b8aff] border-[#2e5cff]/30",
  kalshi: "bg-[#4DE4B2]/20 text-[#4DE4B2] border-[#4DE4B2]/30",
} as const;

const BADGE_LABELS = {
  polymarket: "P",
  kalshi: "K",
} as const;

const BADGE_DESCRIPTIONS = {
  polymarket: "Polymarket — Crypto prediction market",
  kalshi: "Kalshi — Regulated US exchange",
} as const;

export function MarketBadge({ source }: MarketBadgeProps) {
  return (
    <span className="relative group inline-flex">
      <span
        className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded border cursor-default ${BADGE_STYLES[source]}`}
      >
        {BADGE_LABELS[source]}
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[11px] text-gray-200 bg-gray-900 border border-gray-700 rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
        {BADGE_DESCRIPTIONS[source]}
      </span>
    </span>
  );
}
