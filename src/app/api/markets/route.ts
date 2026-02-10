import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db/index';
import { parseSource } from '@/lib/utils/constants';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const source = parseSource(request.nextUrl.searchParams.get('source'));

  try {
    const db = await ensureDb();
    const sourceFilter = source ? 'AND t.market_source = ?' : '';
    const sourceArgs = source ? [source] : [];

    // Get markets with the most trades from scored wallets, ranked by trade volume
    const result = await db.execute({
      sql: `
        SELECT
          t.condition_id,
          t.title,
          t.event_slug,
          t.market_source,
          COUNT(DISTINCT t.wallet_address) as trader_count,
          SUM(t.size * t.price) as total_volume,
          COUNT(*) as trade_count,
          GROUP_CONCAT(DISTINCT
            CASE WHEN w.total_score > 60 THEN t.wallet_address END
          ) as insider_addresses,
          SUM(CASE WHEN w.total_score > 60 THEN 1 ELSE 0 END) as insider_trade_count
        FROM trades t
        INNER JOIN wallets w ON w.address = t.wallet_address
        WHERE t.title IS NOT NULL ${sourceFilter}
        GROUP BY t.condition_id
        ORDER BY insider_trade_count DESC, total_volume DESC
        LIMIT 50
      `,
      args: [...sourceArgs],
    });

    const markets = result.rows.map((r) => {
      const insiderAddrs = r.insider_addresses
        ? String(r.insider_addresses).split(',').filter(Boolean)
        : [];
      return {
        conditionId: String(r.condition_id),
        title: String(r.title || 'Unknown Market'),
        slug: String(r.event_slug || ''),
        source: String(r.market_source || 'polymarket'),
        traderCount: Number(r.trader_count),
        totalVolume: Number(r.total_volume),
        tradeCount: Number(r.trade_count),
        insiderCount: insiderAddrs.length,
        insiderAddresses: insiderAddrs,
      };
    });

    return NextResponse.json({ markets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/markets] Failed:', message);

    return NextResponse.json(
      { error: 'Failed to fetch markets', details: message },
      { status: 500 },
    );
  }
}
