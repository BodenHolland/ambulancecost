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

  // `EdgeRuntime` global is defined in Cloudflare Workers and Vercel Edge.
  // It is NOT defined in regular Node.js (local npm run dev).
  const isEdge = typeof (globalThis as any).EdgeRuntime === 'string';

  if (isEdge) {
    const { D1DbProvider } = await import('./db-d1');
    cachedDb = new D1DbProvider();
  } else {
    const { NodeDbProvider } = await import('./db-node');
    cachedDb = new NodeDbProvider();
  }

  return cachedDb!;
}

