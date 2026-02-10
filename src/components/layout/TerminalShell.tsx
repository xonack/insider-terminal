"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "LDRBD", href: "/leaderboard", description: "Leaderboard" },
  { label: "WLLT", href: "/wallet", description: "Wallet" },
  { label: "ALRT", href: "/alerts", description: "Alerts" },
  { label: "MKTS", href: "/markets", description: "Markets" },
] as const;

function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="text-terminal-muted text-xs">{time}</span>;
}

export function TerminalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-screen w-screen grid grid-rows-[36px_1fr_28px] grid-cols-[200px_1fr] overflow-hidden">
      {/* Top bar */}
      <header className="col-span-2 flex items-center justify-between px-4 border-b border-terminal-border bg-terminal-panel">
        <div className="flex items-center gap-3">
          <span className="text-terminal-green text-sm font-bold tracking-wider">
            INSIDER TERMINAL
          </span>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-terminal-green" />
            </span>
            <span className="text-terminal-green text-[10px] uppercase tracking-widest">
              Live
            </span>
          </span>
        </div>
        <Clock />
      </header>

      {/* Sidebar */}
      <nav className="row-start-2 border-r border-terminal-border bg-terminal-panel flex flex-col pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
                isActive
                  ? "text-terminal-orange bg-terminal-surface border-l-2 border-terminal-orange"
                  : "text-terminal-muted hover:text-terminal-text border-l-2 border-transparent"
              }`}
            >
              <span className="font-bold">{item.label}</span>
              <span
                className={`text-[10px] ${
                  isActive ? "text-terminal-orange/70" : "text-terminal-dim"
                }`}
              >
                {item.description}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Content area */}
      <main className="row-start-2 col-start-2 overflow-auto bg-terminal-bg">
        {children}
      </main>

      {/* Status bar */}
      <footer className="col-span-2 flex items-center px-4 text-[10px] text-terminal-dim border-t border-terminal-border bg-terminal-panel uppercase tracking-wider">
        <span>API: ---/1000</span>
        <span className="mx-3">|</span>
        <span>Wallets: ---</span>
        <span className="mx-3">|</span>
        <span>Alerts: ---</span>
        <span className="mx-3">|</span>
        <span>Last Scan: never</span>
      </footer>
    </div>
  );
}
