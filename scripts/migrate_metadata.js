/**
 * scripts/migrate_metadata.js
 *
 * Populates new metadata fields on existing pricing_entities:
 *   source_label, effective_date, last_verified, notes, estimate_type, state
 *
 * Run: node scripts/migrate_metadata.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const db = new Database(DB_PATH);

// Ensure columns exist (idempotent - will fail silently if already there)
const cols = [
  'ALTER TABLE pricing_entities ADD COLUMN effective_date TEXT',
  'ALTER TABLE pricing_entities ADD COLUMN last_verified TEXT',
  'ALTER TABLE pricing_entities ADD COLUMN source_label TEXT',
  'ALTER TABLE pricing_entities ADD COLUMN notes TEXT',
  'ALTER TABLE pricing_entities ADD COLUMN estimate_type TEXT DEFAULT \'official\'',
  'ALTER TABLE pricing_entities ADD COLUMN state TEXT',
];
for (const sql of cols) {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
}

console.log('✅ Schema columns ensured.');

// ─── Known TX providers (from Texas Open Data Emergency Services Billing Rates)
const TX_LABEL = 'Texas Open Data Emergency Services Billing Rates';
const TX_DATE  = '2026-03-12';

// ─── Known WA providers
const WA_LABEL = 'Washington State EMS & Trauma Rates (DOH)';
const WA_DATE  = '2026-03-12';

// ─── Known CA providers
const CA_LABEL = 'City of Mountain View / SFFD Official Ambulance Rate Schedule';
const SF_DATE  = '2026-03-15';
const SJ_DATE  = '2026-03-12';

const updates = [
  // ── San Francisco ──────────────────────────────────────────────────────────
  {
    id: 'san_francisco_fire_dept',
    source_label: 'San Francisco Fire Department Official Ambulance Rate Schedule',
    effective_date: '2026-01-01',
    last_verified: SF_DATE,
    estimate_type: 'official',
    state: 'CA',
    notes: 'BLS and ALS base rates are equal per SFFD fee schedule. TNT fee applies for all medical assessments without transport.',
  },

  // ── San Jose ───────────────────────────────────────────────────────────────
  {
    id: 'san_jose_market',
    source_label: CA_LABEL,
    effective_date: '2026-01-01',
    last_verified: SJ_DATE,
    estimate_type: 'official',
    state: 'CA',
    notes: 'BLS base rate sourced from Mountain View/Santa Clara County EMS schedule. ALS rate not separately listed; BLS rate applies.',
  },

  // ── Texas prefixes ─────────────────────────────────────────────────────────
  ...[
    'town_of_fairview_market','city_of_mansfield_market','city_of_saginaw_market',
    'city_of_bowie_market','bryanbrazosch_st_joseph_regional_health_ems_market',
    'crockett_county_market','village_fire_department_market',
    'city_of_el_campo_market','city_of_baytown_market',
    'hardin_county_esd__2__lumberton_fire__ems_market','city_of_yoakum_ems_market',
    'wilson_county_emergency_services_district_4_market','city_of_schertz_ems_market',
    'city_of_pharr_market','fayette_county_texas_market','scurry_county_market',
    'ward_county_ems_market','austin_and_travis_county_market',
  ].map(id => ({
    id,
    source_label: TX_LABEL,
    effective_date: '2025-09-01',
    last_verified: TX_DATE,
    estimate_type: 'official',
    state: 'TX',
    notes: null,
  })),

  // ── Washington prefixes ────────────────────────────────────────────────────
  ...[
    'tonasket_ems_district_market','walla_walla_county_fire_protection_district_5_market',
    'city_of_buckley_market','skagit_county_ems_market',
    'whitman_county_fire_district_12_market','city_of_longview_market',
    'pierce_county_fire_district_13_market','city_of_cheney_fire_department_market',
    'spokane_county_fire_district_10_market','lewiston_fire_department_market',
    'seattle_fire_department_market','kittitas_county_fire_protection_district_2_market',
  ].map(id => ({
    id,
    source_label: WA_LABEL,
    effective_date: '2025-07-01',
    last_verified: WA_DATE,
    estimate_type: 'official',
    state: 'WA',
    notes: null,
  })),
];

const stmt = db.prepare(`
  UPDATE pricing_entities
  SET source_label   = @source_label,
      effective_date = @effective_date,
      last_verified  = @last_verified,
      estimate_type  = @estimate_type,
      state          = @state,
      notes          = @notes
  WHERE id = @id
`);

const run = db.transaction(() => {
  let updated = 0;
  for (const row of updates) {
    const info = stmt.run(row);
    if (info.changes) updated++;
  }
  return updated;
});

const count = run();
console.log(`✅ Updated metadata on ${count} entities.`);

// List any remaining entities that still have no source_label
const missing = db.prepare(`
  SELECT id, display_name FROM pricing_entities WHERE source_label IS NULL
`).all();

if (missing.length) {
  console.warn(`⚠️  ${missing.length} entities still have no source_label:`);
  for (const e of missing) console.warn(`   - ${e.id} (${e.display_name})`);
} else {
  console.log('✅ All entities have source_label.');
}

db.close();
console.log('--- Metadata migration complete ---');
