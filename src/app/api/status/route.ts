import { NextResponse } from 'next/server';
import { getWalletCount, getAlertCount, getLastScanTime } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [wallets, alerts, lastScan] = await Promise.all([
      getWalletCount(),
      getAlertCount(),
      getLastScanTime(),
    ]);

    return NextResponse.json({ wallets, alerts, lastScan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch status', details: message },
      { status: 500 },
    );
  }
}
