/**
 * scripts/fix_entity_metadata.js
 *
 * Populates missing `state` and `estimate_type` columns on pricing_entities
 * by parsing state codes from entity IDs (e.g., "city_of_odessa_ems_tx" → "TX").
 *
 * Run: node scripts/fix_entity_metadata.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const db = new Database(DB_PATH);

const VALID_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
]);

console.log('--- Fixing entity metadata ---');

// Get all entities missing state
const entities = db.prepare(`
  SELECT id, display_name, estimate_type, state FROM pricing_entities
`).all();

const updateStmt = db.prepare(`
  UPDATE pricing_entities SET state = ?, estimate_type = ? WHERE id = ?
`);

let stateFixed = 0;
let typeFixed = 0;

const run = db.transaction(() => {
  for (const e of entities) {
    let state = e.state;
    let type = e.estimate_type;

    // Extract state from ID suffix (last 2 chars after underscore)
    if (!state || state === '') {
      const parts = e.id.split('_');
      const suffix = parts[parts.length - 1].toUpperCase();
      if (VALID_STATES.has(suffix)) {
        state = suffix;
        stateFixed++;
      }
    }

    // Set estimate_type for entities that are clearly provider data
    if (!type || type === '') {
      type = 'official';
      typeFixed++;
    }

    if (state !== e.state || type !== e.estimate_type) {
      updateStmt.run(state || null, type, e.id);
    }
  }
});

run();

console.log(`  State populated: ${stateFixed} entities`);
console.log(`  Type set to 'official': ${typeFixed} entities`);

// Verify
const byState = db.prepare(`
  SELECT state, COUNT(*) as c FROM pricing_entities
  WHERE state IS NOT NULL AND state <> ''
  GROUP BY state ORDER BY c DESC
`).all();
console.log(`\nEntities by state:`);
byState.forEach(r => console.log(`  ${r.state}: ${r.c}`));

const byType = db.prepare(`
  SELECT estimate_type, COUNT(*) as c FROM pricing_entities GROUP BY estimate_type
`).all();
console.log(`\nEntities by type:`);
byType.forEach(r => console.log(`  ${r.estimate_type || '(null)'}: ${r.c}`));

db.close();
console.log('\n--- fix_entity_metadata complete ---');
