import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
async function run() {
  try {
    const q1 = await firecrawl.search("NYC FDNY ambulance fee schedule filetype:pdf");
    console.log("NYC:", q1.web[0]?.url);
    
    const q2 = await firecrawl.search("Los Angeles LAFD ambulance transport fee schedule filetype:pdf");
    console.log("LA:", q2.web[0]?.url);

    const q3 = await firecrawl.search("City of Chicago ambulance bills AND fees site:chicago.gov");
    console.log("Chicago:", q3.web[0]?.url);

    const q4 = await firecrawl.search("Houston City Ordinance emergency medical services fee schedule site:houstontx.gov");
    console.log("Houston:", q4.web[0]?.url);

    const q5 = await firecrawl.search("Phoenix Fire Department ambulance rates site:phoenix.gov");
    console.log("Phoenix:", q5.web[0]?.url);
  } catch (err) {
    console.error(err.message);
  }
}
run();
