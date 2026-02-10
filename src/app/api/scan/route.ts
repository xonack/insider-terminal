import { NextResponse } from 'next/server';
import { getRecentTraders } from '@/lib/polymarket/data-api';
import { getWallet, getWalletCount } from '@/lib/db/queries';
import { scoreWallet } from '@/lib/scoring/engine';
import { CACHE_TTL } from '@/lib/utils/constants';

export const runtime = 'nodejs';

const MAX_WALLETS_PER_SCAN = 10;

export async function POST() {
  try {
    // 1. Discover active wallets from recent trades
    const walletAddresses = await getRecentTraders(500);

    const now = Math.floor(Date.now() / 1000);
    let scanned = 0;
    let newAlerts = 0;
    const errors: string[] = [];

    // 2. Filter to unscored or stale wallets, then score
    for (const address of walletAddresses) {
      if (scanned >= MAX_WALLETS_PER_SCAN) break;

      const existing = await getWallet(address);

      // Skip if recently scored
      if (existing && now - existing.scored_at < CACHE_TTL.walletScore) {
        continue;
      }

      // 3. Score the wallet
      try {
        const result = await scoreWallet(address);
        scanned++;

        if (result.totalScore > 60) {
          newAlerts++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown';
        errors.push(`${address.slice(0, 10)}…: ${msg}`);
      }
    }

    const total = await getWalletCount();

    return NextResponse.json({
      scanned,
      newAlerts,
      total,
      discovered: walletAddresses.length,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/scan] Failed:', message);

    return NextResponse.json(
      { error: 'Scan failed', details: message },
      { status: 500 },
    );
  }
}
