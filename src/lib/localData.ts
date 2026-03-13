export interface LocalFeeData {
  city: string;
  state: string;
  tntFee: number | string; // Amount or "Varies"
  description?: string;
  sourceUrl?: string;
  isVerified: boolean;
}

export const LOCAL_TNT_FEES: Record<string, LocalFeeData> = {
  "san francisco": {
    city: "San Francisco",
    state: "CA",
    tntFee: 568.00,
    description: "SFFD charges a 'Treatment without Transportation' fee for all medical assessments that don't result in transport.",
    sourceUrl: "https://sf-fire.org/services/ambulance-billing",
    isVerified: true
  },
  "new york": {
    city: "New York",
    state: "NY",
    tntFee: 630.00,
    description: "FDNY charges for 'Facilitation of Treatment in Place' (BLS rate). ALS treatment in place is $1,050.",
    sourceUrl: "https://www.nyc.gov/site/fdny/about/department-information/ambulance-charges.page",
    isVerified: true
  },
  "houston": {
    city: "Houston",
    state: "TX",
    tntFee: 201.28,
    description: "City-Wide Fee Schedule lists 'Treatment without transport' as a billable response fee.",
    sourceUrl: "https://www.houstontx.gov/finance/2026-city-wide-fee-schedule.pdf",
    isVerified: true
  },
  "los angeles": {
    city: "Los Angeles",
    state: "CA",
    tntFee: 50.00,
    description: "LA County maximum allowable rate for 'Response and treatment, no transport'.",
    sourceUrl: "https://lafd.org/about/ambulance-transportation-policies",
    isVerified: true
  },
  "chicago": {
    city: "Chicago",
    state: "IL",
    tntFee: "Up to $1,000",
    description: "Recent 2025 proposals recommended cost recovery for 'Treat-No-Transport' (TNT) services.",
    sourceUrl: "https://www.chicago.gov/city/en/depts/fin/supp_info/revenue/ambulance_bills.html",
    isVerified: true
  }
};

export function getLocalTNTData(city: string): LocalFeeData | null {
  const normalized = city.toLowerCase().trim();
  return LOCAL_TNT_FEES[normalized] || null;
}
