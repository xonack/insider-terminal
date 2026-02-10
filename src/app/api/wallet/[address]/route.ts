import { NextRequest, NextResponse } from 'next/server';
import { getWallet, getTradesForWallet, getAlertsForWallet } from '@/lib/db/queries';
import { scoreWallet } from '@/lib/scoring/engine';
import { CACHE_TTL, SCORE_BANDS } from '@/lib/utils/constants';

export const runtime = 'nodejs';

function getScoreBand(score: number) {
  for (const band of Object.values(SCORE_BANDS)) {
    if (score >= band.min && score <= band.max) {
      return band;
    }
  }
  return SCORE_BANDS.CLEAN;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!address || typeof address !== 'string') {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  // Normalize address to lowercase
  const normalizedAddress = address.toLowerCase();

  try {
    // 1. Check DB cache
    const force = _request.nextUrl.searchParams.get('force') === 'true';
    const cached = await getWallet(normalizedAddress);
    const now = Math.floor(Date.now() / 1000);

    if (!force && cached && now - cached.scored_at < CACHE_TTL.walletScore) {
      const trades = await getTradesForWallet(normalizedAddress, 50);
      const alerts = await getAlertsForWallet(normalizedAddress);
      const band = getScoreBand(cached.total_score);

      return NextResponse.json({
        address: normalizedAddress,
        totalScore: cached.total_score,
        band,
        signals: {
          walletAge: cached.signal_wallet_age,
          firstBetSize: cached.signal_first_bet,
          betTiming: cached.signal_bet_timing,
          withdrawalSpeed: cached.signal_withdrawal_speed,
          marketSelection: cached.signal_market_selection,
          winRate: cached.signal_win_rate,
          noHedging: cached.signal_no_hedging,
        },
        metadata: {
          totalVolume: cached.total_volume,
          totalPnl: cached.total_pnl,
          tradeCount: cached.trade_count,
          firstTradeAt: cached.first_trade_at,
          lastTradeAt: cached.last_trade_at,
        },
        username: cached.username,
        profileImage: cached.profile_image,
        trades,
        alerts,
        cachedAt: cached.scored_at,
        fresh: false,
      });
    }

    // 2. Score the wallet
    const result = await scoreWallet(normalizedAddress);
    const trades = await getTradesForWallet(normalizedAddress, 50);
    const alerts = await getAlertsForWallet(normalizedAddress);
    const band = getScoreBand(result.totalScore);
    const wallet = await getWallet(normalizedAddress);

    return NextResponse.json({
      address: normalizedAddress,
      totalScore: result.totalScore,
      band,
      signals: result.signals,
      metadata: result.metadata,
      username: wallet?.username ?? null,
      profileImage: wallet?.profile_image ?? null,
      trades,
      alerts,
      cachedAt: Math.floor(Date.now() / 1000),
      fresh: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[wallet/${normalizedAddress}] Scoring failed:`, message);

    return NextResponse.json(
      { error: 'Failed to score wallet', details: message },
      { status: 500 },
    );
  }
}
