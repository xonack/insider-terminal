interface InsiderIndicatorProps {
  count: number;
}

export function InsiderIndicator({ count }: InsiderIndicatorProps) {
  if (count <= 0) return null;

  const isHot = count >= 3;

  return (
    <span className="inline-flex items-center gap-1.5">
      {/* Pulsing red dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-red opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-terminal-red" />
      </span>

      <span
        className={`text-[10px] font-bold uppercase tracking-wider ${
          isHot ? "text-terminal-red" : "text-terminal-red/80"
        }`}
      >
        {isHot && (
          <span className="bg-terminal-red/20 px-1 py-0.5 mr-1">HOT</span>
        )}
        {count} insider{count !== 1 ? "s" : ""}
      </span>
    </span>
  );
}
