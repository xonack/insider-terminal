"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TerminalBoot } from "@/components/onboarding/TerminalBoot";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Menu, X, MessageSquare } from "lucide-react";
import { SupportModal } from "./SupportModal";

interface StatusData {
  wallets: number;
  alerts: number;
  lastScan: number | null;
}

function formatScanTime(timestamp: number | null): string {
  if (!timestamp) return "NEVER";
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "JUST NOW";
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

const NAV_ITEMS = [
  { label: "LDRBD", href: "/leaderboard", description: "Leaderboard" },
  { label: "WLLT", href: "/wallet", description: "Wallet" },
  { label: "ALRT", href: "/alerts", description: "Alerts" },
  { label: "MKTS", href: "/markets", description: "Markets" },
] as const;

const ONBOARDING_KEY = "insider-terminal-onboarding-v1";

function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick(): void {
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

interface TerminalShellProps {
  children: React.ReactNode;
}

export function TerminalShell({ children }: TerminalShellProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useLocalStorage(ONBOARDING_KEY, false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const { data: status } = useQuery<StatusData>({
    queryKey: ["status"],
    queryFn: async () => {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json() as Promise<StatusData>;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const showBoot = mounted && !dismissed;

  return (
    <>
      {showBoot && (
        <TerminalBoot onDismiss={() => setDismissed(true)} />
      )}

      <div className="h-screen w-screen grid grid-rows-[36px_1fr_28px_44px] md:grid-rows-[36px_1fr_28px] grid-cols-1 md:grid-cols-[200px_1fr] overflow-hidden">
        {/* Top bar */}
        <header className="col-span-full flex items-center justify-between px-4 border-b border-terminal-border bg-terminal-panel">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-terminal-green p-1 hover:bg-terminal-surface"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            <span className="text-terminal-green text-sm md:text-sm font-bold tracking-wider">
              INSIDER TERMINAL
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
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

        {/* Desktop Sidebar */}
        <nav className="hidden md:flex row-start-2 border-r border-terminal-border bg-terminal-panel flex-col pt-2">
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

          {/* Support button */}
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="mt-auto flex items-center gap-2 px-4 py-2 mb-2 text-xs uppercase tracking-wider text-terminal-dim hover:text-terminal-muted border-l-2 border-transparent transition-colors"
          >
            <MessageSquare size={12} />
            <span>Support</span>
          </button>
        </nav>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          >
            <nav
              className="absolute left-0 top-[36px] bottom-[72px] w-64 bg-terminal-panel border-r border-terminal-border flex flex-col pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider transition-colors ${
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

              {/* Support button */}
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  setSupportOpen(true);
                }}
                className="mt-auto flex items-center gap-2 px-4 py-3 mb-2 text-xs uppercase tracking-wider text-terminal-dim hover:text-terminal-muted border-l-2 border-transparent transition-colors"
              >
                <MessageSquare size={12} />
                <span>Support</span>
              </button>
            </nav>
          </div>
        )}

        {/* Content area */}
        <main className="row-start-2 col-start-1 md:col-start-2 overflow-auto bg-terminal-bg">
          {children}
        </main>

        {/* Status bar */}
        <footer className="col-span-full flex items-center px-4 text-[10px] text-terminal-dim border-t border-terminal-border bg-terminal-panel uppercase tracking-wider overflow-x-auto">
          <span className="whitespace-nowrap">Wallets: {status?.wallets ?? "---"}</span>
          <span className="mx-2 md:mx-3">|</span>
          <span className="whitespace-nowrap">Alerts: {status?.alerts ?? "---"}</span>
          <span className="mx-2 md:mx-3">|</span>
          <span className="whitespace-nowrap">Last Scan: {status ? formatScanTime(status.lastScan) : "---"}</span>
        </footer>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden col-span-full flex items-center justify-around border-t border-terminal-border bg-terminal-panel">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-3 text-[10px] uppercase tracking-wider transition-colors min-h-[44px] ${
                  isActive
                    ? "text-terminal-orange"
                    : "text-terminal-muted"
                }`}
              >
                <span className="font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
