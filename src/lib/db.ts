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
}

class D1DbProvider implements DatabaseProvider {
  private get db() {
    // getRequestContext() gets the Cloudflare context. 
    // If next dev is run locally without Cloudflare bindings, env might be empty here.
    const ctx = getRequestContext();
    const db = ctx?.env && (ctx.env as any).DB;
    if (!db) {
      throw new Error(
        'D1 Database binding "DB" is not available.\n' +
        'In production, ensure it is added in the Cloudflare Dashboard.\n' +
        'In local development, ensure you are running via Wrangler or Cloudflare Next.js dev plugin.'
      );
    }
    return db;
  }

  async getZipData(zip: string) {
    return await this.db.prepare('SELECT * FROM zip_data WHERE zip = ?').bind(zip).first();
  }

  async getAfsRates(contractor: string, locality: string) {
    const { results } = await this.db.prepare(
      'SELECT hcpcs, gpci, urban_rate, rural_rate, super_rural_rate FROM afs_rates WHERE contractor = ? AND locality = ?'
    ).bind(contractor, locality).all();
    return results;
  }

  async getCommunityRates(): Promise<CommunityRate[]> {
    const { results } = await this.db.prepare('SELECT * FROM community_rates').all();
    return results as CommunityRate[];
  }

  async addCommunityRate(rate: CommunityRate): Promise<void> {
    await this.db.prepare(
      'INSERT OR REPLACE INTO community_rates (city, state, tntFee, reportedAt) VALUES (?, ?, ?, ?)'
    ).bind(rate.city, rate.state, rate.tntFee, rate.reportedAt).run();
  }

  async getInaccuracyReports(): Promise<InaccuracyReport[]> {
    const { results } = await this.db.prepare('SELECT * FROM inaccuracy_reports').all();
    return results as InaccuracyReport[];
  }

  async addInaccuracyReport(report: InaccuracyReport): Promise<void> {
    await this.db.prepare(
      'INSERT OR IGNORE INTO inaccuracy_reports (city, reportedAt) VALUES (?, ?)'
    ).bind(report.city, report.reportedAt).run();
  }

  async getUnifiedPricing(zip: string) {
    const prefix = zip.substring(0, 3);
    let matchLevel: string | null = null;

    // Level 1: Direct ZIP mapping
    let mapped = await this.db.prepare(`
      SELECT e.* 
      FROM zip_mappings m
      JOIN pricing_entities e ON m.entity_id = e.id
      WHERE m.zip = ?
    `).bind(zip).first();
    if (mapped) matchLevel = 'zip';

    // Level 2: 3-digit prefix mapping
    if (!mapped) {
      mapped = await this.db.prepare(`
        SELECT e.* 
        FROM prefix_mappings p
        JOIN pricing_entities e ON p.entity_id = e.id
        WHERE p.prefix = ?
      `).bind(prefix).first();
      if (mapped) matchLevel = 'prefix';
    }

    // Level 3: Statewide average
    if (!mapped) {
      const zipRow = await this.db.prepare('SELECT state FROM zip_data WHERE zip = ?').bind(zip).first();
      if (zipRow?.state) {
        mapped = await this.db.prepare(`
          SELECT * FROM pricing_entities
          WHERE estimate_type = 'statewide_average' AND state = ?
          LIMIT 1
        `).bind(zipRow.state).first();
        if (mapped) matchLevel = 'statewide_average';
      }
    }

    // Level 4: National average fallback
    if (!mapped) {
      mapped = await this.db.prepare(`
        SELECT * FROM pricing_entities WHERE estimate_type = 'national_average' LIMIT 1
      `).first();
      if (mapped) matchLevel = 'national_average';
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
          source_url: mapped.source_url,
          source_label: mapped.source_label,
          is_verified: matchLevel === 'zip' || matchLevel === 'prefix' ? 1 : 0,
          last_updated: mapped.last_verified || mapped.effective_date || mapped.last_updated,
        } : null,
        verified_market: (blsBase !== null || alsBase !== null || mileage !== null) ? {
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

let cachedDb: DatabaseProvider | null = null;

export async function getDb(): Promise<DatabaseProvider> {
  if (!cachedDb) cachedDb = new D1DbProvider();
  return cachedDb;
}
