const { NodeDbProvider } = require('./src/lib/db-node');
const path = require('path');

async function test() {
  try {
    const db = new NodeDbProvider();
    const zip = '94143';
    console.log(`Testing lookup for zip: ${zip}`);
    
    const result = await db.getUnifiedPricing(zip);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    const zipData = await db.getZipData(zip);
    console.log('Zip Data:', JSON.stringify(zipData, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('FAILED:', error);
    process.exit(1);
  }
}

test();
