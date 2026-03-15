const { NodeDbProvider } = require('./src/lib/db-node');
const path = require('path');

async function test() {
  try {
    const db = new NodeDbProvider();
    const zip = '94143';
    console.log(`--- Testing Lookup for ${zip} ---`);
    
    const zipRow = await db.getZipData(zip);
    console.log('ZipRow found:', !!zipRow);
    
    if (zipRow) {
      const unified = await db.getUnifiedPricing(zip);
      console.log('Unified Result Found:', !!unified);
      
      const responseBody = {
        zip,
        city: 'San Francisco', // simplified for test
        verified_tnt: unified?.verified_tnt || null,
        verified_market: unified?.verified_market || null,
        entity_info: unified ? { id: unified.id, name: unified.display_name } : null,
      };
      
      console.log('Final Response Body Structure OK');
      console.log(JSON.stringify(responseBody, null, 2));
    }
    
  } catch (err) {
    console.error('CRASHED:', err.message);
    console.error(err.stack);
  }
}

test();
