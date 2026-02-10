"use client";

import Link from "next/link";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { timeAgo } from "@/lib/utils/format";

const ALERT_TYPE_STYLES: Record<string, { label: string; border: string; bg: string; text: string }> = {
  HIGH_SCORE: {
    label: "HIGH SCORE",
    border: "border-l-terminal-red",
    bg: "bg-terminal-red/15",
    text: "text-terminal-red",
  },
  LARGE_BET: {
    label: "LARGE BET",
    border: "border-l-terminal-orange",
    bg: "bg-terminal-orange/15",
    text: "text-terminal-orange",
  },
  PRE_RESOLUTION: {
    label: "PRE-RESOLUTION",
    border: "border-l-terminal-yellow",
    bg: "bg-terminal-yellow/15",
    text: "text-terminal-yellow",
  },
  NEW_WALLET_BIG_BET: {
    label: "NEW WALLET",
    border: "border-l-terminal-cyan",
    bg: "bg-terminal-cyan/15",
    text: "text-terminal-cyan",
  },
  FAST_WITHDRAWAL: {
    label: "FAST WITHDRAW",
    border: "border-l-[#c850c0]",
    bg: "bg-[#c850c0]/15",
    text: "text-[#c850c0]",
  },
};

const DEFAULT_STYLE = {
  label: "UNKNOWN",
  border: "border-l-terminal-muted",
  bg: "bg-terminal-muted/15",
  text: "text-terminal-muted",
};

interface AlertCardProps {
  alertType: string;
  walletAddress: string;
  username: string | null;
  scoreAtTime: number | null;
  details: string | null;
  conditionId: string | null;
  createdAt: number;
}

export function AlertCard({
  alertType,
  walletAddress,
  username,
  scoreAtTime,
  details,
  conditionId,
  createdAt,
}: AlertCardProps) {
  const style = ALERT_TYPE_STYLES[alertType] ?? DEFAULT_STYLE;

  return (
    <div
      className={`bg-terminal-panel border border-terminal-border border-l-2 ${style.border} px-3 py-2 flex items-center gap-3`}
    >
      {/* Timestamp */}
      <span className="text-terminal-dim text-[10px] w-14 shrink-0 text-right font-mono">
        {timeAgo(createdAt)}
      </span>

      {/* Alert type badge */}
      <span
        className={`${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 shrink-0`}
      >
        {style.label}
      </span>

      {/* Wallet address */}
      <Link
        href={`/wallet/${walletAddress}`}
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        <AddressDisplay address={walletAddress} />
      </Link>

      {/* Username if present */}
      {username && (
        <span className="text-terminal-cyan text-[10px] truncate shrink-0">
          @{username}
        </span>
      )}

      {/* Score at time */}
      {scoreAtTime !== null && (
        <div className="shrink-0">
          <ScoreBadge score={scoreAtTime} />
        </div>
      )}

      {/* Details */}
      {details && (
        <span className="text-terminal-muted text-[10px] truncate min-w-0 flex-1">
          {details}
        </span>
      )}

      {/* Condition link */}
      {conditionId && (
        <Link
          href={`/markets/${conditionId}`}
          className="text-terminal-blue text-[10px] hover:underline shrink-0 font-mono"
          title={conditionId}
        >
          MKT
        </Link>
      )}
    </div>
  );
}
