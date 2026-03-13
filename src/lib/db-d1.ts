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
}
