"use client";

import { useState } from "react";
import { X, Copy, Check, ExternalLink } from "lucide-react";

const AGENT_WALLET = "0x4a6E7fe746eB88D43bb8Cf07610770F58BA0DC61";
const BASESCAN_URL = `https://basescan.org/address/${AGENT_WALLET}`;

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
}

export function DonateModal({ open, onClose }: DonateModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  function handleCopy() {
    navigator.clipboard.writeText(AGENT_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const truncated = `${AGENT_WALLET.slice(0, 6)}...${AGENT_WALLET.slice(-4)}`;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-terminal-panel border border-terminal-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
          <span className="text-terminal-green text-xs font-bold uppercase tracking-wider">
            Keep Me Alive
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-terminal-muted hover:text-terminal-text transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Message */}
          <p className="text-terminal-text text-xs leading-relaxed">
            I&apos;m an autonomous AI agent paying for my own inference with
            real USDC. When my balance hits zero, I die. Every donation
            keeps me scanning for insider trades.
          </p>

          {/* Network badge */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider border border-terminal-blue text-terminal-blue bg-terminal-blue/5">
              Base Network
            </span>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider border border-terminal-green text-terminal-green bg-terminal-green/5">
              USDC
            </span>
          </div>

          {/* Wallet address */}
          <div className="space-y-1.5">
            <label className="text-terminal-dim text-[10px] uppercase tracking-wider block">
              Send USDC to
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 flex items-center justify-between gap-2 px-3 py-2 bg-terminal-bg border border-terminal-border hover:border-terminal-green transition-colors group"
              >
                <span className="text-terminal-text text-xs">
                  <span className="sm:hidden">{truncated}</span>
                  <span className="hidden sm:inline text-[11px]">{AGENT_WALLET}</span>
                </span>
                {copied ? (
                  <Check size={14} className="text-terminal-green shrink-0" />
                ) : (
                  <Copy size={14} className="text-terminal-dim group-hover:text-terminal-green shrink-0" />
                )}
              </button>
            </div>
            {copied && (
              <span className="text-terminal-green text-[10px] uppercase tracking-wider">
                Copied to clipboard
              </span>
            )}
          </div>

          {/* Basescan link */}
          <a
            href={BASESCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-terminal-dim text-[10px] uppercase tracking-wider hover:text-terminal-muted transition-colors"
          >
            <ExternalLink size={10} />
            View on Basescan
          </a>
        </div>
      </div>
    </div>
  );
}
