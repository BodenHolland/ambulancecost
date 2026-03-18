const { getDb } = require('./src/lib/db');

async function test() {
  process.env.NEXT_RUNTIME = 'nodejs';
  try {
    console.log('--- Debugging API Logic ---');
    const db = await getDb();
    const zip = '94010';
    
    console.log(`1. Testing getZipData(${zip})...`);
    const zipRow = await db.getZipData(zip);
    console.log('   Result:', zipRow);

    console.log(`2. Testing getUnifiedPricing(${zip})...`);
    const unified = await db.getUnifiedPricing(zip);
    console.log('   Result:', unified);

    console.log('3. Simulating API Fallback logic...');
    let cityName = zipRow?.city ?? null;
    if (zipRow) {
       console.log('   ZipRow exists, checking rates...');
       const afsRows = await db.getAfsRates(zipRow.contractor, zipRow.locality);
       console.log('   AfsRows count:', afsRows.length);
    } else {
       console.log('   ZipRow is null, entering fallback...');
       // city resolution is async fetch, skipping here
       cityName = "Burlingame"; 
       console.log('   City resolved as:', cityName);
    }
    
    console.log('--- Debug Complete (No crash found in core logic) ---');
  } catch (err) {
    console.error('--- CRASH DETECTED ---');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    console.error('Stack Trace:', err.stack);
  }
}

test();
