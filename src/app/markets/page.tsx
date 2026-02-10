"use client";

import { MarketGrid } from "@/components/markets/MarketGrid";

export default function MarketsPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-terminal-border">
        <h1 className="text-terminal-green text-sm uppercase tracking-wider font-bold">
          Market Overview
        </h1>
        <p className="text-terminal-dim text-[10px] uppercase tracking-wider mt-1">
          Markets resolving within 48h with insider activity
        </p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <MarketGrid />
      </div>
    </div>
  );
}
