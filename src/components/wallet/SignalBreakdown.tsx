"use client";

import { SIGNAL_WEIGHTS } from "@/lib/utils/constants";

interface SignalData {
  raw: number;
  weight: number;
  weighted: number;
  details: string;
}

/**
 * The API returns full SignalResult objects when fresh,
 * but flat weighted numbers when cached. This type handles both.
 */
type ApiSignalValue = SignalData | number | null;

interface SignalBreakdownProps {
  signals: {
    walletAge: ApiSignalValue;
    firstBetSize: ApiSignalValue;
    betTiming: ApiSignalValue;
    withdrawalSpeed: ApiSignalValue;
    marketSelection: ApiSignalValue;
    winRate: ApiSignalValue;
    noHedging: ApiSignalValue;
  };
}

const SIGNAL_LABELS: Record<string, string> = {
  walletAge: "Wallet Age",
  firstBetSize: "First Bet Size",
  betTiming: "Bet Timing",
  withdrawalSpeed: "Withdrawal Speed",
  marketSelection: "Market Selection",
  winRate: "Win Rate",
  noHedging: "No Hedging",
};

function normalizeSignal(
  key: keyof typeof SIGNAL_WEIGHTS,
  value: ApiSignalValue
): SignalData {
  const weight = SIGNAL_WEIGHTS[key];

  // Full signal object (fresh API response)
  if (value !== null && typeof value === "object" && "raw" in value) {
    return value;
  }

  // Flat weighted number (cached API response) - reverse-engineer raw
  if (typeof value === "number") {
    const raw = weight > 0 ? value / weight : 0;
    return {
      raw: Math.min(1, Math.max(0, raw)),
      weight,
      weighted: value,
      details: "",
    };
  }

  // Null / missing
  return { raw: 0, weight, weighted: 0, details: "No data" };
}

function getBarColor(raw: number): string {
  if (raw <= 0.3) return "bg-terminal-green";
  if (raw <= 0.6) return "bg-terminal-orange";
  return "bg-terminal-red";
}

function getBarTextColor(raw: number): string {
  if (raw <= 0.3) return "text-terminal-green";
  if (raw <= 0.6) return "text-terminal-orange";
  return "text-terminal-red";
}

export function SignalBreakdown({ signals }: SignalBreakdownProps) {
  const signalKeys = Object.keys(SIGNAL_WEIGHTS) as Array<
    keyof typeof SIGNAL_WEIGHTS
  >;

  return (
    <div className="bg-terminal-panel border border-terminal-border p-4">
      <h2 className="text-[10px] text-terminal-muted uppercase tracking-wider mb-3">
        Signal Breakdown
      </h2>
      <div className="flex flex-col gap-2">
        {signalKeys.map((key) => {
          const signal = normalizeSignal(
            key,
            signals[key as keyof typeof signals]
          );
          const barColor = getBarColor(signal.raw);
          const textColor = getBarTextColor(signal.raw);

          return (
            <div key={key}>
              <div className="flex items-center gap-2">
                {/* Signal name */}
                <span className="text-xs text-terminal-text w-36 shrink-0 truncate">
                  {SIGNAL_LABELS[key] ?? key}
                </span>

                {/* Bar */}
                <div className="flex-1 h-3 bg-terminal-surface rounded-sm overflow-hidden relative">
                  <div
                    className={`h-full ${barColor} transition-all duration-300`}
                    style={{ width: `${Math.round(signal.raw * 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] text-terminal-text/80 font-bold">
                    {signal.raw.toFixed(2)}
                  </span>
                </div>

                {/* Weight */}
                <span className="text-[10px] text-terminal-dim w-8 text-right shrink-0">
                  x{signal.weight}
                </span>

                {/* Weighted score */}
                <span
                  className={`text-xs font-bold w-10 text-right shrink-0 ${textColor}`}
                >
                  {signal.weighted.toFixed(1)}
                </span>
              </div>

              {/* Details */}
              {signal.details && (
                <p className="text-[10px] text-terminal-dim ml-36 pl-2 mt-0.5 truncate">
                  {signal.details}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
