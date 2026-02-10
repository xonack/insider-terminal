"use client";

import { useEffect, useState, useCallback } from "react";
import { useBootSequence } from "./useBootSequence";
import { BootLine } from "./BootLine";
import { BOOT_LINES } from "./boot-content";

interface TerminalBootProps {
  onDismiss: () => void;
}

export function TerminalBoot({ onDismiss }: TerminalBootProps) {
  const { visibleLines, isComplete } = useBootSequence(BOOT_LINES);
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = useCallback(() => {
    if (!isComplete || dismissing) return;
    setDismissing(true);
    setTimeout(onDismiss, 300);
  }, [isComplete, dismissing, onDismiss]);

  useEffect(() => {
    if (!isComplete) return;

    function handler(e: KeyboardEvent): void {
      e.preventDefault();
      handleDismiss();
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isComplete, handleDismiss]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-terminal-bg boot-scanlines overflow-auto ${
        dismissing ? "animate-boot-dismiss" : ""
      }`}
    >
      <div className="max-w-[700px] px-8 py-8">
        {visibleLines.map((line, i) => (
          <BootLine
            key={i}
            text={line.text}
            className={line.className}
            typewriter={line.typewriter}
            typewriterSpeed={line.typewriterSpeed}
          />
        ))}

        {isComplete && (
          <div className="mt-6 animate-fade-in-line">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold border border-terminal-green text-terminal-green hover:bg-terminal-green/10 transition-colors cursor-pointer"
              >
                Enter Terminal
              </button>
              <span className="animate-blink text-terminal-green text-xs">
                _
              </span>
            </div>
            <p className="mt-3 text-[10px] text-terminal-dim tracking-wider">
              Press any key to continue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
