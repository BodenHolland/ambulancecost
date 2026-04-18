import FirecrawlApp from '@mendable/firecrawl-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DB_PATH = path.resolve(__dirname, '..', 'zip_lookup.db');

// Check for --ingest flag
const shouldIngest = process.argv.includes('--ingest');

async function searchAndExtract(entityName) {
  console.log(`\n--- Deep Search for: ${entityName} ---`);
  
  const query = `"${entityName}" ambulance fee schedule ordinance 2026 PDF`;
  console.log(`🔍 Searching: ${query}`);
  
  try {
    let searchResponse;
    try {
      searchResponse = await firecrawl.search(query);
    } catch (e) {
      console.error(`Search failed for ${entityName}: ${e.message}`);
      return null;
    }

    const urls = [];
    if (searchResponse.data) {
       urls.push(...searchResponse.data.slice(0, 2).map(item => item.url));
    } else if (searchResponse.web) {
       urls.push(...searchResponse.web.slice(0, 2).map(item => item.url));
    } else if (Array.isArray(searchResponse)) {
       urls.push(...searchResponse.slice(0, 2).map(item => item.url));
    }

    if (urls.length === 0) {
      console.log(`⚠️  No valid search results found for ${entityName}`);
      return null;
    }

    console.log(`Found candidate URLs:`, urls);
    
    let combinedMarkdown = '';
    for (const url of urls) {
      if (!url) continue;
      console.log(`📄 Scraping candidate: ${url}`);
      try {
        const scrapeResult = await firecrawl.scrape(url, {
          formats: ['markdown'],
          waitFor: 1000
        });

        const md = scrapeResult.markdown || (scrapeResult.data && scrapeResult.data.markdown) || '';
        if (md && typeof md === 'string') {
          console.log(`   Successfully got ${md.length} characters of markdown.`);
          combinedMarkdown += `\n\n--- Source: ${url} ---\n\n` + md.slice(0, 40000); 
        } else {
          console.log(`   Scrape returned empty markdown.`);
        }
      } catch (err) {
        console.log(`   Failed to scrape ${url}: ${err.message}`);
      }
    }

    if (!combinedMarkdown.trim()) return null;
    
    console.log(`🧠 Processing with strict AI criteria...`);
    const extractionResponse = await openai.chat.completions.create({
      model: 'gpt-4o', 
      messages: [
        {
          role: 'system',
          content: `You are an extremely strict data extraction tool.
CRITICAL ANTI-HALLUCINATION RULES:
1. ONLY extract a cost if you see the exact dollar amount explicitly written in the provided text.
2. DO NOT guess, DO NOT infer, and DO NOT output a number based on external knowledge.
3. If the document is older than 2024 with no indication it is active for 2025/2026, DO NOT extract.
4. Set missing data points to null.`
        },
        {
          role: 'user',
          content: `Here are the scraped materials for ${entityName}:\n\n${combinedMarkdown}`
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
              source_url_used: { type: ['string', 'null'] },
              notes: { type: 'string' }
            },
            required: ['bls_base', 'als_base', 'mileage', 'tnt_fee', 'source_url_used', 'notes'],
            additionalProperties: false
          },
          strict: true
        }
      },
      temperature: 0.0
    });

    const result = JSON.parse(extractionResponse.choices[0].message.content);
    console.log('✓ Strict Extraction Complete.');
    return result;
    
  } catch (error) {
    console.error(`Error processing ${entityName}:`, error.message);
    return null;
  }
}

async function runSecondaryPass() {
  const db = new Database(DB_PATH);
  
  // Find entities that are official but missing key data fields
  const missingDataEntities = db.prepare(`
    SELECT id, display_name, bls_base, als_base, mileage, tnt_fee 
    FROM pricing_entities 
    WHERE estimate_type = 'official' 
      AND (bls_base IS NULL OR mileage IS NULL OR tnt_fee IS NULL)
    LIMIT 20
  `).all();
  
  console.log(`Found ${missingDataEntities.length} entities needing secondary pass.`);
  
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
    const extraction = await searchAndExtract(entity.display_name);
    if (extraction) {
      extraction.id = entity.id;
      extraction.last_updated = new Date().toISOString().slice(0, 10);
      results.push(extraction);

      if (shouldIngest) {
        console.log(`💾 Ingesting results for ${entity.display_name}...`);
        extraction.source_url = extraction.source_url_used; // map to db column
        updateStmt.run(extraction);
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  
  db.close();
  await fs.writeFile(path.resolve(__dirname, '../data/secondary_pass_review.json'), JSON.stringify(results, null, 2));
  console.log(`\n--- Completed. Data in data/secondary_pass_review.json. Ingested: ${shouldIngest} ---`);
}

runSecondaryPass();
