import { NextRequest, NextResponse } from 'next/server';
import {
  getLeaderboard,
  getWalletCount,
  getStaleWallets,
} from '@/lib/db/queries';
import { CACHE_TTL } from '@/lib/utils/constants';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);
  const minScore = Math.max(parseInt(searchParams.get('minScore') ?? '0', 10) || 0, 0);

  try {
    const wallets = await getLeaderboard(limit, offset, minScore > 0 ? minScore : undefined);
    const total = await getWalletCount();

    // Check if data is stale (any wallet scored more than walletScore TTL ago)
    const staleWallets = await getStaleWallets(CACHE_TTL.walletScore, 1);
    const hasStaleData = total === 0 || staleWallets.length > 0;

    return NextResponse.json({
      wallets,
      total,
      hasStaleData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/leaderboard] Failed:', message);

    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', details: message },
      { status: 500 },
    );
  }
}
