import OpenAI from 'openai';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SERPER_API_KEY = process.env.SERPER_API_KEY;

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');
const shouldIngest = process.argv.includes('--ingest');

async function fetchGoogleResults(entityName, stateCode) {
  const query = `${entityName} ${stateCode} ambulance "fee schedule" OR "transport rate" 2025 OR 2026 site:.gov OR site:.org`;
  console.log(`\n🔍 Searching: ${query}`);
  
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: query, num: 8 })
  });

  const data = await response.json();
  const urls = [];
  if (data.organic) {
    urls.push(...data.organic.map(item => item.link));
  }
  return urls.slice(0, 3); // Get top 3 URLs
}

async function fetchAndParseContent(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    
    // If it's a PDF
    if (url.toLowerCase().endsWith('.pdf') || response.headers.get('content-type')?.includes('application/pdf')) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfData = await pdfParse(buffer);
      console.log(`   [PDF] Downloaded and parsed ${pdfData.numpages} pages.`);
      return pdfData.text;
    } 
    // If it's HTML
    else {
      const text = await response.text();
      const $ = cheerio.load(text);
      console.log(`   [HTML] Downloaded standard web page.`);
      // Extract just the visible text
      return $('body').text().replace(/\s+/g, ' '); 
    }
  } catch (error) {
    console.log(`   [!] Error downloading/parsing: ${error.message}`);
    return null;
  }
}

function filterRelevantChunks(text) {
  // Split by double newlines or basic paragraphs
  const paragraphs = text.replace(/\r\n/g, '\n').split(/\n\s*\n|\n/);
  
  // Filter for contextually relevant paragraphs to minimize noise
  const relevantChunks = paragraphs.filter(chunk => 
    /ambulance|ALS|BLS|transport|medical|fee|mileage|treatment|rate/i.test(chunk) && 
    (/\$|2025|2026/i.test(chunk))
  );

  const combined = relevantChunks.join('\n\n').trim();
  // Safe limit for GPT to avoid huge context costs (max ~15k chars is ~3.5k tokens)
  return combined.slice(0, 15000); 
}

async function extractWithOpenAI(entityName, combinedChunks, urlUsed) {
  if (!combinedChunks || combinedChunks.length < 50) return null;

  console.log(`   🧠 Sending ${combinedChunks.length} characters of filtered text to OpenAI...`);
  
  const extractionResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // 100x cheaper than gpt-4o!
    messages: [
      {
        role: 'system',
        content: `You are an extremely strict data extraction tool.
CRITICAL ANTI-HALLUCINATION RULES:
1. ONLY extract a cost if you see the exact dollar amount explicitly written in the provided text.
2. DO NOT guess, DO NOT infer, and DO NOT output a number based on external knowledge.
3. Set missing data points to null.`
      },
      {
        role: 'user',
        content: `Here are the scraped and filtered materials for ${entityName}. If this text is not relevant to their actual ambulance fee schedule for 2025/2026, set everything to null.\n\n${combinedChunks}`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'ems_secondary_extraction',
        schema: {
          type: 'object',
          properties: {
            bls_base: { type: ['number', 'null'] },
            als_base: { type: ['number', 'null'] },
            mileage: { type: ['number', 'null'] },
            tnt_fee: { type: ['number', 'null'] },
            notes: { type: 'string' }
          },
          required: ['bls_base', 'als_base', 'mileage', 'tnt_fee', 'notes'],
          additionalProperties: false
        },
        strict: true
      }
    },
    temperature: 0.0
  });

  const result = JSON.parse(extractionResponse.choices[0].message.content);
  result.source_url_used = urlUsed; 
  console.log('   ✓ Strict Extraction Complete.');
  return result;
}

async function searchAndExtract(entityName, stateCode) {
  try {
    const urls = await fetchGoogleResults(entityName, stateCode);
    if (urls.length === 0) {
      console.log(`⚠️  No valid search results found for ${entityName}`);
      return null;
    }

    for (const url of urls) {
      if (!url) continue;
      console.log(`📄 Checking candidate: ${url}`);
      
      const rawText = await fetchAndParseContent(url);
      if (!rawText) continue;

      const filteredChunks = filterRelevantChunks(rawText);
      const extraction = await extractWithOpenAI(entityName, filteredChunks, url);

      // If we got *any* valid numerical data back, we accept it and stop looking
      if (extraction && (extraction.bls_base || extraction.als_base || extraction.mileage || extraction.tnt_fee)) {
        return extraction;
      } else {
        console.log(`   [skip] Model found no explicit data in this document.`);
      }
    }

    return null;
  } catch (error) {
    console.error(`Error processing ${entityName}:`, error.message);
    return null;
  }
}

async function runSecondaryPass() {
  const db = new Database(DB_PATH);
  
  const missingDataEntities = db.prepare(`
    SELECT id, display_name, state, bls_base, als_base, mileage, tnt_fee 
    FROM pricing_entities 
    WHERE id IN ('phoenix_az', 'philadelphia_pa', 'san_antonio_tx', 'san_diego_ca', 'dallas_tx', 'jacksonville_fl', 'fort_worth_tx', 'columbus_oh', 'charlotte_nc', 'indianapolis_in')
      AND (bls_base IS NULL OR als_base IS NULL OR mileage IS NULL)
  `).all();
  
  console.log(`Found ${missingDataEntities.length} entities needing extraction via Smart Pipeline.`);
  
  const results = [];
  const updateStmt = db.prepare(`
    UPDATE pricing_entities 
    SET bls_base = COALESCE(@bls_base, bls_base),
        als_base = COALESCE(@als_base, als_base),
        mileage = COALESCE(@mileage, mileage),
        tnt_fee = COALESCE(@tnt_fee, tnt_fee),
        source_url = COALESCE(@source_url, source_url),
        tnt_description = COALESCE(@notes, tnt_description),
        last_updated = @last_updated
    WHERE id = @id
  `);

  for (const entity of missingDataEntities) {
    const extraction = await searchAndExtract(entity.display_name, entity.state);
    if (extraction && (extraction.bls_base || extraction.mileage || extraction.tnt_fee)) {
      extraction.id = entity.id;
      extraction.last_updated = new Date().toISOString().slice(0, 10);
      results.push(extraction);

      if (shouldIngest) {
        console.log(`   💾 Ingesting results for ${entity.display_name}...`);
        extraction.source_url = extraction.source_url_used; // format remap
        updateStmt.run(extraction);
      }
    }
    // Respect rate limits lightly
    await new Promise(r => setTimeout(r, 1000));
  }
  
  db.close();
  await fs.writeFile(path.resolve(__dirname, '../data/smart_pipeline_review.json'), JSON.stringify(results, null, 2));
  console.log(`\n--- Completed. Data in data/smart_pipeline_review.json. Ingested: ${shouldIngest} ---`);
}

runSecondaryPass();
