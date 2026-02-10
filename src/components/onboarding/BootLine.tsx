"use client";

import { useState, useEffect } from "react";

interface BootLineProps {
  text: string;
  className?: string;
  typewriter?: boolean;
  typewriterSpeed?: number;
}

export function BootLine({
  text,
  className = "text-terminal-text",
  typewriter,
  typewriterSpeed = 25,
}: BootLineProps) {
  const [displayedChars, setDisplayedChars] = useState(
    typewriter ? 0 : text.length
  );

  useEffect(() => {
    if (!typewriter || displayedChars >= text.length) return;
    const timer = setTimeout(
      () => setDisplayedChars((c) => c + 1),
      typewriterSpeed
    );
    return () => clearTimeout(timer);
  }, [typewriter, displayedChars, text.length, typewriterSpeed]);

  if (!text) {
    return <div className="h-3" />;
  }

  const isTyping = typewriter && displayedChars < text.length;

  return (
    <div className={`text-xs whitespace-pre animate-fade-in-line ${className}`}>
      {typewriter ? text.slice(0, displayedChars) : text}
      {isTyping && (
        <span className="animate-blink text-terminal-green">_</span>
      )}
    </div>
  );
}
