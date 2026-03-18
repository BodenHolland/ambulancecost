/**
 * scripts/update_mappings.js
 *
 * Ingests a CSV of providers (id, display_name, state, zip_list, prefix_list)
 * and upserts them into pricing_entities + zip_mappings / prefix_mappings.
 *
 * Also flags any ZIP that maps to MORE THAN ONE entity (conflict detection)
 * and writes a report to data/mapping_conflicts.json.
 *
 * Usage:
 *   node scripts/update_mappings.js --csv data/providers.csv
 *   node scripts/update_mappings.js --dry-run   (scan conflicts only)
 *
 * CSV format (header row required):
 *   id,display_name,state,bls_base,als_base,mileage,tnt_fee,source_url,zip_list,prefix_list
 *   (zip_list and prefix_list are pipe-separated, e.g. "94103|94107")
 */

const fs   = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const db = new Database(DB_PATH);

// Ensure columns
for (const sql of [
  "ALTER TABLE pricing_entities ADD COLUMN effective_date TEXT",
  "ALTER TABLE pricing_entities ADD COLUMN last_verified TEXT",
  "ALTER TABLE pricing_entities ADD COLUMN source_label TEXT",
  "ALTER TABLE pricing_entities ADD COLUMN notes TEXT",
  "ALTER TABLE pricing_entities ADD COLUMN estimate_type TEXT DEFAULT 'official'",
  "ALTER TABLE pricing_entities ADD COLUMN state TEXT",
]) { try { db.exec(sql); } catch (_) {} }

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const csvIdx = args.indexOf('--csv');
const csvPath = csvIdx !== -1 ? path.resolve(args[csvIdx + 1]) : null;
const today = new Date().toISOString().slice(0, 10);

// ── Conflict Detection ────────────────────────────────────────────────────────
console.log('Scanning for ZIP mapping conflicts...');
const conflictZips = db.prepare(`
  SELECT zip, COUNT(*) as count, GROUP_CONCAT(entity_id, ' | ') as entities
  FROM zip_mappings
  GROUP BY zip
  HAVING count > 1
`).all();

const conflictReport = {
  generated_at: new Date().toISOString(),
  zip_conflicts: conflictZips,
};

const reportPath = path.resolve(__dirname, '..', 'data', 'mapping_conflicts.json');
fs.writeFileSync(reportPath, JSON.stringify(conflictReport, null, 2));

if (conflictZips.length) {
  console.warn(`⚠️  ${conflictZips.length} ZIP(s) map to multiple entities — see data/mapping_conflicts.json`);
  // Add a note to each conflicted entity in the DB
  const flag = db.prepare(`
    UPDATE pricing_entities SET notes = COALESCE(notes || ' ', '') || '[CONFLICT: this entity shares one or more ZIPs with another provider — manual review required]'
    WHERE id IN (SELECT entity_id FROM zip_mappings WHERE zip = ?)
      AND notes NOT LIKE '%CONFLICT%'
  `);
  for (const row of conflictZips) flag.run(row.zip);
} else {
  console.log('  ✅ No ZIP mapping conflicts found.');
}

if (dryRun || !csvPath) {
  console.log(dryRun ? '\n-- Dry-run mode: no changes written. --' : '\nNo --csv provided; conflict scan only.');
  db.close();
  process.exit(0);
}

// ── CSV Ingestion ─────────────────────────────────────────────────────────────
if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV not found: ${csvPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(csvPath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
const headers = lines[0].split(',');
const idx = h => headers.indexOf(h);

const upsertEnt = db.prepare(`
  INSERT OR REPLACE INTO pricing_entities
    (id, display_name, bls_base, als_base, mileage, tnt_fee, source_url,
     last_updated, estimate_type, state, last_verified)
  VALUES
    (@id, @display_name, @bls_base, @als_base, @mileage, @tnt_fee, @source_url,
     @last_updated, 'official', @state, @last_verified)
`);
const upsertZip = db.prepare(`INSERT OR REPLACE INTO zip_mappings (zip, entity_id) VALUES (?, ?)`);
const upsertPfx = db.prepare(`INSERT OR REPLACE INTO prefix_mappings (prefix, entity_id) VALUES (?, ?)`);

const ingest = db.transaction(() => {
  let entities = 0, zips = 0, prefixes = 0;
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const get = h => (cols[idx(h)] ?? '').trim();

    const id = get('id');
    if (!id) continue;

    upsertEnt.run({
      id,
      display_name:  get('display_name'),
      bls_base:  parseFloat(get('bls_base'))  || null,
      als_base:  parseFloat(get('als_base'))  || null,
      mileage:   parseFloat(get('mileage'))   || null,
      tnt_fee:   parseFloat(get('tnt_fee'))   || null,
      source_url: get('source_url') || null,
      last_updated: today,
      last_verified: today,
      state: get('state') || null,
    });
    entities++;

    const zipList = get('zip_list').split('|').map(z => z.trim()).filter(Boolean);
    for (const zip of zipList) { upsertZip.run(zip, id); zips++; }

    const pfxList = get('prefix_list').split('|').map(p => p.trim()).filter(Boolean);
    for (const pfx of pfxList) { upsertPfx.run(pfx, id); prefixes++; }
  }
  return { entities, zips, prefixes };
});

const r = ingest();
console.log(`\n✅ Ingested ${r.entities} entities, ${r.zips} ZIP mappings, ${r.prefixes} prefix mappings.`);
db.close();
console.log('--- update_mappings complete ---');
