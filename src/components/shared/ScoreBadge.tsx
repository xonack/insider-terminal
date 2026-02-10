interface ScoreBadgeProps {
  score: number;
}

function getScoreColor(score: number): { bg: string; text: string; pulse: boolean } {
  if (score <= 20) {
    return { bg: "bg-terminal-green/20", text: "text-terminal-green", pulse: false };
  }
  if (score <= 40) {
    return { bg: "bg-terminal-yellow/20", text: "text-terminal-yellow", pulse: false };
  }
  if (score <= 60) {
    return { bg: "bg-terminal-orange/20", text: "text-terminal-orange", pulse: false };
  }
  if (score <= 80) {
    return { bg: "bg-terminal-red/20", text: "text-terminal-red", pulse: false };
  }
  return { bg: "bg-terminal-red/30", text: "text-terminal-red", pulse: true };
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const { bg, text, pulse } = getScoreColor(clamped);

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full ${bg} ${text} ${
        pulse ? "animate-pulse" : ""
      }`}
    >
      {clamped}
    </span>
  );
}
