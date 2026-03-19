/**
 * scripts/generate_d1_patch.js
 *
 * Generates a SQL patch file that applies all fixes to the remote D1 database:
 * 1. Zero-value rates → NULL
 * 2. Entity metadata (state, estimate_type)
 * 3. Statewide + national average entities
 * 4. Prefix mappings for averages
 *
 * Run: node scripts/generate_d1_patch.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const db = new Database(DB_PATH);
const fs = require('fs');

const lines = [];

// 1. Fix zero-value rates
lines.push('-- Fix zero-value rates → NULL');
lines.push("UPDATE pricing_entities SET bls_base = NULL WHERE bls_base = 0;");
lines.push("UPDATE pricing_entities SET als_base = NULL WHERE als_base = 0;");
lines.push("UPDATE pricing_entities SET mileage = NULL WHERE mileage = 0;");
lines.push('');

// 2. Ensure metadata columns exist
lines.push('-- Ensure metadata columns (ignore errors if they already exist)');
for (const col of ['effective_date TEXT', 'last_verified TEXT', 'source_label TEXT', 'notes TEXT', "estimate_type TEXT DEFAULT 'official'", 'state TEXT']) {
  // D1 doesn't support IF NOT EXISTS for ALTER TABLE, so we skip this
  // These columns should already exist from migrate_v2
}

// 3. Fix entity metadata (state + estimate_type)
lines.push('-- Fix entity metadata');
const entities = db.prepare(`
  SELECT id, state, estimate_type FROM pricing_entities
  WHERE estimate_type IN ('official', 'prefix_average', 'exact_zip', 'state_maximum')
`).all();

const VALID_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
]);

for (const e of entities) {
  const parts = e.id.split('_');
  const suffix = parts[parts.length - 1].toUpperCase();
  if (VALID_STATES.has(suffix) && (!e.state || e.state === '')) {
    lines.push(`UPDATE pricing_entities SET state = '${suffix}', estimate_type = 'official' WHERE id = '${e.id.replace(/'/g, "''")}';`);
  }
}
lines.push('');

// 4. Upsert statewide + national average entities
lines.push('-- Upsert average entities');
const avgEntities = db.prepare(`
  SELECT * FROM pricing_entities
  WHERE estimate_type IN ('statewide_average', 'national_average')
`).all();

for (const e of avgEntities) {
  const vals = [
    `'${e.id}'`,
    `'${(e.display_name || '').replace(/'/g, "''")}'`,
    e.bls_base ?? 'NULL',
    e.als_base ?? 'NULL',
    e.mileage ?? 'NULL',
    e.tnt_fee ?? 0,
    e.tnt_description ? `'${e.tnt_description.replace(/'/g, "''")}'` : 'NULL',
    e.source_url ? `'${e.source_url.replace(/'/g, "''")}'` : 'NULL',
    e.last_updated ? `'${e.last_updated}'` : 'NULL',
    e.effective_date ? `'${e.effective_date}'` : 'NULL',
    e.last_verified ? `'${e.last_verified}'` : 'NULL',
    e.source_label ? `'${e.source_label.replace(/'/g, "''")}'` : 'NULL',
    e.notes ? `'${e.notes.replace(/'/g, "''")}'` : 'NULL',
    `'${e.estimate_type}'`,
    e.state ? `'${e.state}'` : 'NULL',
  ];
  lines.push(`INSERT OR REPLACE INTO pricing_entities (id, display_name, bls_base, als_base, mileage, tnt_fee, tnt_description, source_url, last_updated, effective_date, last_verified, source_label, notes, estimate_type, state) VALUES (${vals.join(', ')});`);
}
lines.push('');

// 5. Prefix mappings for averages
lines.push('-- Prefix mappings for state averages');
const prefixMappings = db.prepare(`
  SELECT pm.prefix, pm.entity_id FROM prefix_mappings pm
  JOIN pricing_entities pe ON pm.entity_id = pe.id
  WHERE pe.estimate_type IN ('statewide_average', 'national_average')
`).all();
for (const pm of prefixMappings) {
  lines.push(`INSERT OR IGNORE INTO prefix_mappings (prefix, entity_id) VALUES ('${pm.prefix}', '${pm.entity_id}');`);
}

const outPath = path.resolve(__dirname, '..', 'd1_patch.sql');
fs.writeFileSync(outPath, lines.join('\n'));
console.log(`✅ Patch written to ${outPath} (${lines.length} statements)`);

db.close();
