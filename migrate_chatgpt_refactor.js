const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'zip_lookup.db');
const db = new Database(dbPath);

console.log('--- Starting Migration for ChatGPT Refactor ---');

try {
  // 1. Add new columns one by one (SQLite doesn't support multiple ADD COLUMN in one statement)
  const columnsToAdd = [
    'estimate_type TEXT',
    'notes TEXT',
    'source_label TEXT',
    'effective_date TEXT',
    'last_verified TEXT'
  ];

  for (const col of columnsToAdd) {
    try {
      db.prepare(`ALTER TABLE pricing_entities ADD COLUMN ${col}`).run();
      console.log(`✅ Added column: ${col}`);
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`ℹ️ Column already exists: ${col}`);
      } else {
        throw err;
      }
    }
  }

  // 2. Convert 0 to NULL for numeric fields
  console.log('🔄 Converting 0 to NULL for numeric pricing fields...');
  const fields = ['bls_base', 'als_base', 'mileage', 'tnt_fee'];
  for (const field of fields) {
    const info = db.prepare(`UPDATE pricing_entities SET ${field} = NULL WHERE ${field} = 0`).run();
    console.log(`   - ${field}: ${info.changes} rows updated.`);
  }

  // 3. Move 'last_updated' data to 'last_verified' if it has data
  console.log('🔄 Backfilling last_verified from last_updated...');
  const backfill = db.prepare(`UPDATE pricing_entities SET last_verified = last_updated WHERE last_verified IS NULL AND last_updated IS NOT NULL`).run();
  console.log(`   - last_verified: ${backfill.changes} rows updated.`);

  // 4. Set default estimate_type to 'exact_zip' if it's currently NULL for existing entities
  // Note: Most of our existing data is prefix based, but let's leave it NULL for now 
  // or set as 'exact_zip' for SF, and 'prefix_average' for others.
  
  db.prepare(`UPDATE pricing_entities SET estimate_type = 'exact_zip' WHERE id = 'san_francisco_fire_dept'`).run();
  db.prepare(`UPDATE pricing_entities SET estimate_type = 'prefix_average' WHERE id LIKE '%_market' AND estimate_type IS NULL`).run();
  db.prepare(`UPDATE pricing_entities SET estimate_type = 'state_maximum' WHERE id LIKE '%_tnt' AND estimate_type IS NULL`).run();

  console.log('--- Migration Successful ---');
} catch (err) {
  console.error('❌ Migration FAILED:', err);
  process.exit(1);
} finally {
  db.close();
}
