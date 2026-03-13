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
    return this.db.prepare('SELECT * FROM zip_data WHERE zip = ?').get(zip);
  }

  async getAfsRates(contractor: string, locality: string) {
    return this.db.prepare(
      'SELECT hcpcs, gpci, urban_rate, rural_rate, super_rural_rate FROM afs_rates WHERE contractor = ? AND locality = ?'
    ).all(contractor, locality);
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
}
