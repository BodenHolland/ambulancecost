const { getDb } = require('./src/lib/db');

async function test() {
  process.env.NEXT_RUNTIME = 'nodejs';
  try {
    const db = await getDb();
    console.log('Fetching zip data for 94010...');
    const zipRow = await db.getZipData('94010');
    console.log('Zip Row:', zipRow);
    const unified = await db.getUnifiedPricing('94010');
    console.log('Unified Pricing:', unified);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
