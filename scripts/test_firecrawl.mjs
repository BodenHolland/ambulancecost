import FirecrawlApp from '@mendable/firecrawl-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config({ path: '.env.local' });

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Target URLs for the 6 control cities
const TARGET_URLS = [
  'http://sf-fire.org/services/ambulance-billing', // San Francisco
  'https://www.nyc.gov/assets/fdny/downloads/pdf/about/fee-schedule-ambulance.pdf', // NYC
  'https://www.houstontx.gov/council/committees/pshs/20180712/hfd-billing-ordinance.pdf', // Houston
  'https://lafd.org/sites/default/files/pdf_files/Admin%20Code%20-%20Ambulance%20Reimubursement.pdf', // LA
  'https://www.chicago.gov/city/en/depts/fin/supp_info/revenue/ambulance_bills.html', // Chicago
  'https://www.smchealth.org/ems' // San Mateo
];

async function processUrl(targetUrl) {
  console.log(`\n--- Processing: ${targetUrl} ---`);
  
  try {
    // 1. Scrape the targeted URL (PDF or HTML) directly
    console.log(`1. Scraping URL with Firecrawl...`);
    const scrapeResult = await firecrawl.scrape(targetUrl, {
      formats: ['markdown'],
      onlyMainContent: true, 
      waitFor: 2000 
    });

    const markdown = scrapeResult.markdown;
    if (!markdown) throw new Error("No markdown returned from scrape.");
    console.log(`✓ Scraped successfully. Markdown length: ${markdown.length} characters.`);
    
    // 2. Extract with OpenAI
    console.log('2. Requesting extraction from OpenAI...');
    const extractionResponse = await openai.chat.completions.create({
      model: 'gpt-4o', 
      messages: [
        {
          role: 'system',
          content: `You operate as a precision data extraction tool. You will be given the markdown text of an EMS/Ambulance billing page or PDF. 
          
Your GOAL: Extract the base Treatment cost WITHOUT transport for both Basic Life Support (BLS) and Advanced Life Support (ALS), as well as the base transport rates (BLS Base, ALS Base, and Mileage).

RULES:
1. We DO care about transport costs (BLS Base, ALS Base, and Mileage per mile).
2. For treatment without transport, look for keywords like "Assessment Non-Transport", "Treat and Release", "First Responder Fee", "Dry Run", "Treatment in Place", or "Treatment without transport".
3. If the text explicitly states "No charge if not transported", set the non-transport cost to 0.
4. If a specific data point is simply not found on the page, set its value to null.`
        },
        {
          role: 'user',
          content: `Here is the website markdown:\n\n${markdown}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ems_billing_data',
          schema: {
            type: 'object',
            properties: {
              municipality: {
                type: 'string',
                description: 'The name of the city/department'
              },
              bls_base: {
                type: ['number', 'null'],
                description: 'The base transport flat rate for Basic Life Support (BLS) emergency response. Use null if not found.'
              },
              als_base: {
                type: ['number', 'null'],
                description: 'The base transport flat rate for Advanced Life Support (ALS) emergency response. Use null if not found.'
              },
              mileage: {
                type: ['number', 'null'],
                description: 'The cost per mile for ambulance transport. Use null if not found.'
              },
              bls_treatment_no_transport_cost: {
                type: ['number', 'null'],
                description: 'Cost for BLS treatment without transport. Use null if not found.'
              },
              als_treatment_no_transport_cost: {
                type: ['number', 'null'],
                description: 'Cost for ALS treatment without transport. Use null if not found.'
              },
              notes: {
                type: 'string',
                description: 'Explanation or caveats.'
              }
            },
            required: ['municipality', 'bls_base', 'als_base', 'mileage', 'bls_treatment_no_transport_cost', 'als_treatment_no_transport_cost', 'notes'],
            additionalProperties: false
          },
          strict: true
        }
      },
      temperature: 0.1
    });

    const result = JSON.parse(extractionResponse.choices[0].message.content);
    // Attach source URL
    result.source_url = targetUrl;

    console.log('✓ Extraction Complete. Result:');
    console.log(JSON.stringify(result, null, 2));
    return result;
    
  } catch (error) {
    console.error(`Error processing ${targetUrl}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('Starting Precision EMS Extraction...');
  const resultsData = [];
  
  for (const url of TARGET_URLS) {
    const data = await processUrl(url);
    if (data) resultsData.push(data);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  await fs.writeFile('data/firecrawl_extracted_rates.json', JSON.stringify(resultsData, null, 2));
  console.log(`\n--- Test Completed. Saved ${resultsData.length} records. ---`);
}

main();
