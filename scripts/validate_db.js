/**
 * scripts/validate_db.js
 *
 * Validates the pricing database and produces a human-readable report.
 *
 * Checks:
 *  1. No orphaned zip_mappings (entity_id not in pricing_entities)
 *  2. No orphaned prefix_mappings
 *  3. No zero values where NULL would be more accurate (bls/als/mileage)
 *  4. All entities have required metadata (source_label, estimate_type)
 *  5. All statewide_average entities have notes
 *  6. Fallback chain coverage (what % of 3-digit prefixes have a mapping)
 *
 * Run: node scripts/validate_db.js
 * Output: data/validation_report.json  +  console summary
 */

const fs   = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const db = new Database(DB_PATH, { readonly: true });

const issues  = [];
const warn    = msg => { issues.push({ severity: 'warning', message: msg }); console.warn('  ⚠️ ', msg); };
const error   = msg => { issues.push({ severity: 'error',   message: msg }); console.error(' ❌ ', msg); };
const ok      = msg => console.log('  ✅ ', msg);

console.log('\n════════════════════════════════════════');
console.log('  Ambulance Cost DB Validation Report');
console.log('════════════════════════════════════════\n');

// 1. Orphaned zip_mappings
const orphanZips = db.prepare(`
  SELECT m.zip, m.entity_id
  FROM zip_mappings m
  LEFT JOIN pricing_entities e ON m.entity_id = e.id
  WHERE e.id IS NULL
`).all();
if (orphanZips.length) error(`${orphanZips.length} orphaned zip_mapping(s): ${orphanZips.map(r => r.zip).join(', ')}`);
else ok('No orphaned zip_mappings');

// 2. Orphaned prefix_mappings
const orphanPfx = db.prepare(`
  SELECT p.prefix, p.entity_id
  FROM prefix_mappings p
  LEFT JOIN pricing_entities e ON p.entity_id = e.id
  WHERE e.id IS NULL
`).all();
if (orphanPfx.length) error(`${orphanPfx.length} orphaned prefix_mapping(s): ${orphanPfx.map(r => r.prefix).join(', ')}`);
else ok('No orphaned prefix_mappings');

// 3. Zero values that should be NULL
const zeroBase = db.prepare(`
  SELECT id, display_name, bls_base, als_base, mileage
  FROM pricing_entities
  WHERE estimate_type = 'official'
    AND (bls_base = 0 OR als_base = 0 OR mileage = 0)
`).all();
if (zeroBase.length) {
  warn(`${zeroBase.length} official entity/ies have zero (not NULL) rates — consider setting to NULL if unknown:`);
  for (const e of zeroBase) warn(`   ${e.id}: BLS=${e.bls_base} ALS=${e.als_base} Mileage=${e.mileage}`);
} else ok('No suspicious zero-values in official entities');

// 4. Missing metadata
const noLabel = db.prepare(`SELECT id, display_name FROM pricing_entities WHERE source_label IS NULL`).all();
if (noLabel.length) warn(`${noLabel.length} entity/ies missing source_label: ${noLabel.map(e => e.id).join(', ')}`);
else ok('All entities have source_label');

const noType = db.prepare(`SELECT id, display_name FROM pricing_entities WHERE estimate_type IS NULL`).all();
if (noType.length) warn(`${noType.length} entity/ies missing estimate_type: ${noType.map(e => e.id).join(', ')}`);
else ok('All entities have estimate_type');

// 5. Statewide averages missing notes
const stateNoNotes = db.prepare(`
  SELECT id FROM pricing_entities WHERE estimate_type LIKE '%average%' AND notes IS NULL
`).all();
if (stateNoNotes.length) warn(`${stateNoNotes.length} average entity/ies missing notes: ${stateNoNotes.map(e => e.id).join(', ')}`);
else ok('All average entities have notes');

// 6. Coverage: what % of possible 3-digit prefixes have a mapping?
const totalPossible = 1000; // 000–999
const mappedPrefixes = db.prepare('SELECT COUNT(DISTINCT prefix) as c FROM prefix_mappings').get().c;
const pct = ((mappedPrefixes / totalPossible) * 100).toFixed(1);
ok(`Prefix coverage: ${mappedPrefixes} / ${totalPossible} (${pct}%)`);
if (mappedPrefixes < 200) warn('Low prefix coverage — consider running compute_averages.js');

// 7. Conflict detection
const conflictZips = db.prepare(`
  SELECT zip, COUNT(*) as count, GROUP_CONCAT(entity_id, ' | ') as entities
  FROM zip_mappings GROUP BY zip HAVING count > 1
`).all();
if (conflictZips.length) warn(`${conflictZips.length} ZIP(s) have multiple entity mappings (conflicts)`);
else ok('No ZIP mapping conflicts');

// 8. Summary stats
const counts = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM pricing_entities) as total_entities,
    (SELECT COUNT(*) FROM pricing_entities WHERE estimate_type = 'official') as official,
    (SELECT COUNT(*) FROM pricing_entities WHERE estimate_type = 'statewide_average') as state_avg,
    (SELECT COUNT(*) FROM pricing_entities WHERE estimate_type = 'national_average') as nat_avg,
    (SELECT COUNT(*) FROM zip_mappings) as zip_count,
    (SELECT COUNT(*) FROM prefix_mappings) as prefix_count
`).get();

const summary = {
  generated_at: new Date().toISOString(),
  stats: counts,
  prefix_coverage_pct: parseFloat(pct),
  issues,
  zero_base_entities: zeroBase,
  orphaned_zips: orphanZips,
  orphaned_prefixes: orphanPfx,
  zip_conflicts: conflictZips,
  missing_source_label: noLabel,
};

const reportPath = path.resolve(__dirname, '..', 'data', 'validation_report.json');
fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

console.log('\n────────────────────────────────────────');
console.log('Summary:');
console.log(`  Entities: ${counts.total_entities} (${counts.official} official, ${counts.state_avg} state avg, ${counts.nat_avg} national avg)`);
console.log(`  ZIP mappings: ${counts.zip_count}  |  Prefix mappings: ${counts.prefix_count}`);
console.log(`  Issues: ${issues.filter(i => i.severity === 'error').length} errors, ${issues.filter(i => i.severity === 'warning').length} warnings`);
console.log(`\nFull report written → data/validation_report.json`);
db.close();
