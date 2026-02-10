import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, getAlertCount, getWallet } from '@/lib/db/queries';
import type { AlertRow } from '@/lib/db/queries';

export const runtime = 'nodejs';

interface AlertWithUsername extends AlertRow {
  username: string | null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 1), 500);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);
  const type = searchParams.get('type') ?? undefined;

  try {
    const alerts = await getAlerts(limit, offset, type);
    const total = await getAlertCount();

    // Join wallet username for display
    const alertsWithUsername: AlertWithUsername[] = await Promise.all(
      alerts.map(async (alert) => {
        const wallet = await getWallet(alert.wallet_address);
        return {
          ...alert,
          username: wallet?.username ?? null,
        };
      }),
    );

    return NextResponse.json({
      alerts: alertsWithUsername,
      total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/alerts] Failed:', message);

    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: message },
      { status: 500 },
    );
  }
}
