const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const db = new Database(DB_PATH);

console.log('--- Starting Database Cleanup ---');

// 1. Remove "Official" and "Fire Department" from display names
const updateNameStmt = db.prepare(`
  UPDATE pricing_entities
  SET display_name = TRIM(REPLACE(REPLACE(display_name, ' Official', ''), ' Fire Department', ''))
  WHERE display_name LIKE '% Official' OR display_name LIKE '% Fire Department';
`);

const nameResult = updateNameStmt.run();
console.log(`Renamed Display Names: ${nameResult.changes} entities updated.`);

// 2. Resolve duplicates for San Francisco
// We have 'san_francisco_fire_dept' and 'san_francisco_market'.
// Let's keep 'san_francisco_ca' replacing both!
console.log('Merging San Francisco duplicates...');

// Check if 'san_francisco_ca' exists, if not create it based on 'san_francisco_fire_dept'
let sfEntity = db.prepare('SELECT * FROM pricing_entities WHERE id = ?').get('san_francisco_ca');

if (!sfEntity) {
  db.prepare(`
    INSERT INTO pricing_entities (id, display_name, bls_base, als_base, mileage, tnt_fee, tnt_description, source_url, last_updated, estimate_type, source_label, effective_date, last_verified, state, notes)
    SELECT 'san_francisco_ca', display_name, bls_base, als_base, mileage, tnt_fee, tnt_description, source_url, last_updated, estimate_type, source_label, effective_date, last_verified, 'CA', notes
    FROM pricing_entities
    WHERE id = 'san_francisco_fire_dept'
  `).run();
}

// Re-point zip and prefix mappings
const updateZips = db.prepare(`
  UPDATE zip_mappings
  SET entity_id = 'san_francisco_ca'
  WHERE entity_id IN ('san_francisco_fire_dept', 'san_francisco_market')
`);
const zipChanges = updateZips.run();
console.log(`Repointed ${zipChanges.changes} ZIP mappings to san_francisco_ca`);

const updatePrefixes = db.prepare(`
  UPDATE prefix_mappings
  SET entity_id = 'san_francisco_ca'
  WHERE entity_id IN ('san_francisco_fire_dept', 'san_francisco_market')
`);
const prefixChanges = updatePrefixes.run();
console.log(`Repointed ${prefixChanges.changes} prefix mappings to san_francisco_ca`);

// Drop the old ones
const deleteOld = db.prepare(`
  DELETE FROM pricing_entities
  WHERE id IN ('san_francisco_fire_dept', 'san_francisco_market')
`);
const delChanges = deleteOld.run();
console.log(`Deleted ${delChanges.changes} legacy SF entities.`);

console.log('--- Cleanup Complete ---');
db.close();
