import { NextRequest, NextResponse } from 'next/server';
import { getRecentTraders } from '@/lib/polymarket/data-api';
import { getWallet, getWalletCount } from '@/lib/db/queries';
import { scoreWallet } from '@/lib/scoring/engine';
import { CACHE_TTL } from '@/lib/utils/constants';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for cron

const MAX_WALLETS_PER_CRON = 25;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header on cron invocations)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const walletAddresses = await getRecentTraders(500);
    const now = Math.floor(Date.now() / 1000);
    let scanned = 0;
    let newAlerts = 0;
    const errors: string[] = [];

    for (const address of walletAddresses) {
      if (scanned >= MAX_WALLETS_PER_CRON) break;

      const existing = await getWallet(address);
      if (existing && now - existing.scored_at < CACHE_TTL.walletScore) {
        continue;
      }

      try {
        const result = await scoreWallet(address);
        scanned++;
        if (result.totalScore > 60) newAlerts++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown';
        errors.push(`${address.slice(0, 10)}…: ${msg}`);
      }
    }

    const total = await getWalletCount();

    console.log(`[cron] Scanned ${scanned} wallets, ${newAlerts} alerts, ${total} total`);

    return NextResponse.json({
      scanned,
      newAlerts,
      total,
      discovered: walletAddresses.length,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron] Failed:', message);
    return NextResponse.json({ error: 'Cron failed', details: message }, { status: 500 });
  }
}
