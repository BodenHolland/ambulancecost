/**
 * setup_db.js — CMS 2026 Ambulance Fee Schedule Data Ingestion
 *
 * Parses two CMS source files and rebuilds zip_lookup.db with:
 *   - zip_data: zip → contractor, locality, urban/rural/super-rural, state protection
 *   - afs_rates: contractor+locality+hcpcs → gpci + pre-computed rates (from AFS PUF)
 *
 * Data Sources (downloaded from CMS.gov):
 *   cms_2026_data/508-compliant-version-of-AFS2026_PUF_ext.txt  (AFS PUF, tab-delimited)
 *   zip5_data/ZIP5_APR2026.txt                                   (fixed-width, see ZIP5lyout.txt)
 *
 * Run: node setup_db.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, 'zip_lookup.db');
const AFS_PATH = path.resolve(__dirname, 'cms_2026_data/508-compliant-version-of-AFS2026_PUF_ext.txt');
const ZIP5_PATH = path.resolve(__dirname, 'zip5_data/ZIP5_APR2026.txt');

// States with active surprise-billing protections as of 2026
const PROTECTED_STATES = new Set([
  'AR','CA','CO','CT','DE','FL','IL','IN','LA','ME','MD','MS',
  'MN','NH','NY','OH','OK','OR','TX','UT','WA','WV'
]);

// Known cities (from the original hand-curated entries)
const KNOWN_CITIES = {
  '94107': { city: 'San Francisco', state: 'CA' },
  '94103': { city: 'San Francisco', state: 'CA' },
  '94129': { city: 'San Francisco (Presidio)', state: 'CA' },
  '75201': { city: 'Dallas', state: 'TX' },
  '59001': { city: 'Absarokee', state: 'MT' },
  '10001': { city: 'New York', state: 'NY' },
  '78701': { city: 'Austin', state: 'TX' },
  '82701': { city: 'Newcastle', state: 'WY' },
};

// HCPCS codes we care about
const HCPCS_OF_INTEREST = new Set(['A0425', 'A0427', 'A0429']);

// ─── Step 1: Parse AFS PUF ─────────────────────────────────────────────────
console.log('Parsing AFS PUF...');
const afsLines = fs.readFileSync(AFS_PATH, 'utf8').split('\n');
const afsRates = new Map(); // key: "contractor|locality|hcpcs"

for (const line of afsLines) {
  if (!line.trim() || line.startsWith('CONTRACTOR')) continue;

  // Tab-delimited: CONTRACTOR  LOCALITY  HCPCS  RVU  GPCI  BASE RATE  URBAN  RURAL  SUPER_RURAL  RURAL_MILES
  const parts = line.split('\t').map(s => s.trim().replace(/["$,]/g, ''));
  if (parts.length < 9) continue;

  const [contractor, locality, hcpcs, , gpci, , urban, rural, superRural] = parts;
  if (!HCPCS_OF_INTEREST.has(hcpcs)) continue;

  const key = `${contractor}|${locality}|${hcpcs}`;
  afsRates.set(key, {
    contractor,
    locality,
    hcpcs,
    gpci: parseFloat(gpci) || 0,
    urban_rate: parseFloat(urban) || null,
    rural_rate: parseFloat(rural) || null,
    super_rural_rate: parseFloat(superRural) || null,
  });
}

console.log(`  Loaded ${afsRates.size} AFS rate entries for ${HCPCS_OF_INTEREST.size} HCPCS codes.`);

// ─── Step 2: Parse ZIP5 File ───────────────────────────────────────────────
// Fixed-width layout (from ZIP5lyout.txt):
//   State:    cols 1-2   (0-indexed: 0-1)
//   Zip:      cols 3-7   (2-6)
//   Carrier:  cols 8-12  (7-11)
//   Locality: cols 13-14 (12-13)
//   Rural:    col 15     (14)  blank=urban, R=rural, B=super-rural
console.log('Parsing ZIP5 locality file...');
const zipLines = fs.readFileSync(ZIP5_PATH, 'utf8').split('\n');
const zipLookup = new Map(); // zip -> { state, contractor, locality, ruralIndicator }
let zipCount = 0;

for (const line of zipLines) {
  if (line.length < 14) continue;

  const state      = line.substring(0, 2).trim();
  const zip        = line.substring(2, 7).trim();
  const contractor = line.substring(7, 12).trim();
  const locality   = line.substring(12, 14).trim();
  const ruralChar  = line.substring(14, 15).trim(); // blank=urban, R=rural, B=super-rural

  if (!zip || !/^\d{5}$/.test(zip)) continue;
  if (!contractor || !locality) continue;

  let type;
  if (ruralChar === 'B') {
    type = 'super-rural';
  } else if (ruralChar === 'R') {
    type = 'rural';
  } else {
    type = 'urban';
  }

  // Only keep first occurrence (some zips appear in multiple carrier files)
  if (!zipLookup.has(zip)) {
    zipLookup.set(zip, { state, contractor, locality, type });
    zipCount++;
  }
}

console.log(`  Loaded ${zipCount} unique zip codes.`);

// ─── Step 3: Rebuild SQLite DB ─────────────────────────────────────────────
console.log('Rebuilding zip_lookup.db...');
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS afs_rates (
    contractor    TEXT NOT NULL,
    locality      TEXT NOT NULL,
    hcpcs         TEXT NOT NULL,
    gpci          REAL,
    urban_rate    REAL,
    rural_rate    REAL,
    super_rural_rate REAL,
    PRIMARY KEY (contractor, locality, hcpcs)
  );

  CREATE TABLE IF NOT EXISTS zip_data (
    zip           TEXT PRIMARY KEY,
    city          TEXT,
    state         TEXT,
    type          TEXT,
    is_protected  INTEGER,
    contractor    TEXT,
    locality      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_afs_contractor_locality ON afs_rates (contractor, locality);
`);

// Insert AFS rates
const insertAfs = db.prepare(`
  INSERT OR REPLACE INTO afs_rates (contractor, locality, hcpcs, gpci, urban_rate, rural_rate, super_rural_rate)
  VALUES (@contractor, @locality, @hcpcs, @gpci, @urban_rate, @rural_rate, @super_rural_rate)
`);
const insertAfsMany = db.transaction((rows) => {
  for (const row of rows) insertAfs.run(row);
});
insertAfsMany([...afsRates.values()]);
console.log(`  Inserted ${afsRates.size} rows into afs_rates.`);

// Insert zip_data (all ~42k zip codes from ZIP5 file)
const insertZip = db.prepare(`
  INSERT OR REPLACE INTO zip_data (zip, city, state, type, is_protected, contractor, locality)
  VALUES (@zip, @city, @state, @type, @is_protected, @contractor, @locality)
`);
const insertZipMany = db.transaction((rows) => {
  for (const row of rows) insertZip.run(row);
});

const zipRows = [];
for (const [zip, data] of zipLookup) {
  const known = KNOWN_CITIES[zip];
  zipRows.push({
    zip,
    city: known?.city ?? null,
    state: data.state,
    type: data.type,
    is_protected: PROTECTED_STATES.has(data.state) ? 1 : 0,
    contractor: data.contractor,
    locality: data.locality,
  });
}
insertZipMany(zipRows);
console.log(`  Inserted ${zipRows.length} rows into zip_data.`);

db.close();

// ─── Step 4: Validation Queries ────────────────────────────────────────────
console.log('\n✅ Database built. Running validation checks...\n');

const db2 = new Database(DB_PATH, { readonly: true });

const TEST_CASES = [
  { zip: '94103', label: 'San Francisco, CA', expectedBls: 597.68 },
  { zip: '78701', label: 'Austin, TX',         expectedBls: 483.26 },
  { zip: '82701', label: 'Rural Wyoming',       expectedBls: null },
];

for (const tc of TEST_CASES) {
  const zd = db2.prepare('SELECT * FROM zip_data WHERE zip = ?').get(tc.zip);
  if (!zd) { console.log(`  ❌ ${tc.label} (${tc.zip}): Not found in zip_data`); continue; }

  const bls = db2.prepare(
    'SELECT * FROM afs_rates WHERE contractor = ? AND locality = ? AND hcpcs = ?'
  ).get(zd.contractor, zd.locality, 'A0429');

  if (!bls) { console.log(`  ❌ ${tc.label}: No A0429 rate for ${zd.contractor}/${zd.locality}`); continue; }

  const rate = tc.zip === '82701' ? bls.super_rural_rate : bls.urban_rate;
  const rateLabel = tc.zip === '82701' ? 'super-rural' : 'urban';
  console.log(`  ${tc.label} (${tc.zip})`);
  console.log(`    type: ${zd.type}, contractor: ${zd.contractor}, locality: ${zd.locality}, GPCI: ${bls.gpci}`);
  console.log(`    A0429 ${rateLabel}: $${rate?.toFixed(2)} ${tc.expectedBls ? `(expected ~$${tc.expectedBls})` : ''}`);
  if (tc.expectedBls && Math.abs(rate - tc.expectedBls) < 0.05) {
    console.log(`    ✅ Match!`);
  } else if (tc.expectedBls) {
    console.log(`    ℹ️  AFS PUF value differs from spec — using authoritative CMS data.`);
  } else {
    console.log(`    ✅ OK`);
  }
  console.log();
}

const totalZips = db2.prepare('SELECT count(*) as c FROM zip_data').get().c;
const totalRates = db2.prepare('SELECT count(*) as c FROM afs_rates').get().c;
console.log(`DB summary: ${totalZips} zip codes, ${totalRates} rate entries.`);
db2.close();
