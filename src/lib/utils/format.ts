/**
 * Shared formatting utilities for the Insider Terminal UI.
 * All functions are pure and side-effect free.
 */

/** Format a number as USD with two decimal places: "$1,234.56" */
export function formatUsd(value: number): string {
  return "$" + value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a number in compact USD notation: "$1.2K", "$3.4M" */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

/** Convert a unix timestamp (seconds or ms) to a relative "time ago" string. */
export function timeAgo(timestamp: number): string {
  // Normalize to milliseconds
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const diff = Date.now() - ms;

  if (diff < 0) return "just now";

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Convert a unix timestamp (seconds or ms) to a relative "time until" string. */
export function timeUntil(timestamp: number): string {
  // Normalize to milliseconds
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const diff = ms - Date.now();

  if (diff <= 0) return "expired";

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `in ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h`;

  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

/** Truncate an address to "0x1234...5678" format. */
export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-Math.max(4, chars - 2))}`;
}
