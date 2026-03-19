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

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeDbProvider } = await import('./db-node');
    cachedDb = new NodeDbProvider();
    return cachedDb;
  } else {
    const { D1DbProvider } = await import('./db-d1');
    cachedDb = new D1DbProvider();
    return cachedDb;
  }
}
