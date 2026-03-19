/**
 * Edge-runtime database provider — ONLY for use in Cloudflare Pages API routes.
 * Never imports db-node.ts or any native Node.js modules.
 */
import type { DatabaseProvider } from './db';

let cachedDb: DatabaseProvider | null = null;

export async function getDb(): Promise<DatabaseProvider> {
  if (cachedDb) return cachedDb;
  const { D1DbProvider } = await import('./db-d1');
  cachedDb = new D1DbProvider();
  return cachedDb;
}
