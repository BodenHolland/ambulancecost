/**
 * scripts/ingest_firecrawl_rates.js
 * 
 * Safely ingests the AI-extracted "Treatment Without Transport" (TNT) rates 
 * from data/firecrawl_extracted_rates.json into the master zip_lookup.db SQLite database.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const JSON_PATH = path.resolve(__dirname, '..', 'data', 'firecrawl_extracted_rates.json');

function normalizeName(name) {
  if (!name) return "";
  return name.toLowerCase()
    .replace(/fire department/g, '')
    .replace(/city of/g, '')
    .replace(/ems/g, '')
    .replace(/department/g, '')
    .replace(/agency/g, '')
    .trim();
}

async function run() {
  console.log('--- Starting Firecrawl Data Ingestion ---');

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ Cannot find ${JSON_PATH}`);
    process.exit(1);
  }

  const ratesData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const db = new Database(DB_PATH);

  const entities = db.prepare('SELECT id, display_name FROM pricing_entities').all();
  
  let updatedCount = 0;
  let skippedNullCount = 0;
  let unmatchedCount = 0;

  const updateStmt = db.prepare(`
    UPDATE pricing_entities 
    SET bls_base = COALESCE(@bls_base, bls_base),
        als_base = COALESCE(@als_base, als_base),
        mileage = COALESCE(@mileage, mileage),
        tnt_fee = COALESCE(@tnt_fee, tnt_fee), 
        tnt_description = @tnt_description, 
        source_url = @source_url,
        last_updated = @last_updated
    WHERE id = @id
  `);

  for (const entry of ratesData) {
    const fee = entry.bls_treatment_no_transport_cost; 
    const bls_base = entry.bls_base;
    const als_base = entry.als_base;
    const mileage = entry.mileage;
    
    // Skip if all values are null
    if (fee == null && bls_base == null && als_base == null && mileage == null) {
      skippedNullCount++;
      continue;
    }

    // Try to match the municipality name to an existing DB record
    const targetName = normalizeName(entry.municipality);
    let matchedEntity = null;

    if (targetName) {
       matchedEntity = entities.find(e => {
         const dbName = normalizeName(e.display_name);
         return dbName.includes(targetName) || targetName.includes(dbName);
       });
    }

    // NYC Special Case matching
    if (!matchedEntity && entry.source_url.includes('nyc.gov')) {
       matchedEntity = entities.find(e => e.id.includes('new_york') || e.display_name.includes('New York'));
    }

    if (matchedEntity) {
      console.log(`✅ MATCHED: "${entry.municipality}" -> DB Entity "${matchedEntity.display_name}"`);
      
      updateStmt.run({
        bls_base: bls_base,
        als_base: als_base,
        mileage: mileage,
        tnt_fee: fee,
        tnt_description: entry.notes || 'Extracted via Firecrawl Automated Pipeline',
        source_url: entry.source_url,
        last_updated: new Date().toISOString().slice(0, 10),
        id: matchedEntity.id
      });
      updatedCount++;
    } else {
      console.log(`⚠️  NOT FOUND in DB: "${entry.municipality}" [Fee: $${fee}]. Requires manual zip-binding insertion.`);
      unmatchedCount++;
    }
  }

  db.close();

  console.log(`\n--- Ingestion Complete ---`);
  console.log(`Successfully Updated: ${updatedCount} entities in database.`);
  console.log(`Skipped (No fee published online): ${skippedNullCount} entities.`);
  console.log(`Unmatched (Needs to be added to DB): ${unmatchedCount} entities.`);
}

run();
