import { createClient, type Client } from '@libsql/client';
import { initializeDatabase } from './schema';

let client: Client | null = null;
let initialized = false;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error('TURSO_DATABASE_URL is required');
    client = createClient({ url, authToken });
  }
  return client;
}

export async function ensureDb(): Promise<Client> {
  const db = getDb();
  if (!initialized) {
    await initializeDatabase(db);
    initialized = true;
  }
  return db;
}
