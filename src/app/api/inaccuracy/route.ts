import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-edge';
import type { InaccuracyReport } from '@/lib/db';

export const runtime = 'edge';

export async function GET() {
  try {
    const db = await getDb();
    const records = await db.getInaccuracyReports();
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { city } = await req.json();
    const db = await getDb();
    
    const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const newReport: InaccuracyReport = {
      city: city.toLowerCase().trim(),
      reportedAt: formattedDate
    };

    await db.addInaccuracyReport(newReport);

    return NextResponse.json(newReport);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
