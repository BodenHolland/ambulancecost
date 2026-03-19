/**
 * scripts/fix_zero_values.js
 *
 * Sets zero-value BLS, ALS, and mileage rates to NULL so the fallback chain
 * properly skips entities with unknown rates instead of returning $0 estimates.
 *
 * Run: node scripts/fix_zero_values.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const db = new Database(DB_PATH);

console.log('--- Fixing zero-value rates in pricing_entities ---');

// Fix bls_base = 0 → NULL (0 means "unknown", not "free")
const blsResult = db.prepare(`
  UPDATE pricing_entities SET bls_base = NULL WHERE bls_base = 0
`).run();
console.log(`  BLS: ${blsResult.changes} rows updated (0 → NULL)`);

// Fix als_base = 0 → NULL
const alsResult = db.prepare(`
  UPDATE pricing_entities SET als_base = NULL WHERE als_base = 0
`).run();
console.log(`  ALS: ${alsResult.changes} rows updated (0 → NULL)`);

// Fix mileage = 0 → NULL
const miResult = db.prepare(`
  UPDATE pricing_entities SET mileage = NULL WHERE mileage = 0
`).run();
console.log(`  Mileage: ${miResult.changes} rows updated (0 → NULL)`);

// Verify results
const remaining = db.prepare(`
  SELECT id, display_name, bls_base, als_base, mileage
  FROM pricing_entities
  WHERE bls_base = 0 OR als_base = 0 OR mileage = 0
`).all();

if (remaining.length === 0) {
  console.log('\n✅ No more zero-value rates remain.');
} else {
  console.log(`\n⚠️  ${remaining.length} rows still have zero values:`);
  remaining.forEach(r => console.log(`  ${r.id}: BLS=${r.bls_base} ALS=${r.als_base} Mi=${r.mileage}`));
}

db.close();
console.log('--- fix_zero_values complete ---');
