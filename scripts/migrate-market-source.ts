/**
 * Migration: Add market_source column to existing tables.
 * Run with: npx tsx scripts/migrate-market-source.ts
 */
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually (no dotenv dependency)
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  process.env[key] = val;
}

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL is required');

  const db = createClient({ url, authToken });

  const migrations = [
    // Add market_source to wallets (if not exists)
    `ALTER TABLE wallets ADD COLUMN market_source TEXT NOT NULL DEFAULT 'polymarket'`,
    // Add market_source to trades (if not exists)
    `ALTER TABLE trades ADD COLUMN market_source TEXT NOT NULL DEFAULT 'polymarket'`,
    // Add market_source to markets (if not exists)
    `ALTER TABLE markets ADD COLUMN market_source TEXT NOT NULL DEFAULT 'polymarket'`,
    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_wallets_source ON wallets(market_source, total_score DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_trades_source ON trades(market_source, wallet_address)`,
  ];

  for (const sql of migrations) {
    try {
      await db.execute(sql);
      console.log(`✓ ${sql.slice(0, 80)}...`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // "duplicate column" means it already exists — skip gracefully
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        console.log(`⊘ Already exists: ${sql.slice(0, 60)}...`);
      } else {
        console.error(`✗ FAILED: ${sql.slice(0, 60)}...`);
        console.error(`  Error: ${msg}`);
      }
    }
  }

  // Verify
  const result = await db.execute(`PRAGMA table_info(wallets)`);
  const cols = result.rows.map((r) => r.name);
  console.log(`\nwallets columns: ${cols.join(', ')}`);

  const tradesInfo = await db.execute(`PRAGMA table_info(trades)`);
  const tradeCols = tradesInfo.rows.map((r) => r.name);
  console.log(`trades columns: ${tradeCols.join(', ')}`);

  const marketsInfo = await db.execute(`PRAGMA table_info(markets)`);
  const marketCols = marketsInfo.rows.map((r) => r.name);
  console.log(`markets columns: ${marketCols.join(', ')}`);

  console.log('\nMigration complete.');
}

migrate().catch(console.error);
