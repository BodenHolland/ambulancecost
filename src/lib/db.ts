import { getRequestContext } from '@cloudflare/next-on-pages';
import type { CommunityRate } from '@/app/api/community/route';

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
  cacheCity(zip: string, city: string): Promise<void>;
}

class D1DbProvider implements DatabaseProvider {
  private get db() {
    try {
      const ctx = getRequestContext();
      const db = (ctx.env as any).DB;
      if (!db) return null;
      return db;
    } catch (e) {
      return null;
    }
  }

  async getZipData(zip: string) {
    const db = this.db;
    if (!db) return null;
    try {
      return await db.prepare('SELECT * FROM zip_data WHERE zip = ?').bind(zip).first();
    } catch (e) {
      console.warn('D1 Query Error (getZipData):', e);
      return null;
    }
  }

  async getAfsRates(contractor: string, locality: string) {
    const db = this.db;
    if (!db) return [];
    try {
      const { results } = await db.prepare(
        'SELECT hcpcs, gpci, urban_rate, rural_rate, super_rural_rate FROM afs_rates WHERE contractor = ? AND locality = ?'
      ).bind(contractor, locality).all();
      return results;
    } catch (e) {
      console.warn('D1 Query Error (getAfsRates):', e);
      return [];
    }
  }

  async getCommunityRates(): Promise<CommunityRate[]> {
    const db = this.db;
    if (!db) return [];
    try {
      const { results } = await db.prepare('SELECT * FROM community_rates').all();
      return results as CommunityRate[];
    } catch (e) {
      return [];
    }
  }

  async addCommunityRate(rate: CommunityRate): Promise<void> {
    const db = this.db;
    if (!db) return;
    try {
      await db.prepare(
        'INSERT OR REPLACE INTO community_rates (city, state, tntFee, reportedAt) VALUES (?, ?, ?, ?)'
      ).bind(rate.city, rate.state, rate.tntFee, rate.reportedAt).run();
    } catch (e) {
      console.error('D1 Write Error (addCommunityRate):', e);
    }
  }

  async getInaccuracyReports(): Promise<InaccuracyReport[]> {
    const db = this.db;
    if (!db) return [];
    try {
      const { results } = await db.prepare('SELECT * FROM inaccuracy_reports').all();
      return results as InaccuracyReport[];
    } catch (e) {
      return [];
    }
  }

  async addInaccuracyReport(report: InaccuracyReport): Promise<void> {
    const db = this.db;
    if (!db) return;
    try {
      await db.prepare(
        'INSERT OR IGNORE INTO inaccuracy_reports (city, reportedAt) VALUES (?, ?)'
      ).bind(report.city, report.reportedAt).run();
    } catch (e) {
      console.error('D1 Write Error (addInaccuracyReport):', e);
    }
  }

  async cacheCity(zip: string, city: string): Promise<void> {
    const db = this.db;
    if (!db) return;
    try {
      await db.prepare(
        'UPDATE zip_data SET city = ? WHERE zip = ? AND (city IS NULL OR city = "")'
      ).bind(city, zip).run();
    } catch (e) {
      // Non-critical — silently ignore cache write failures
    }
  }

  async getUnifiedPricing(zip: string) {
    const db = this.db;
    if (!db) return null;
    const prefix = zip.substring(0, 3);
    let matchLevel: string | null = null;
    let mapped = null;

    try {
      // Level 1: Direct ZIP mapping
      mapped = await db.prepare(`
        SELECT e.* 
        FROM zip_mappings m
        JOIN pricing_entities e ON m.entity_id = e.id
        WHERE m.zip = ?
      `).bind(zip).first();
      if (mapped) matchLevel = 'zip';

      // Level 2: 3-digit prefix mapping
      if (!mapped) {
        mapped = await db.prepare(`
          SELECT e.* 
          FROM prefix_mappings p
          JOIN pricing_entities e ON p.entity_id = e.id
          WHERE p.prefix = ?
        `).bind(prefix).first();
        if (mapped) matchLevel = 'prefix';
      }

      // Level 3: Statewide average
      if (!mapped) {
        const zipRow = await db.prepare('SELECT state FROM zip_data WHERE zip = ?').bind(zip).first() as any;
        if (zipRow?.state) {
          mapped = await db.prepare(`
            SELECT * FROM pricing_entities
            WHERE estimate_type = 'statewide_average' AND state = ?
            LIMIT 1
          `).bind(zipRow.state).first();
          if (mapped) matchLevel = 'statewide_average';
        }
      }

      // Level 4: National average fallback
      if (!mapped) {
        mapped = await db.prepare(`
          SELECT * FROM pricing_entities WHERE estimate_type = 'national_average' LIMIT 1
        `).first();
        if (mapped) matchLevel = 'national_average';
      }
    } catch (e) {
      console.warn('D1 Query Error (getUnifiedPricing):', e);
    }

    if (mapped) {
      const blsBase = (mapped.bls_base as number) ?? null;
      const alsBase = (mapped.als_base as number) ?? null;
      const mileage = (mapped.mileage as number) ?? null;
      const tntFee  = Number(mapped.tnt_fee ?? 0);

      return {
        ...mapped,
        match_level: matchLevel,
        tnt_fee: tntFee,
        verified_tnt: tntFee > 0 ? {
          city: mapped.display_name,
          state: (mapped.state as string) ?? '',
          tnt_fee: tntFee,
          description: mapped.tnt_description,
          source_url: mapped.tnt_source_url || mapped.source_url,
          source_label: mapped.source_label,
          is_verified: matchLevel === 'zip' || matchLevel === 'prefix' ? 1 : 0,
          last_updated: mapped.last_verified || mapped.effective_date || mapped.last_updated,
        } : null,
        verified_market: (blsBase !== null || alsBase !== null || mileage !== null)
          && matchLevel !== 'statewide_average' && matchLevel !== 'national_average'
          ? {
          zip_prefix: prefix,
          city: mapped.display_name,
          bls_base: blsBase,
          als_base: alsBase,
          mileage,
          source_url: mapped.source_url,
          source_label: mapped.source_label,
          notes: mapped.notes,
          verified_date: mapped.last_verified || mapped.effective_date || mapped.last_updated,
          estimate_type: mapped.estimate_type,
          match_level: matchLevel,
          } : null,
      };
    }
    return null;
  }
}

class LocalDbProvider implements DatabaseProvider {
  // Simple in-memory fallback for local development
  async getZipData(zip: string) { return null; }
  async getAfsRates(contractor: string, locality: string) { return []; }
  async getCommunityRates() { return []; }
  async addCommunityRate() {}
  async getInaccuracyReports() { return []; }
  async addInaccuracyReport() {}
  async cacheCity() {}
  async getUnifiedPricing(zip: string) {
    // Return a basic "estimated" response for local dev
    return {
      id: 'local-dev',
      display_name: 'Local Dev (No DB)',
      estimate_type: 'local_fallback',
      match_level: 'national_average',
      tnt_fee: 450,
      tnt_description: 'Standard estimated fee (Local DB Disconnected)',
      source_label: 'Local Dev Mock',
      last_verified: '2026-04-07'
    };
  }
}

let cachedDb: DatabaseProvider | null = null;

export async function getDb(): Promise<DatabaseProvider> {
  if (cachedDb) return cachedDb;

  try {
    // Try to initialize D1
    const ctx = getRequestContext();
    if (ctx && (ctx.env as any).DB) {
      cachedDb = new D1DbProvider();
    } else {
      console.warn('DB binding not found. Falling back to LocalDbProvider.');
      cachedDb = new LocalDbProvider();
    }
  } catch (e) {
    console.warn('Error accessing Cloudflare context. Falling back to LocalDbProvider.');
    cachedDb = new LocalDbProvider();
  }
  
  return cachedDb;
}


