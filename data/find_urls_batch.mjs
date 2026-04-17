import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const QUERIES = [
  { city: "Philadelphia", q: "Philadelphia Fire Department ambulance fee schedule pdf site:phila.gov" },
  { city: "San Antonio", q: "San Antonio Fire Department EMS billing rates filetype:pdf site:sa.gov" },
  { city: "San Diego", q: "San Diego Fire-Rescue Department ambulance fee schedule site:sandiego.gov" },
  { city: "Dallas", q: "Dallas Fire-Rescue ambulance billing ordinance pdf site:dallascityhall.com" },
  { city: "San Jose", q: "San Jose Fire Department ambulance fee schedule site:sanjoseca.gov" },
  { city: "Austin", q: "Austin Travis County EMS fee schedule site:austintexas.gov" },
  { city: "Jacksonville", q: "Jacksonville Fire and Rescue Department EMS fee schedule site:jacksonville.gov" },
  { city: "Fort Worth", q: "MedStar Mobile Healthcare Fort Worth ambulance billing rates fee schedule pdf" },
  { city: "Columbus", q: "Columbus Division of Fire EMS billing rates site:columbus.gov" },
  { city: "Charlotte", q: "Charlotte MEDIC ambulance fees fee schedule pdf site:medic911.com" },
  { city: "San Francisco", q: "San Francisco Fire Department ambulance rates site:sf-fire.org" },
  { city: "Indianapolis", q: "Indianapolis EMS ambulance billing rates site:indy.gov" },
  { city: "Seattle", q: "Seattle Fire Department ambulance fee schedule pdf site:seattle.gov" },
  { city: "Denver", q: "Denver Health Paramedic Division ambulance billing rates site:denvergov.org" },
  { city: "Washington DC", q: "DC Fire and EMS Department ambulance fee schedule site:dc.gov" }
];

async function run() {
  console.log("Starting batch URL discovery...");
  
  for (const item of QUERIES) {
    try {
      const response = await firecrawl.search(item.q);
      const url = response.web[0]?.url || "NOT_FOUND";
      console.log(`${item.city}: ${url}`);
    } catch (err) {
      console.log(`${item.city}: ERROR - ${err.message}`);
    }
    // Small delay to prevent rate limits
    await new Promise(res => setTimeout(res, 1000));
  }
}

run();
