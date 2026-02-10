"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Category = "bug" | "feature";

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

export function SupportModal({ open, onClose }: SupportModalProps) {
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");

  if (!open) return null;

  function handleSubmit() {
    const subject = `[${category.toUpperCase()}] Insider Terminal Feedback`;
    const body = message.trim();
    if (!body) return;

    const mailto = `mailto:jens@vaut.xyz?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    setMessage("");
    onClose();
  }

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
            Support
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
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-terminal-dim text-[10px] uppercase tracking-wider block">
              Category
            </label>
            <div className="flex gap-2">
              {(["bug", "feature"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-wider border transition-colors ${
                    category === cat
                      ? "border-terminal-orange text-terminal-orange bg-terminal-surface"
                      : "border-terminal-border text-terminal-muted hover:text-terminal-text hover:border-terminal-muted"
                  }`}
                >
                  {cat === "bug" ? "Bug Report" : "Feature Request"}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-terminal-dim text-[10px] uppercase tracking-wider block">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                category === "bug"
                  ? "Describe the bug..."
                  : "Describe the feature..."
              }
              rows={5}
              className="w-full bg-terminal-bg border border-terminal-border text-terminal-text text-xs p-3 placeholder:text-terminal-dim/50 focus:outline-none focus:border-terminal-orange resize-none font-[family-name:var(--font-jetbrains-mono)]"
            />
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim()}
            className="w-full py-2 text-[11px] uppercase tracking-wider font-bold border border-terminal-orange text-terminal-orange hover:bg-terminal-orange/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Send Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
