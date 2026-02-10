"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type { WalletRow } from "@/lib/db/queries";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { SignalBars } from "@/components/leaderboard/SignalBars";
import { MarketBadge } from "@/components/shared/MarketBadge";

// --- Formatters ---

function formatUsd(value: number | null): string {
  if (value === null || value === undefined) return "-";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("en-US");
}

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "-";
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

// --- Column Definitions ---

const columnHelper = createColumnHelper<WalletRow>();

function getColumns(offset: number) {
  return [
    columnHelper.display({
      id: "rank",
      header: () => <span title="Rank by insider probability score">#</span>,
      cell: (info) => (
        <span className="text-terminal-dim">
          {info.row.index + offset + 1}
        </span>
      ),
      size: 40,
    }),

    columnHelper.accessor("total_score", {
      header: () => <span title="Composite insider probability score (0-100). Weighted sum of 7 behavioral signals.">SCORE</span>,
      cell: (info) => <ScoreBadge score={info.getValue()} />,
      size: 60,
      enableSorting: true,
    }),

    columnHelper.accessor("address", {
      header: () => <span title="Wallet address and platform source">WALLET</span>,
      cell: (info) => {
        const username = info.row.original.username;
        const source = info.row.original.market_source ?? "polymarket";
        return (
          <div className="flex items-center gap-1.5">
            <MarketBadge source={source} />
            <AddressDisplay address={info.getValue()} />
            {username && (
              <span className="hidden sm:inline text-terminal-muted text-[10px]">
                ({username})
              </span>
            )}
          </div>
        );
      },
      size: 110,
      enableSorting: false,
    }),

    columnHelper.display({
      id: "signals",
      header: () => <span title="7 behavioral signals: Wallet Age, First Bet, Bet Timing, Withdrawal Speed, Market Selection, Win Rate, No Hedging. Hover each bar for details.">SIGNALS</span>,
      cell: (info) => {
        const row = info.row.original;
        return (
          <SignalBars
            walletAge={row.signal_wallet_age}
            firstBet={row.signal_first_bet}
            betTiming={row.signal_bet_timing}
            withdrawalSpeed={row.signal_withdrawal_speed}
            marketSelection={row.signal_market_selection}
            winRate={row.signal_win_rate}
            noHedging={row.signal_no_hedging}
          />
        );
      },
      size: 120,
    }),

    columnHelper.accessor("total_volume", {
      header: () => <span title="Total USD trading volume across analyzed trades">VOLUME</span>,
      cell: (info) => (
        <span className="text-terminal-text">{formatUsd(info.getValue())}</span>
      ),
      size: 80,
      enableSorting: true,
    }),

    columnHelper.accessor("total_pnl", {
      header: () => <span title="Realized + unrealized profit and loss from open positions">PNL</span>,
      cell: (info) => {
        const val = info.getValue();
        if (val === null || val === undefined) return <span>-</span>;
        const color = val >= 0 ? "text-terminal-green" : "text-terminal-red";
        const prefix = val >= 0 ? "+" : "";
        return (
          <span className={color}>
            {prefix}
            {formatUsd(val)}
          </span>
        );
      },
      size: 80,
      enableSorting: true,
    }),

    columnHelper.accessor("trade_count", {
      header: () => (
        <span title="Number of recent trades analyzed (max 300). Not the wallet's lifetime total.">
          TRADES
        </span>
      ),
      cell: (info) => (
        <span className="text-terminal-text">{formatNumber(info.getValue())}</span>
      ),
      size: 60,
      enableSorting: false,
    }),

    columnHelper.accessor("last_trade_at", {
      header: () => <span title="Time since the wallet's most recent trade">LAST ACTIVE</span>,
      cell: (info) => (
        <span className="text-terminal-dim">
          {formatRelativeTime(info.getValue())}
        </span>
      ),
      size: 90,
      enableSorting: false,
    }),
  ];
}

// --- Skeleton Row ---

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-terminal-border/50">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="py-1 px-2">
              <div className="h-3 bg-terminal-surface animate-pulse rounded-sm w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// --- Main Page ---

export default function LeaderboardPage() {
  const router = useRouter();
  const [source, setSource] = useState<string | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "total_score", desc: true },
  ]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    const src = new URL(window.location.href).searchParams.get("source");
    if (src) setSource(src);
  }, []);

  const limit = 50;
  const { data, isLoading, isError, error, refetch } = useLeaderboard(limit, offset, 0, source);
  const columns = useMemo(() => getColumns(offset), [offset]);

  const table = useReactTable({
    data: data?.wallets ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/scan?force=true", { method: "POST" });
      if (!res.ok) throw new Error("Scan failed");
      const result = await res.json() as { scanned: number; newAlerts: number; total: number };
      setScanResult(
        `Scanned ${result.scanned} wallets. ${result.newAlerts} new alerts. ${result.total} total tracked.`
      );
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setScanResult(`Error: ${message}`);
    } finally {
      setScanning(false);
    }
  }, [refetch]);

  const handleRowClick = useCallback(
    (address: string) => {
      router.push(`/wallet/${address}`);
    },
    [router],
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 gap-2 border-b border-terminal-border">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-terminal-green text-xs uppercase tracking-wider font-bold">
            Insider Leaderboard
          </h1>
          {data && (
            <span className="text-terminal-dim text-[10px]">
              {data.total} wallets tracked
            </span>
          )}
          {data?.hasStaleData && (
            <span className="text-terminal-orange text-[10px] cursor-help" title="Hit scan to update data.">
              [STALE DATA]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {scanResult && (
            <span className="text-terminal-muted text-[10px] max-w-[200px] sm:max-w-[300px] truncate flex-1 sm:flex-none">
              {scanResult}
            </span>
          )}
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="px-3 py-2 sm:py-1 text-[10px] uppercase tracking-wider font-bold border border-terminal-green text-terminal-green hover:bg-terminal-green/10 disabled:opacity-50 disabled:cursor-wait transition-colors min-h-[44px] sm:min-h-0"
          >
            {scanning ? "SCANNING..." : "SCAN"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isError ? (
          <div className="p-4 text-terminal-red text-xs">
            Error loading leaderboard: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="sticky top-0 bg-terminal-panel z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`text-left px-2 py-2 ${
                        header.column.getCanSort()
                          ? "cursor-pointer select-none hover:text-terminal-text"
                          : ""
                      } ${
                        ["total_volume", "total_pnl", "trade_count"].includes(header.column.id)
                          ? "text-right"
                          : ""
                      }`}
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        {{
                          asc: " ^",
                          desc: " v",
                        }[header.column.getIsSorted() as string] ?? ""}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows count={20} />
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-terminal-muted text-xs"
                  >
                    <div>No wallets scored yet.</div>
                    <div className="mt-1">
                      Click{" "}
                      <button
                        type="button"
                        onClick={handleScan}
                        className="text-terminal-green underline"
                      >
                        Scan
                      </button>{" "}
                      to start discovering insider wallets.
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-terminal-border/30 hover:bg-terminal-surface/50 cursor-pointer transition-colors"
                    style={{ height: 28 }}
                    onClick={() => handleRowClick(row.original.address)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-2 ${
                          ["total_volume", "total_pnl", "trade_count"].includes(
                            cell.column.id,
                          )
                            ? "text-right"
                            : ""
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between px-4 py-2 sm:py-1 border-t border-terminal-border text-[10px] text-terminal-muted">
          <span className="text-xs sm:text-[10px]">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-2 sm:px-2 sm:py-0.5 border border-terminal-border text-terminal-muted hover:text-terminal-text disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
            >
              PREV
            </button>
            <button
              type="button"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= data.total}
              className="px-3 py-2 sm:px-2 sm:py-0.5 border border-terminal-border text-terminal-muted hover:text-terminal-text disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
