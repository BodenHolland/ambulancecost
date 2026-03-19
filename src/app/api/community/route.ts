import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-edge';

export const runtime = 'edge';

export interface CommunityRate {
  city: string;
  state: string;
  tntFee: number;
  reportedAt: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const records = await db.getCommunityRates();
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const newRate = await req.json();
    const db = await getDb();
    
    // Add reportedAt date
    const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Format incoming
    const updatedRate: CommunityRate = {
      ...newRate,
      city: newRate.city.toLowerCase().trim(),
      state: newRate.state.toUpperCase().trim(),
      tntFee: Number(newRate.tntFee),
      reportedAt: formattedDate
    };

    await db.addCommunityRate(updatedRate);

    return NextResponse.json(updatedRate);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
