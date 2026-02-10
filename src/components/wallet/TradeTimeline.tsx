"use client";

import { useMemo, useState } from "react";

interface Trade {
  id?: number;
  wallet_address: string;
  condition_id: string;
  side: string;
  size: number;
  price: number;
  timestamp: number;
  transaction_hash: string | null;
  title: string | null;
  outcome: string | null;
  event_slug: string | null;
}

interface TradeTimelineProps {
  trades: Trade[];
}

type SortKey = "timestamp" | "size" | "price";
type SortDir = "asc" | "desc";

function formatRelativeTime(unix: number): string {
  // Timestamps may be in seconds or milliseconds
  const ms = unix > 1e12 ? unix : unix * 1000;
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatAbsoluteTime(unix: number): string {
  const ms = unix > 1e12 ? unix : unix * 1000;
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function TradeTimeline({ trades }: TradeTimelineProps) {
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedTrades = useMemo(() => {
    const sorted = [...trades].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [trades, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortIndicator(key: SortKey): string {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ^" : " v";
  }

  if (trades.length === 0) {
    return (
      <div className="bg-terminal-panel border border-terminal-border p-4">
        <h2 className="text-[10px] text-terminal-muted uppercase tracking-wider mb-2">
          Trade Timeline
        </h2>
        <p className="text-xs text-terminal-dim">No trades found</p>
      </div>
    );
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border">
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-[10px] text-terminal-muted uppercase tracking-wider">
          Trade Timeline
          <span className="ml-2 text-terminal-dim">
            ({trades.length} trades)
          </span>
        </h2>
      </div>
      <div className="overflow-auto max-h-[480px]">
        <table className="w-full">
          <thead className="sticky top-0 bg-terminal-panel z-10">
            <tr>
              <th
                className="text-left cursor-pointer hover:text-terminal-text select-none"
                onClick={() => handleSort("timestamp")}
              >
                Time{sortIndicator("timestamp")}
              </th>
              <th className="text-left">Market</th>
              <th className="text-left">Side</th>
              <th
                className="text-right cursor-pointer hover:text-terminal-text select-none"
                onClick={() => handleSort("size")}
              >
                Size{sortIndicator("size")}
              </th>
              <th
                className="text-right cursor-pointer hover:text-terminal-text select-none"
                onClick={() => handleSort("price")}
              >
                Price{sortIndicator("price")}
              </th>
              <th className="text-right">Hrs Pre-Res</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((trade, idx) => {
              const isBuy = trade.side.toUpperCase() === "BUY";
              const sideColor = isBuy
                ? "text-terminal-green"
                : "text-terminal-red";
              const usdValue = trade.size * trade.price;
              const marketUrl = trade.event_slug
                ? `https://polymarket.com/event/${trade.event_slug}`
                : null;
              const title =
                trade.title ??
                `${trade.condition_id.slice(0, 8)}...`;
              const truncatedTitle =
                title.length > 40 ? `${title.slice(0, 40)}...` : title;

              return (
                <tr
                  key={trade.id ?? `${trade.condition_id}-${trade.timestamp}-${idx}`}
                  className="border-t border-terminal-border/50 hover:bg-terminal-surface/50"
                >
                  <td
                    className="text-terminal-muted"
                    title={formatAbsoluteTime(trade.timestamp)}
                  >
                    {formatRelativeTime(trade.timestamp)}
                  </td>
                  <td>
                    {marketUrl ? (
                      <a
                        href={marketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terminal-blue hover:underline"
                        title={title}
                      >
                        {truncatedTitle}
                      </a>
                    ) : (
                      <span className="text-terminal-text" title={title}>
                        {truncatedTitle}
                      </span>
                    )}
                  </td>
                  <td className={sideColor}>
                    {trade.side.toUpperCase()}
                  </td>
                  <td className="text-right text-terminal-text">
                    {formatUsd(usdValue)}
                  </td>
                  <td className="text-right text-terminal-muted">
                    {trade.price.toFixed(3)}
                  </td>
                  <td className="text-right text-terminal-dim">
                    ---
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
