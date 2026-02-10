"use client";

import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { MarketBadge } from "@/components/shared/MarketBadge";

interface WalletHeaderProps {
  address: string;
  username: string | null;
  source?: "polymarket" | "kalshi";
  totalScore: number;
  totalVolume: number | null;
  totalPnl: number | null;
  tradeCount: number | null;
  firstTradeAt: number | null;
  lastTradeAt: number | null;
  bandLabel: string;
  bandColor: string;
}

function formatUsd(value: number | null): string {
  if (value === null || value === undefined) return "---";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatDate(unix: number | null): string {
  if (unix === null) return "---";
  // Timestamps may be in seconds or milliseconds
  const ms = unix > 1e12 ? unix : unix * 1000;
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "---";
  return value.toLocaleString("en-US");
}

export function WalletHeader({
  address,
  username,
  source = "polymarket",
  totalScore,
  totalVolume,
  totalPnl,
  tradeCount,
  firstTradeAt,
  lastTradeAt,
  bandLabel,
  bandColor,
}: WalletHeaderProps) {
  const profileUrl = source === "kalshi"
    ? `https://kalshi.com`
    : `https://polymarket.com/profile/${address}`;
  const pnlColor =
    totalPnl !== null && totalPnl >= 0
      ? "text-terminal-green"
      : "text-terminal-red";

  return (
    <div className="bg-terminal-panel border border-terminal-border p-4">
      {/* Top row: address + score */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <MarketBadge source={source} />
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <AddressDisplay address={address} />
          </a>
          {username && (
            <span className="text-terminal-cyan text-xs truncate">
              @{username}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="text-[10px] uppercase tracking-wider font-bold"
            style={{ color: bandColor }}
          >
            {bandLabel}
          </span>
          <ScoreBadge score={totalScore} />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 mt-3 pt-3 border-t border-terminal-border">
        <StatCell label="VOLUME" value={formatUsd(totalVolume)} />
        <StatCell
          label="PNL"
          value={formatUsd(totalPnl)}
          className={pnlColor}
        />
        <StatCell label="TRADES" value={formatNumber(tradeCount)} />
        <StatCell label="FIRST ACTIVE" value={formatDate(firstTradeAt)} />
        <StatCell label="LAST ACTIVE" value={formatDate(lastTradeAt)} />
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  className = "text-terminal-text",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-terminal-dim uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-xs font-bold ${className}`}>{value}</span>
    </div>
  );
}
