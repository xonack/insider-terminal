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
}> = [
  { key: "walletAge", weightKey: "walletAge", label: "AGE" },
  { key: "firstBet", weightKey: "firstBetSize", label: "BET" },
  { key: "betTiming", weightKey: "betTiming", label: "TMG" },
  { key: "withdrawalSpeed", weightKey: "withdrawalSpeed", label: "WDR" },
  { key: "marketSelection", weightKey: "marketSelection", label: "MKT" },
  { key: "winRate", weightKey: "winRate", label: "WIN" },
  { key: "noHedging", weightKey: "noHedging", label: "HDG" },
];

function getBarColor(intensity: number): string {
  if (intensity <= 0.2) return "bg-terminal-green/40";
  if (intensity <= 0.4) return "bg-terminal-yellow/60";
  if (intensity <= 0.6) return "bg-terminal-orange/70";
  if (intensity <= 0.8) return "bg-terminal-red/70";
  return "bg-terminal-red";
}

export function SignalBars(props: SignalBarsProps) {
  return (
    <div className="flex items-center gap-[2px]" title="Signal breakdown">
      {SIGNAL_KEYS.map(({ key, weightKey, label }) => {
        const weighted = props[key] ?? 0;
        const maxWeight = SIGNAL_WEIGHTS[weightKey];
        // Normalize: weighted value / max possible weight = 0..1 intensity
        const intensity = maxWeight > 0 ? Math.min(weighted / maxWeight, 1) : 0;
        const widthPercent = Math.max(intensity * 100, 4); // minimum visible width

        return (
          <div
            key={key}
            className="flex flex-col items-center"
            title={`${label}: ${weighted.toFixed(1)}/${maxWeight}`}
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
    </div>
  );
}
