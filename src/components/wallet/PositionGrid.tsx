"use client";

interface Position {
  condition_id: string;
  title: string | null;
  side: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

interface PositionGridProps {
  positions: Position[];
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function PositionGrid({ positions }: PositionGridProps) {
  if (positions.length === 0) {
    return (
      <div className="bg-terminal-panel border border-terminal-border p-4">
        <h2 className="text-[10px] text-terminal-muted uppercase tracking-wider mb-2">
          Open Positions
        </h2>
        <p className="text-xs text-terminal-dim">No open positions</p>
      </div>
    );
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border">
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-[10px] text-terminal-muted uppercase tracking-wider">
          Open Positions
          <span className="ml-2 text-terminal-dim">
            ({positions.length})
          </span>
        </h2>
      </div>
      <div className="overflow-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Market</th>
              <th className="text-left">Side</th>
              <th className="text-right">Size</th>
              <th className="text-right">Avg Price</th>
              <th className="text-right">Cur Price</th>
              <th className="text-right">Unrl PnL</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const pnlColor =
                pos.unrealizedPnl >= 0
                  ? "text-terminal-green"
                  : "text-terminal-red";
              const isBuy = pos.side.toUpperCase() === "BUY";
              const sideColor = isBuy
                ? "text-terminal-green"
                : "text-terminal-red";
              const title =
                pos.title ?? `${pos.condition_id.slice(0, 8)}...`;
              const truncatedTitle =
                title.length > 40 ? `${title.slice(0, 40)}...` : title;

              return (
                <tr
                  key={pos.condition_id}
                  className="border-t border-terminal-border/50 hover:bg-terminal-surface/50"
                >
                  <td>
                    <span className="text-terminal-text" title={title}>
                      {truncatedTitle}
                    </span>
                  </td>
                  <td className={sideColor}>
                    {pos.side.toUpperCase()}
                  </td>
                  <td className="text-right text-terminal-text">
                    {formatUsd(pos.size)}
                  </td>
                  <td className="text-right text-terminal-muted">
                    {pos.avgPrice.toFixed(3)}
                  </td>
                  <td className="text-right text-terminal-muted">
                    {pos.currentPrice.toFixed(3)}
                  </td>
                  <td className={`text-right font-bold ${pnlColor}`}>
                    {formatUsd(pos.unrealizedPnl)}
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
