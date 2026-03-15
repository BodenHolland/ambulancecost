const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '../zip_lookup.db');
const TNT_JSON_PATH = path.resolve(__dirname, '../data/verified_tnt_rates.json');
const MARKET_JSON_PATH = path.resolve(__dirname, '../data/verified_market_rates.json');

const db = new Database(DB_PATH);

console.log('Synchronizing verified tables in zip_lookup.db...');

db.exec(`
  DROP TABLE IF EXISTS verified_tnt_zips;
  DROP TABLE IF EXISTS verified_tnt_rates;
  DROP TABLE IF EXISTS verified_market_rates;

  CREATE TABLE IF NOT EXISTS verified_tnt_rates (
    city          TEXT,
    state         TEXT,
    tnt_fee       REAL,
    description   TEXT,
    source_url    TEXT,
    is_verified   INTEGER,
    last_updated  TEXT,
    PRIMARY KEY (city, state)
  );

  CREATE TABLE IF NOT EXISTS verified_market_rates (
    zip_prefix    TEXT PRIMARY KEY,
    city          TEXT,
    bls_base      REAL,
    als_base      REAL,
    mileage       REAL,
    source_url    TEXT,
    verified_date TEXT
  );

  CREATE TABLE IF NOT EXISTS verified_tnt_zips (
    zip           TEXT PRIMARY KEY,
    city          TEXT,
    state         TEXT,
    FOREIGN KEY(city, state) REFERENCES verified_tnt_rates(city, state)
  );
`);

if (fs.existsSync(TNT_JSON_PATH)) {
  const tntData = JSON.parse(fs.readFileSync(TNT_JSON_PATH, 'utf8'));
  const insertTnt = db.prepare(`
    INSERT OR REPLACE INTO verified_tnt_rates (city, state, tnt_fee, description, source_url, is_verified, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTntZip = db.prepare(`
    INSERT OR REPLACE INTO verified_tnt_zips (zip, city, state)
    VALUES (?, ?, ?)
  `);

  const tntTx = db.transaction((data) => {
    for (const item of data) {
      insertTnt.run(item.city, item.state, item.tntFee, item.description, item.sourceUrl, item.isVerified ? 1 : 0, item.lastUpdated);
      if (item.zipUnits) {
        for (const zip of item.zipUnits) {
          insertTntZip.run(zip, item.city, item.state);
        }
      }
    }
  });
  tntTx(tntData);
  console.log(`✅ Synchronized ${tntData.length} verified TNT entries.`);
}

if (fs.existsSync(MARKET_JSON_PATH)) {
  const marketData = JSON.parse(fs.readFileSync(MARKET_JSON_PATH, 'utf8'));
  const insertMarket = db.prepare(`
    INSERT OR REPLACE INTO verified_market_rates (zip_prefix, city, bls_base, als_base, mileage, source_url, verified_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const marketTx = db.transaction((data) => {
    for (const item of data) {
      insertMarket.run(item.zip_prefix, item.city, item.bls_base, item.als_base || 0, item.mileage, item.source_url, item.verified_date);
    }
  });
  marketTx(marketData);
  console.log(`✅ Synchronized ${marketData.length} verified market rate overrides.`);
}

db.close();
console.log('Database update complete.');
