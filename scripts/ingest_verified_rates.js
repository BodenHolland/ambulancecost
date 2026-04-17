/**
 * scripts/ingest_verified_rates.js
 * 
 * Ingests the manually verified "Gold Standard" rates for the control cities
 * from data/verified_control_rates.json into zip_lookup.db.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const JSON_PATH = path.resolve(__dirname, '..', 'data', 'verified_control_rates.json');

async function run() {
  console.log('--- Starting Verified Data Ingestion ---');

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ Cannot find ${JSON_PATH}`);
    process.exit(1);
  }

  const ratesData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const db = new Database(DB_PATH);

  const updateStmt = db.prepare(`
    UPDATE pricing_entities 
    SET bls_base = @bls_base,
        als_base = @als_base,
        mileage = @mileage,
        tnt_fee = @tnt_fee, 
        tnt_description = @notes, 
        source_url = @source_url,
        last_updated = @last_updated,
        estimate_type = 'official'
    WHERE id = @id
  `);

  let updatedCount = 0;

  for (const entry of ratesData) {
    console.log(`Updating: ${entry.municipality} (${entry.id})...`);
    
    try {
      const result = updateStmt.run({
        bls_base: entry.bls_base,
        als_base: entry.als_base,
        mileage: entry.mileage,
        tnt_fee: entry.tnt_fee,
        notes: entry.notes,
        source_url: entry.source_url,
        last_updated: new Date().toISOString().slice(0, 10),
        id: entry.id
      });

      if (result.changes > 0) {
        console.log(`✅ SUCCESS: Updated ${entry.municipality}`);
        updatedCount++;
      } else {
        console.warn(`⚠️  WARNING: No record found with ID "${entry.id}" for ${entry.municipality}`);
      }
    } catch (err) {
      console.error(`❌ ERROR updating ${entry.municipality}: ${err.message}`);
    }
  }

  db.close();

  console.log(`\n--- Ingestion Complete ---`);
  console.log(`Successfully Updated: ${updatedCount} / ${ratesData.length} records.`);
}

run();
