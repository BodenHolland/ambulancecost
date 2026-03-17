import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DatabaseProvider, InaccuracyReport } from './db';
import { CommunityRate } from '@/app/api/community/route';

export class NodeDbProvider implements DatabaseProvider {
  private db: any;
  private communityPath: string;
  private inaccuracyPath: string;

  constructor() {
    const dbPath = path.resolve(process.cwd(), 'zip_lookup.db');
    this.db = new Database(dbPath);
    this.communityPath = path.resolve(process.cwd(), 'data/communityRates.json');
    this.inaccuracyPath = path.resolve(process.cwd(), 'data/inaccuracies.json');
  }

  async getZipData(zip: string) {
    try {
      return this.db.prepare('SELECT * FROM zip_data WHERE zip = ?').get(zip);
    } catch (e) {
      console.warn('zip_data table not found, falling back to unified pricing.');
      return null;
    }
  }

  async getAfsRates(contractor: string, locality: string) {
    try {
      return this.db.prepare(
        'SELECT hcpcs, gpci, urban_rate, rural_rate, super_rural_rate FROM afs_rates WHERE contractor = ? AND locality = ?'
      ).all(contractor, locality);
    } catch (e) {
      console.warn('afs_rates table not found.');
      return [];
    }
  }

  async getCommunityRates(): Promise<CommunityRate[]> {
    if (!fs.existsSync(this.communityPath)) return [];
    const data = fs.readFileSync(this.communityPath, 'utf-8');
    return JSON.parse(data);
  }

  async addCommunityRate(rate: CommunityRate): Promise<void> {
    const records = await this.getCommunityRates();
    const updated = records.filter(r => r.city.toLowerCase() !== rate.city.toLowerCase());
    updated.push(rate);
    fs.writeFileSync(this.communityPath, JSON.stringify(updated, null, 2));
  }

  async getInaccuracyReports(): Promise<InaccuracyReport[]> {
    if (!fs.existsSync(this.inaccuracyPath)) return [];
    const data = fs.readFileSync(this.inaccuracyPath, 'utf-8');
    return JSON.parse(data);
  }

  async addInaccuracyReport(report: InaccuracyReport): Promise<void> {
    const records = await this.getInaccuracyReports();
    if (!records.find(r => r.city === report.city)) {
      records.push(report);
      fs.writeFileSync(this.inaccuracyPath, JSON.stringify(records, null, 2));
    }
  }

  async getUnifiedPricing(zip: string) {
    const prefix = zip.substring(0, 3);
    
    // Level 1: Check for Direct Zip Mapping
    let mapped = this.db.prepare(`
      SELECT e.* 
      FROM zip_mappings m
      JOIN pricing_entities e ON m.entity_id = e.id
      WHERE m.zip = ?
    `).get(zip);

    // Level 2: Check for Regional Prefix Mapping
    if (!mapped) {
      mapped = this.db.prepare(`
        SELECT e.* 
        FROM prefix_mappings p
        JOIN pricing_entities e ON p.entity_id = e.id
        WHERE p.prefix = ?
      `).get(prefix);
    }

    if (mapped) {
      // Return in a structure consistent with expected API outputs
      return {
        ...mapped,
        tnt_fee: mapped.tnt_fee ?? 0,
        // Map fields to what the frontend expects for simplified compatibility
        verified_tnt: mapped.tnt_fee > 0 ? {
          city: mapped.display_name,
          state: '', // Not strictly tracked in entities yet, empty safe
          zip: zip,
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
