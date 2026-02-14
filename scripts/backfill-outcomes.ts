/**
 * One-time backfill: re-fetch market metadata from Gamma API for all cached markets
 * that are missing outcome data. Updates resolved_at and outcome fields.
 *
 * Usage: npx tsx --env-file=.env.local scripts/backfill-outcomes.ts
 */
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? '',
  authToken: process.env.TURSO_AUTH_TOKEN ?? '',
});

const GAMMA_API = 'https://gamma-api.polymarket.com';
const BATCH_SIZE = 5;
const DELAY_MS = 200;

interface GammaMarket {
  closed: boolean;
  outcomes: string;      // JSON string: '["Yes","No"]'
  outcomePrices: string;  // JSON string: '["1","0"]'
  resolution: string;
  closedTime: string;
  updatedAt: string;
}

function deriveOutcome(market: GammaMarket): string | null {
  if (!market.closed) return null;
  try {
    const outcomes: string[] = JSON.parse(market.outcomes);
    const prices: string[] = JSON.parse(market.outcomePrices);
    if (!Array.isArray(outcomes) || !Array.isArray(prices)) return null;
    const winnerIndex = prices.findIndex(p => p === '1');
    if (winnerIndex >= 0 && winnerIndex < outcomes.length) {
      return outcomes[winnerIndex];
    }
  } catch { /* malformed */ }
  return market.resolution || null;
}

function isoToUnix(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ts = Math.floor(new Date(iso).getTime() / 1000);
  return Number.isNaN(ts) ? null : ts;
}

async function fetchMarket(slug: string): Promise<GammaMarket | null> {
  try {
    const res = await fetch(`${GAMMA_API}/markets?slug=${encodeURIComponent(slug)}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json() as GammaMarket[];
    return data[0] ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const result = await client.execute(
    `SELECT condition_id, slug FROM markets WHERE outcome IS NULL`
  );
  console.log(`Found ${result.rows.length} markets without outcomes`);

  let updated = 0;
  let resolved = 0;
  let errors = 0;

  for (let i = 0; i < result.rows.length; i += BATCH_SIZE) {
    const batch = result.rows.slice(i, i + BATCH_SIZE);

    const fetches = await Promise.allSettled(
      batch.map(row => fetchMarket(row.slug as string))
    );

    for (let j = 0; j < fetches.length; j++) {
      const r = fetches[j];
      if (r.status !== 'fulfilled' || !r.value) {
        errors++;
        continue;
      }

      const market = r.value;
      const outcome = deriveOutcome(market);
      const resolvedAt = market.closed ? isoToUnix(market.closedTime ?? market.updatedAt) : null;

      if (outcome || resolvedAt) {
        await client.execute({
          sql: `UPDATE markets SET outcome = ?, resolved_at = ?, cached_at = unixepoch() WHERE condition_id = ?`,
          args: [outcome, resolvedAt, batch[j].condition_id],
        });
        updated++;
        if (outcome) resolved++;
      }
    }

    if (i % 100 === 0 && i > 0) {
      console.log(`  Processed ${i}/${result.rows.length} — ${resolved} resolved, ${errors} errors`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDone: ${updated} markets updated, ${resolved} with outcomes, ${errors} fetch errors`);

  const check = await client.execute(
    `SELECT
       CASE WHEN outcome IS NOT NULL THEN 'has_outcome' ELSE 'no_outcome' END as status,
       COUNT(*) as count
     FROM markets GROUP BY status`
  );
  console.log('\nFinal market status:');
  for (const r of check.rows) {
    console.log(`  ${r.status}: ${r.count}`);
  }
}

main().catch(console.error);
