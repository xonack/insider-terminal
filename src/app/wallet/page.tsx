"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";

export default function WalletPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = address.trim();
      if (trimmed.length > 0) {
        router.push(`/wallet/${encodeURIComponent(trimmed)}`);
      }
    },
    [address, router]
  );

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-xl">
        <label className="block text-[10px] text-terminal-dim uppercase tracking-[0.2em] mb-3 text-center">
          Enter Wallet Address
        </label>
        <form onSubmit={handleSubmit}>
          <div className="relative bg-terminal-panel border border-terminal-border p-4">
            <div className="flex items-center gap-2">
              <span className="text-terminal-green text-sm shrink-0">
                {">"}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                spellCheck={false}
                autoComplete="off"
                className="flex-1 bg-transparent text-terminal-green text-sm outline-none placeholder-terminal-dim/50 caret-terminal-green font-mono"
              />
              {address.length === 0 && (
                <span className="animate-pulse text-terminal-green text-sm">
                  _
                </span>
              )}
            </div>
          </div>
        </form>
        <p className="text-[10px] text-terminal-dim mt-2 text-center uppercase tracking-wider">
          Press Enter to analyze
        </p>
      </div>
    </div>
  );
}
