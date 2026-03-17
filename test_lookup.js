const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'zip_lookup.db');

async function test(zip) {
  try {
    const db = new Database(DB_PATH);
    console.log(`--- Testing Lookup for ${zip} ---`);
    
    const prefix = zip.substring(0, 3);
    
    // Level 1: Direct Mapping
    const direct = db.prepare(`
      SELECT e.* 
      FROM zip_mappings m
      JOIN pricing_entities e ON m.entity_id = e.id
      WHERE m.zip = ?
    `).get(zip);

    // Level 2: Prefix Mapping
    const prefixMatch = !direct ? db.prepare(`
      SELECT e.* 
      FROM prefix_mappings p
      JOIN pricing_entities e ON p.entity_id = e.id
      WHERE p.prefix = ?
    `).get(prefix) : null;

    const matched = direct || prefixMatch;

    if (matched) {
      const responseBody = {
        zip,
        city: matched.display_name,
        verified_tnt: matched.tnt_fee > 0 ? {
          tnt_fee: matched.tnt_fee,
          description: matched.tnt_description,
          source_url: matched.source_url
        } : null,
        verified_market: {
          bls_base: matched.bls_base,
          als_base: matched.als_base,
          mileage: matched.mileage,
          source_url: matched.source_url
        },
        entity_info: { id: matched.id, name: matched.display_name }
      };
      
      console.log('Result found in database:');
      console.log(JSON.stringify(responseBody, null, 2));
    } else {
      console.log('No mapping found in database for this zip or prefix.');
    }
    
    db.close();
  } catch (err) {
    console.error('CRASHED:', err.message);
  }
}

const arg = process.argv[2] || '94110';
test(arg);
