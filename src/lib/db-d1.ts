import { getRequestContext } from '@cloudflare/next-on-pages';
import { DatabaseProvider, InaccuracyReport } from './db';
import { CommunityRate } from '@/app/api/community/route';

export class D1DbProvider implements DatabaseProvider {
  private get db() {
    return (getRequestContext().env as any).DB;
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
    
    // Level 1: Direct Zip
    let mapped = await this.db.prepare(`
      SELECT e.* 
      FROM zip_mappings m
      JOIN pricing_entities e ON m.entity_id = e.id
      WHERE m.zip = ?
    `).bind(zip).first();

    // Level 2: Prefix
    if (!mapped) {
      mapped = await this.db.prepare(`
        SELECT e.* 
        FROM prefix_mappings p
        JOIN pricing_entities e ON p.entity_id = e.id
        WHERE p.prefix = ?
      `).bind(prefix).first();
    }

    if (mapped) {
      return {
        ...mapped,
        verified_tnt: mapped.tnt_fee > 0 ? {
          city: mapped.display_name,
          state: '',
          tnt_fee: mapped.tnt_fee,
          description: mapped.tnt_description,
          source_url: mapped.source_url,
          source_label: mapped.source_label,
          is_verified: 1,
          last_updated: mapped.last_verified || mapped.effective_date || mapped.last_updated
        } : null,
        verified_market: (mapped.bls_base > 0 || mapped.als_base > 0) ? {
          zip_prefix: prefix,
          city: mapped.display_name,
          bls_base: mapped.bls_base,
          als_base: mapped.als_base,
          mileage: mapped.mileage,
          source_url: mapped.source_url,
          source_label: mapped.source_label,
          verified_date: mapped.last_verified || mapped.effective_date || mapped.last_updated,
          estimate_type: mapped.estimate_type
        } : null
      };
    }
    return null;
  }
}
