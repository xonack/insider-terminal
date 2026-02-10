"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { WalletHeader } from "@/components/wallet/WalletHeader";
import { SignalBreakdown } from "@/components/wallet/SignalBreakdown";
import { TradeTimeline } from "@/components/wallet/TradeTimeline";

interface WalletApiResponse {
  address: string;
  source?: "polymarket" | "kalshi";
  totalScore: number;
  band: {
    min: number;
    max: number;
    label: string;
    color: string;
  };
  signals: {
    walletAge: SignalValue;
    firstBetSize: SignalValue;
    betTiming: SignalValue;
    withdrawalSpeed: SignalValue;
    marketSelection: SignalValue;
    winRate: SignalValue;
    noHedging: SignalValue;
  };
  metadata: {
    totalVolume: number | null;
    totalPnl: number | null;
    tradeCount: number | null;
    firstTradeAt: number | null;
    lastTradeAt: number | null;
  };
  username: string | null;
  profileImage: string | null;
  trades: TradeData[];
  alerts: AlertData[];
  cachedAt: number;
  fresh: boolean;
  error?: string;
}

type SignalValue =
  | { raw: number; weight: number; weighted: number; details: string }
  | number
  | null;

interface TradeData {
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
  market_source?: "polymarket" | "kalshi";
}

interface AlertData {
  id: number;
  wallet_address: string;
  alert_type: string;
  condition_id: string | null;
  details: string | null;
  score_at_time: number | null;
  created_at: number;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-terminal-surface animate-pulse rounded-sm ${className}`}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header skeleton */}
      <div className="bg-terminal-panel border border-terminal-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <SkeletonBlock className="h-6 w-12" />
        </div>
        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-terminal-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <SkeletonBlock className="h-2 w-16" />
              <SkeletonBlock className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Signal skeleton */}
      <div className="bg-terminal-panel border border-terminal-border p-4">
        <SkeletonBlock className="h-2 w-28 mb-3" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <SkeletonBlock className="h-3 w-36" />
            <SkeletonBlock className="h-3 flex-1" />
            <SkeletonBlock className="h-3 w-8" />
            <SkeletonBlock className="h-3 w-10" />
          </div>
        ))}
      </div>

      {/* Trades skeleton */}
      <div className="bg-terminal-panel border border-terminal-border p-4">
        <SkeletonBlock className="h-2 w-24 mb-3" />
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-4 w-full mb-1" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, address }: { message: string; address: string }) {
  return (
    <div className="p-4">
      <div className="bg-terminal-panel border border-terminal-red/30 p-4">
        <h2 className="text-terminal-red text-sm uppercase tracking-wider mb-2">
          Error
        </h2>
        <p className="text-xs text-terminal-muted mb-3">{message}</p>
        <p className="text-[10px] text-terminal-dim mb-3">
          Address: {address}
        </p>
        <Link
          href="/wallet"
          className="text-xs text-terminal-blue hover:underline"
        >
          &larr; Back to Wallet Search
        </Link>
      </div>
    </div>
  );
}

function NotFoundState({ address }: { address: string }) {
  return (
    <div className="p-4">
      <div className="bg-terminal-panel border border-terminal-border p-4">
        <h2 className="text-terminal-orange text-sm uppercase tracking-wider mb-2">
          Wallet Not Found
        </h2>
        <p className="text-xs text-terminal-muted mb-1">
          No trading activity found for this address.
        </p>
        <p className="text-[10px] text-terminal-dim mb-3">
          {address}
        </p>
        <Link
          href="/wallet"
          className="text-xs text-terminal-blue hover:underline"
        >
          &larr; Back to Wallet Search
        </Link>
      </div>
    </div>
  );
}

export default function WalletAddressPage() {
  const params = useParams<{ address: string }>();
  const address = params.address;

  const [data, setData] = useState<WalletApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    async function fetchWallet() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/wallet/${encodeURIComponent(address)}`);
        const json = await res.json() as WalletApiResponse & { error?: string; details?: string };

        if (cancelled) return;

        if (!res.ok) {
          setError(json.error ?? json.details ?? `HTTP ${res.status}`);
          return;
        }

        setData(json);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchWallet();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} address={address} />;
  }

  if (!data) {
    return <NotFoundState address={address} />;
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] text-terminal-dim uppercase tracking-wider">
        <Link href="/wallet" className="hover:text-terminal-muted">
          Wallet
        </Link>
        <span>/</span>
        <span className="text-terminal-muted">Analysis</span>
        {data.fresh && (
          <span className="ml-auto text-terminal-green text-[9px]">
            FRESH SCAN
          </span>
        )}
        {!data.fresh && (
          <span className="ml-auto text-terminal-dim text-[9px]">
            CACHED
          </span>
        )}
      </div>

      <WalletHeader
        address={data.address}
        username={data.username}
        source={data.source}
        totalScore={data.totalScore}
        totalVolume={data.metadata.totalVolume}
        totalPnl={data.metadata.totalPnl}
        tradeCount={data.metadata.tradeCount}
        firstTradeAt={data.metadata.firstTradeAt}
        lastTradeAt={data.metadata.lastTradeAt}
        bandLabel={data.band.label}
        bandColor={data.band.color}
      />

      <SignalBreakdown signals={data.signals} />

      <TradeTimeline trades={data.trades} />
    </div>
  );
}
