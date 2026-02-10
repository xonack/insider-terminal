"use client";

import { useState } from "react";
import { SIGNAL_WEIGHTS } from "@/lib/utils/constants";

interface SignalBarsProps {
  walletAge: number | null;
  firstBet: number | null;
  betTiming: number | null;
  withdrawalSpeed: number | null;
  marketSelection: number | null;
  winRate: number | null;
  noHedging: number | null;
}

const SIGNAL_KEYS: Array<{
  key: keyof SignalBarsProps;
  weightKey: keyof typeof SIGNAL_WEIGHTS;
  label: string;
  name: string;
}> = [
  { key: "walletAge", weightKey: "walletAge", label: "AGE", name: "Wallet Age" },
  { key: "firstBet", weightKey: "firstBetSize", label: "BET", name: "First Bet Size" },
  { key: "betTiming", weightKey: "betTiming", label: "TMG", name: "Bet Timing" },
  { key: "withdrawalSpeed", weightKey: "withdrawalSpeed", label: "WDR", name: "Withdrawal Speed" },
  { key: "marketSelection", weightKey: "marketSelection", label: "MKT", name: "Market Selection" },
  { key: "winRate", weightKey: "winRate", label: "WIN", name: "Win Rate" },
  { key: "noHedging", weightKey: "noHedging", label: "HDG", name: "No Hedging" },
];

function getBarColor(intensity: number): string {
  if (intensity <= 0.2) return "bg-terminal-green/40";
  if (intensity <= 0.4) return "bg-terminal-yellow/60";
  if (intensity <= 0.6) return "bg-terminal-orange/70";
  if (intensity <= 0.8) return "bg-terminal-red/70";
  return "bg-terminal-red";
}

function getTextColor(intensity: number): string {
  if (intensity <= 0.2) return "text-terminal-green";
  if (intensity <= 0.4) return "text-terminal-yellow";
  if (intensity <= 0.6) return "text-terminal-orange";
  return "text-terminal-red";
}

export function SignalBars(props: SignalBarsProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative flex items-center gap-[2px]">
      {SIGNAL_KEYS.map(({ key, weightKey, label, name }) => {
        const weighted = props[key] ?? 0;
        const maxWeight = SIGNAL_WEIGHTS[weightKey];
        const intensity = maxWeight > 0 ? Math.min(weighted / maxWeight, 1) : 0;
        const widthPercent = Math.max(intensity * 100, 4);

        return (
          <div
            key={key}
            className="flex flex-col items-center cursor-pointer"
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-[14px] h-[10px] bg-terminal-surface overflow-hidden">
              <div
                className={`h-full ${getBarColor(intensity)}`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}

      {hovered && (() => {
        const sig = SIGNAL_KEYS.find((s) => s.key === hovered);
        if (!sig) return null;
        const weighted = props[sig.key] ?? 0;
        const maxWeight = SIGNAL_WEIGHTS[sig.weightKey];
        const intensity = maxWeight > 0 ? Math.min(weighted / maxWeight, 1) : 0;
        return (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-terminal-panel border border-terminal-border px-2 py-1 whitespace-nowrap z-50 pointer-events-none">
            <span className="text-terminal-dim text-[10px]">{sig.name}: </span>
            <span className={`text-[10px] font-bold ${getTextColor(intensity)}`}>
              {Math.round(weighted)}/{maxWeight}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
