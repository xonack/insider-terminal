export interface BootLineData {
  text: string;
  className?: string;
  delay: number;
  typewriter?: boolean;
  typewriterSpeed?: number;
}

function signal(text: string, connector: "\u251C" | "\u2514"): BootLineData {
  return {
    text: `  ${connector} ${text}`,
    className: "text-terminal-cyan",
    delay: 180,
    typewriter: true,
    typewriterSpeed: 12,
  };
}

function scoreBand(text: string, color: string): BootLineData {
  return { text, className: `text-[${color}]`, delay: 120 };
}

function navItem(text: string): BootLineData {
  return { text: `  ${text}`, className: "text-terminal-orange", delay: 120 };
}

function blank(delay: number): BootLineData {
  return { text: "", delay };
}

export const BOOT_LINES: BootLineData[] = [
  // Phase 1: System identification
  {
    text: "INSIDER TERMINAL v0.1.0",
    className: "text-terminal-green font-bold text-sm tracking-wider",
    delay: 300,
    typewriter: true,
    typewriterSpeed: 30,
  },
  {
    text: "\u2550".repeat(50),
    className: "text-terminal-border",
    delay: 200,
  },
  {
    text: "Polymarket Insider Trading Detection System",
    className: "text-terminal-muted",
    delay: 100,
  },
  {
    text: "All data sourced from public blockchain activity",
    className: "text-terminal-dim",
    delay: 100,
  },
  blank(500),

  // Phase 2: Signal module loading
  {
    text: "[INIT] Loading scoring engine...",
    className: "text-terminal-text",
    delay: 200,
  },
  signal("wallet_age      wt:15  New wallets making large bets", "\u251C"),
  signal("first_bet_size  wt:15  Oversized initial wager on new account", "\u251C"),
  signal("bet_timing      wt:20  Bets placed just before resolution", "\u251C"),
  signal("withdrawal      wt:15  Instant profit extraction after wins", "\u251C"),
  signal("market_select   wt:10  Targeting obscure low-volume markets", "\u251C"),
  signal("win_rate        wt:15  Implausible success rate across markets", "\u251C"),
  signal("no_hedging      wt:10  One-directional conviction bets only", "\u2514"),
  {
    text: "[  OK  ] 7 signals loaded. Composite score 0\u2013100.",
    className: "text-terminal-green font-bold",
    delay: 300,
  },
  blank(400),

  // Phase 3: Score bands
  {
    text: "[INIT] Score classification bands:",
    className: "text-terminal-text",
    delay: 200,
  },
  scoreBand("   0-20   CLEAN      Normal trading behavior", "#00ff00"),
  scoreBand("  21-40   LOW        Minor anomalies detected", "#88ff00"),
  scoreBand("  41-60   MODERATE   Pattern warrants attention", "#fb8b1e"),
  scoreBand("  61-80   HIGH       Strong insider indicators", "#ff6b35"),
  scoreBand("  81-100  EXTREME    Near-certain insider activity", "#ff433d"),
  blank(400),

  // Phase 4: Navigation
  {
    text: "[INIT] Navigation:",
    className: "text-terminal-text",
    delay: 200,
  },
  navItem("LDRBD    Ranked suspicion leaderboard"),
  navItem("WLLT     Analyze any wallet by address"),
  navItem("ALRT     Real-time suspicious activity feed"),
  navItem("MKTS     Markets with detected insider activity"),
  blank(500),

  // Ready
  {
    text: "[READY] System initialized.",
    className: "text-terminal-green font-bold",
    delay: 300,
  },
];
