const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, 'zip_lookup.db');
const db = new Database(DB_PATH);

console.log('--- Starting Unified Architecture Migration ---');

// 1. Create New Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS pricing_entities (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    bls_base REAL DEFAULT 0,
    als_base REAL DEFAULT 0,
    mileage REAL DEFAULT 0,
    tnt_fee REAL DEFAULT 0,
    tnt_description TEXT,
    source_url TEXT,
    last_updated TEXT
  );

  CREATE TABLE IF NOT EXISTS zip_mappings (
    zip TEXT PRIMARY KEY,
    entity_id TEXT,
    FOREIGN KEY(entity_id) REFERENCES pricing_entities(id)
  );

  CREATE TABLE IF NOT EXISTS prefix_mappings (
    prefix TEXT PRIMARY KEY,
    entity_id TEXT,
    FOREIGN KEY(entity_id) REFERENCES pricing_entities(id)
  );
`);

console.log('✅ Created pricing_entities, zip_mappings, and prefix_mappings tables.');

// 2. Helper to generate unique IDs
const slugify = (text) => text.toLowerCase().replace(/ /g, '_').replace(/[^\w-]+/g, '');

// 3. Migrate San Francisco (The Priority)
const sfEntity = {
  id: 'san_francisco_fire_dept',
  display_name: 'San Francisco Fire Department',
  bls_base: 2555.00,
  als_base: 2555.00,
  mileage: 49.00,
  tnt_fee: 568.0,
  tnt_description: "SFFD charges a 'Treatment without Transportation' fee for all medical assessments that don't result in transport.",
  source_url: 'https://sf-fire.org/services/ambulance-billing',
  last_updated: '2026-03-15'
};

const insertEntity = db.prepare(`
  INSERT OR REPLACE INTO pricing_entities (id, display_name, bls_base, als_base, mileage, tnt_fee, tnt_description, source_url, last_updated)
  VALUES (@id, @display_name, @bls_base, @als_base, @mileage, @tnt_fee, @tnt_description, @source_url, @last_updated)
`);

insertEntity.run(sfEntity);
db.prepare("INSERT OR REPLACE INTO prefix_mappings (prefix, entity_id) VALUES ('941', 'san_francisco_fire_dept')").run();

// Map common SF zips directly
['94107', '94103', '94110', '94129', '94143'].forEach(zip => {
  db.prepare("INSERT OR REPLACE INTO zip_mappings (zip, entity_id) VALUES (?, ?)").run(zip, 'san_francisco_fire_dept');
});

console.log('✅ Migrated San Francisco as the master Entity.');

// 4. Migrate Existing JSON Data (Market Overrides)
const marketPath = path.resolve(__dirname, 'data/verified_market_rates.json');
if (fs.existsSync(marketPath)) {
  const marketData = JSON.parse(fs.readFileSync(marketPath, 'utf8'));
  marketData.forEach(item => {
    const entityId = slugify(item.city) + '_market';
    insertEntity.run({
       id: entityId,
       display_name: item.city,
       bls_base: item.bls_base,
       als_base: item.als_base || 0,
       mileage: item.mileage,
       tnt_fee: 0,
       tnt_description: null,
       source_url: item.source_url,
       last_updated: item.verified_date
    });
    db.prepare("INSERT OR REPLACE INTO prefix_mappings (prefix, entity_id) VALUES (?, ?)").run(item.zip_prefix, entityId);
  });
}

// 5. Migrate Existing JSON Data (TNT Fees)
const tntPath = path.resolve(__dirname, 'data/verified_tnt_rates.json');
if (fs.existsSync(tntPath)) {
  const tntData = JSON.parse(fs.readFileSync(tntPath, 'utf8'));
  tntData.forEach(item => {
    // Check if entity already exists (matched from market)
    const existing = db.prepare("SELECT * FROM pricing_entities WHERE display_name = ?").get(item.city);
    
    if (existing) {
       db.prepare(`
         UPDATE pricing_entities 
         SET tnt_fee = ?, tnt_description = ?, source_url = COALESCE(source_url, ?)
         WHERE id = ?
       `).run(item.tntFee, item.description, item.sourceUrl, existing.id);
    } else {
       const entityId = slugify(item.city) + '_tnt';
       insertEntity.run({
          id: entityId,
          display_name: item.city + ' Official',
          bls_base: 0,
          als_base: 0,
          mileage: 0,
          tnt_fee: item.tntFee,
          tnt_description: item.description,
          source_url: item.sourceUrl,
          last_updated: item.lastUpdated
       });
       if (item.zipUnits) {
          item.zipUnits.forEach(zip => {
             db.prepare("INSERT OR REPLACE INTO zip_mappings (zip, entity_id) VALUES (?, ?)").run(zip, entityId);
          });
       }
    }
  });
}

console.log('✅ Synchronized all historical JSON data into the new schema.');
db.close();
console.log('--- Migration Complete ---');
