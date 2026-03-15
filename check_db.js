const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.resolve(__dirname, 'zip_lookup.db');
  console.log(`Trying to open database at: ${dbPath}`);
  const db = new Database(dbPath, { timeout: 2000 });
  console.log('Database opened.');
  const result = db.prepare('SELECT 1 as result').get();
  console.log('Query result:', result);
  db.close();
  console.log('Database closed.');
} catch (err) {
  console.error('Error:', err);
}
