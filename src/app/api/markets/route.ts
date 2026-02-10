import { NextResponse } from 'next/server';
import { getActiveMarkets } from '@/lib/polymarket/gamma';
import { ensureDb } from '@/lib/db/index';

export const runtime = 'nodejs';

interface MarketWithInsiderActivity {
  conditionId: string;
  title: string;
  slug: string;
  endDate: string;
  volume: number;
  active: boolean;
  insiderCount: number;
  insiderAddresses: string[];
}

export async function GET() {
  try {
    // 1. Fetch active markets from Gamma API
    const markets = await getActiveMarkets({ limit: 100, closed: false });

    // 2. Filter to markets resolving within 48 hours
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const soonResolving = markets.filter((m) => {
      if (!m.endDate) return false;
      const endMs = new Date(m.endDate).getTime();
      return endMs > now && endMs - now <= fortyEightHours;
    });

    // 3. Check trades table for suspicious wallet activity on these markets
    const db = await ensureDb();

    const result: MarketWithInsiderActivity[] = await Promise.all(
      soonResolving.map(async (m) => {
        const queryResult = await db.execute({
          sql: `
            SELECT DISTINCT t.wallet_address
            FROM trades t
            INNER JOIN wallets w ON w.address = t.wallet_address
            WHERE t.condition_id = ?
              AND w.total_score > 60
          `,
          args: [m.conditionId],
        });
        const rows = queryResult.rows as unknown as Array<{ wallet_address: string }>;
        return {
          conditionId: m.conditionId,
          title: m.title,
          slug: m.slug,
          endDate: m.endDate,
          volume: m.volumeNum,
          active: m.active,
          insiderCount: rows.length,
          insiderAddresses: rows.map((r) => r.wallet_address),
        };
      }),
    );

    return NextResponse.json({
      markets: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/markets] Failed:', message);

    return NextResponse.json(
      { error: 'Failed to fetch markets', details: message },
      { status: 500 },
    );
  }
}
