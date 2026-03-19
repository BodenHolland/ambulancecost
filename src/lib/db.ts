import { CommunityRate } from '@/app/api/community/route';

export interface InaccuracyReport {
  city: string;
  reportedAt: string;
}

export interface DatabaseProvider {
  getZipData(zip: string): Promise<any>;
  getAfsRates(contractor: string, locality: string): Promise<any[]>;
  getCommunityRates(): Promise<CommunityRate[]>;
  addCommunityRate(rate: CommunityRate): Promise<void>;
  getInaccuracyReports(): Promise<InaccuracyReport[]>;
  addInaccuracyReport(report: InaccuracyReport): Promise<void>;
  getUnifiedPricing(zip: string): Promise<any>;
}

let cachedDb: DatabaseProvider | null = null;

export async function getDb(): Promise<DatabaseProvider> {
  if (cachedDb) return cachedDb;

  // Try Cloudflare D1 first (production edge runtime).
  // If getRequestContext() throws, we're in local dev — fall back to Node/SQLite.
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    getRequestContext(); // throws if not running on Cloudflare
    const { D1DbProvider } = await import('./db-d1');
    cachedDb = new D1DbProvider();
    return cachedDb;
  } catch {
    const { NodeDbProvider } = await import('./db-node');
    cachedDb = new NodeDbProvider();
    return cachedDb;
  }
}
