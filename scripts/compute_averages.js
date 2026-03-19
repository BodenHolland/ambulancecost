/**
 * scripts/compute_averages.js
 *
 * Computes statewide averages from existing pricing_entities and inserts
 * them as fallback "statewide_average" entities. Then maps any prefix that
 * currently has NULL bls_base (or no entry at all) to the appropriate state
 * average if one can be determined from the 2-digit ZIP prefix → state map.
 *
 * Run: node scripts/compute_averages.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const db = new Database(DB_PATH);

// ── 2-digit ZIP prefix → state ───────────────────────────────────────────────
const ZIP2_STATE = {
  '01':'MA','02':'MA','03':'NH','04':'ME','05':'VT','06':'CT',
  '07':'NJ','08':'NJ','09':'NY','10':'NY','11':'NY','12':'NY',
  '13':'NY','14':'NY','15':'PA','16':'PA','17':'PA','18':'PA','19':'PA',
  '20':'DC','21':'MD','22':'VA','23':'VA','24':'VA','25':'WV','26':'WV',
  '27':'NC','28':'NC','29':'SC','30':'GA','31':'GA','32':'FL','33':'FL','34':'FL',
  '35':'AL','36':'AL','37':'TN','38':'TN','39':'MS','40':'KY','41':'KY','42':'KY',
  '43':'OH','44':'OH','45':'OH','46':'IN','47':'IN','48':'MI','49':'MI',
  '50':'IA','51':'IA','52':'IA','53':'WI','54':'WI','55':'MN','56':'MN',
  '57':'SD','58':'ND','59':'MT','60':'IL','61':'IL','62':'IL',
  '63':'MO','64':'MO','65':'MO','66':'KS','67':'KS','68':'NE','69':'NE',
  '70':'LA','71':'LA','72':'AR','73':'OK','74':'OK',
  '75':'TX','76':'TX','77':'TX','78':'TX','79':'TX',
  '80':'CO','81':'CO','82':'WY','83':'ID','84':'UT','85':'AZ','86':'AZ',
  '87':'NM','88':'NM','89':'NV','90':'CA','91':'CA','92':'CA','93':'CA',
  '94':'CA','95':'CA','96':'HI','97':'OR','98':'WA','99':'AK',
};

// Build reverse map: state → list of 2-digit prefixes
const STATE_PREFIXES = {};
for (const [pfx, st] of Object.entries(ZIP2_STATE)) {
  (STATE_PREFIXES[st] = STATE_PREFIXES[st] || []).push(pfx);
}

// ── Compute per-state averages from existing official entities ────────────────
console.log('Computing statewide averages from official entities...');
const entities = db.prepare(`
  SELECT state, bls_base, als_base, mileage
  FROM pricing_entities
  WHERE estimate_type IN ('official', 'prefix_average', 'exact_zip', 'state_maximum')
    AND state IS NOT NULL
`).all();

const stateBuckets = {};
for (const e of entities) {
  if (!e.state) continue;
  const b = stateBuckets[e.state] = stateBuckets[e.state] || { bls:[], als:[], mi:[] };
  if (e.bls_base > 0) b.bls.push(e.bls_base);
  if (e.als_base > 0) b.als.push(e.als_base);
  if (e.mileage  > 0) b.mi.push(e.mileage);
}

const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

// National fallback (all non-zero values across all states)
const allBls = entities.filter(e => e.bls_base > 0).map(e => e.bls_base);
const allAls = entities.filter(e => e.als_base > 0).map(e => e.als_base);
const allMi  = entities.filter(e => e.mileage > 0).map(e => e.mileage);
const nationalBls = avg(allBls);
const nationalAls = avg(allAls);
const nationalMi  = avg(allMi);

console.log(`  National average — BLS: $${nationalBls?.toFixed(2)}, ALS: $${nationalAls?.toFixed(2)}, Mileage: $${nationalMi?.toFixed(2)}/mi`);

// Ensure schema columns exist
for (const sql of [
  "ALTER TABLE pricing_entities ADD COLUMN effective_date TEXT",
  "ALTER TABLE pricing_entities ADD COLUMN last_verified TEXT",
  "ALTER TABLE pricing_entities ADD COLUMN source_label TEXT",
  "ALTER TABLE pricing_entities ADD COLUMN notes TEXT",
  "ALTER TABLE pricing_entities ADD COLUMN estimate_type TEXT DEFAULT 'official'",
  "ALTER TABLE pricing_entities ADD COLUMN state TEXT",
]) {
  try { db.exec(sql); } catch (_) {}
}

const upsertEntity = db.prepare(`
  INSERT OR REPLACE INTO pricing_entities
    (id, display_name, bls_base, als_base, mileage, tnt_fee,
     tnt_description, source_url, last_updated,
     effective_date, last_verified, source_label, notes, estimate_type, state)
  VALUES
    (@id, @display_name, @bls_base, @als_base, @mileage, 0,
     NULL, NULL, @last_updated,
     @effective_date, @last_verified, @source_label, @notes, @estimate_type, @state)
`);

const upsertPrefix = db.prepare(`
  INSERT OR IGNORE INTO prefix_mappings (prefix, entity_id) VALUES (?, ?)
`);

const today = new Date().toISOString().slice(0, 10);

const run = db.transaction(() => {
  let inserted = 0;
  let prefixesMapped = 0;

  // ── National fallback (used when no state average is available) ─────────────
  if (nationalBls || nationalAls || nationalMi) {
    const natId = 'us_national_average';
    upsertEntity.run({
      id: natId,
      display_name: 'U.S. National Average (Estimated)',
      bls_base: nationalBls ? Math.round(nationalBls * 100) / 100 : null,
      als_base: nationalAls ? Math.round(nationalAls * 100) / 100 : null,
      mileage:  nationalMi  ? Math.round(nationalMi  * 100) / 100 : null,
      last_updated: today,
      effective_date: today,
      last_verified: today,
      source_label: 'Computed from verified provider data in this database',
      notes: null,
      estimate_type: 'national_average',
      state: null,
    });
    inserted++;
    console.log(`  ✅ Upserted national average entity (${natId})`);
  }

  // ── Per-state averages ───────────────────────────────────────────────────────
  for (const [state, b] of Object.entries(stateBuckets)) {
    const blsAvg = avg(b.bls);
    const alsAvg = avg(b.als);
    const miAvg  = avg(b.mi);

    if (!blsAvg && !alsAvg && !miAvg) continue;

    const entityId = `${state.toLowerCase()}_statewide_average`;
    upsertEntity.run({
      id: entityId,
      display_name: `${state} Statewide Average (Estimated)`,
      bls_base: blsAvg ? Math.round(blsAvg * 100) / 100 : null,
      als_base: alsAvg ? Math.round(alsAvg * 100) / 100 : null,
      mileage:  miAvg  ? Math.round(miAvg  * 100) / 100 : null,
      last_updated: today,
      effective_date: today,
      last_verified: today,
      source_label: `Computed from ${b.bls.length} verified ${state} provider records`,
      notes: null,
      estimate_type: 'statewide_average',
      state,
    });
    inserted++;
    console.log(`  ✅ Upserted ${state} average (BLS $${blsAvg?.toFixed(2)}, Mileage $${miAvg?.toFixed(2)})`);

    // Map each 2-digit prefix for this state to the average entity, but only
    // if no better 3-digit mapping already exists for ALL 3-digit prefixes
    // that start with this 2-digit code (i.e. only fill in gaps).
    const statePfxs = STATE_PREFIXES[state] || [];
    for (const pfx2 of statePfxs) {
      // Look for existing 3-digit prefix mappings that start with pfx2
      const covered = db.prepare(
        'SELECT COUNT(*) as c FROM prefix_mappings WHERE prefix LIKE ?'
      ).get(pfx2 + '%').c;

      if (covered === 0) {
        // No provider data for any 3-digit prefix under this 2-digit code
        // → map the 2-digit prefix itself as a last-resort fallback
        // Note: the lookup uses substring(0,3) so we add both forms
        // to ensure we catch any pattern like "94_" with no entity
        const pfx3candidates = [];
        for (let d = 0; d <= 9; d++) pfx3candidates.push(pfx2 + d);
        for (const p of pfx3candidates) {
          const existing = db.prepare(
            'SELECT COUNT(*) as c FROM prefix_mappings WHERE prefix = ?'
          ).get(p).c;
          if (!existing) {
            upsertPrefix.run(p, entityId);
            prefixesMapped++;
          }
        }
      }
    }
  }

  return { inserted, prefixesMapped };
});

const result = run();
console.log(`\n✅ ${result.inserted} statewide average entities upserted.`);
console.log(`✅ ${result.prefixesMapped} unmapped 3-digit prefixes now route to state averages.`);
db.close();
console.log('--- compute_averages complete ---');
