"use client";

import { useState, useEffect } from "react";
import type { BootLineData } from "./boot-content";

interface BootSequenceResult {
  visibleLines: BootLineData[];
  isComplete: boolean;
}

export function useBootSequence(lines: BootLineData[]): BootSequenceResult {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= lines.length) return;

    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, lines[visibleCount].delay);

    return () => clearTimeout(timer);
  }, [visibleCount, lines]);

  return {
    visibleLines: lines.slice(0, visibleCount),
    isComplete: visibleCount >= lines.length,
  };
}
