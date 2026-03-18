/**
 * scripts/cleanup_data.js — one-off cleanup
 * Run: node scripts/cleanup_data.js
 */
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.resolve(__dirname, '..', 'zip_lookup.db'));

// 1. Set ALS=NULL for providers where ALS was stored as 0 (not separately billed)
const r1 = db.prepare(`
  UPDATE pricing_entities SET als_base = NULL
  WHERE estimate_type = 'official' AND als_base = 0
    AND id NOT IN ('san_francisco_fire_dept', 'san_francisco_market')
`).run();
console.log(`Nulled ALS=0 on ${r1.changes} entities.`);

// 2. Patch missing source_labels
const patches = [
  { id: 'bryanbrazoschi_st_joseph_regional_health_ems_market', source_label: 'Texas Open Data Emergency Services Billing Rates', state: 'TX', estimate_type: 'official' },
  { id: 'san_francisco_market', source_label: 'San Francisco Fire Department Official Ambulance Rate Schedule', state: 'CA', estimate_type: 'official' },
  { id: 'new_york_tnt', source_label: 'New York City Fire Department (FDNY) EMS Fee Schedule', state: 'NY', estimate_type: 'official' },
  { id: 'houston_tnt', source_label: 'City of Houston Emergency Medical Services Fee Schedule', state: 'TX', estimate_type: 'official' },
  { id: 'los_angeles_tnt', source_label: 'Los Angeles Fire Department EMS Rate Schedule', state: 'CA', estimate_type: 'official' },
  { id: 'chicago_tnt', source_label: 'Chicago Fire Department Ambulance Fee Schedule', state: 'IL', estimate_type: 'official' },
  { id: 'san_mateo_county', source_label: 'San Mateo County EMS Agency Rate Schedule', state: 'CA', estimate_type: 'official' },
];

const upd = db.prepare(`
  UPDATE pricing_entities
  SET source_label = @source_label, state = @state, estimate_type = @estimate_type
  WHERE id = @id
`);
let patched = 0;
for (const p of patches) { upd.run(p); patched++; }
console.log(`Patched ${patched} entities with source_label & state.`);

// 3. Check
const missing = db.prepare('SELECT COUNT(*) as c FROM pricing_entities WHERE source_label IS NULL').get();
const zeroAls = db.prepare('SELECT COUNT(*) as c FROM pricing_entities WHERE als_base = 0').get();
console.log('Entities still missing source_label:', missing.c);
console.log('Entities still with als_base=0:', zeroAls.c);

db.close();
console.log('--- cleanup_data complete ---');
