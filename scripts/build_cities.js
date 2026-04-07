const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_URL = 'https://raw.githubusercontent.com/millbj92/US-Zip-Codes-JSON/master/USCities.json';
const OUTPUT_PATH = path.join(__dirname, '../public/cities.json');

console.log('Fetching cities data...');

https.get(DATA_URL, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('Data fetched, processing...');
    try {
      const data = JSON.parse(body);
      const cityMap = new Map();

      // Add actual cities from the primary dataset
      for (const item of data) {
        if (!item.city || !item.state || !item.zip_code) continue;

        const city = item.city.trim().toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase());
        const state = item.state.toUpperCase();
        const zipStr = item.zip_code.toString().padStart(5, '0');

        const key = `${city}, ${state}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, [city, state, zipStr]);
        }
      }

      // Merge curated neighborhoods
      const neighborhoodPath = path.join(__dirname, 'neighborhoods_data.json');
      if (fs.existsSync(neighborhoodPath)) {
        const neighborhoods = JSON.parse(fs.readFileSync(neighborhoodPath, 'utf8'));
        console.log('Merging curated neighborhoods...');
        Object.values(neighborhoods).forEach(nList => {
          nList.forEach(([nName, nState, nZip]) => {
            const key = `${nName}, ${nState}`;
            // Neighborhoods take precedence as specific aliases if not already present or if we want to force them
            cityMap.set(key, [nName, nState, nZip]);
          });
        });
      }

      const results = Array.from(cityMap.values());
      // Sort alphabetically
      results.sort((a, b) => {
        if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
        return a[0].localeCompare(b[0]);
      });

      fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results), 'utf8');
      console.log(`Processed ${results.length} unique cities. Saved to ${OUTPUT_PATH} (${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB)`);

    } catch (e) {
        console.error('Error parsing data', e);
    }
  });

}).on('error', (e) => {
  console.error(e);
});
