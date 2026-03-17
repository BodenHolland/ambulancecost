const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'zip_lookup.db');

function verify(zip) {
  const db = new Database(DB_PATH);
  const prefix = zip.substring(0, 3);

  console.log(`--- Verifying DB Mapping for ${zip} ---`);

  // 1. Direct Zip Mapping
  const direct = db.prepare(`
    SELECT e.display_name, e.bls_base, e.tnt_fee
    FROM zip_mappings m
    JOIN pricing_entities e ON m.entity_id = e.id
    WHERE m.zip = ?
  `).get(zip);

  if (direct) {
    console.log(`✅ Direct Mapping Found: ${direct.display_name}`);
    console.log(`   Base Rate: $${direct.bls_base}`);
    console.log(`   TNT Fee: $${direct.tnt_fee}`);
  } else {
    console.log(`❌ No Direct Mapping for ${zip}`);
  }

  // 2. Prefix Mapping
  const prefixMatch = db.prepare(`
    SELECT e.display_name, e.bls_base, e.tnt_fee
    FROM prefix_mappings p
    JOIN pricing_entities e ON p.entity_id = e.id
    WHERE p.prefix = ?
  `).get(prefix);

  if (prefixMatch) {
    console.log(`✅ Prefix Mapping Found (${prefix}): ${prefixMatch.display_name}`);
    console.log(`   Base Rate: $${prefixMatch.bls_base}`);
    console.log(`   TNT Fee: $${prefixMatch.tnt_fee}`);
  } else {
    console.log(`❌ No Prefix Mapping for ${prefix}`);
  }

  db.close();
}

const targetZip = process.argv[2] || '94110';
verify(targetZip);
