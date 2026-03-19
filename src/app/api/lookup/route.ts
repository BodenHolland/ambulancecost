import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'edge';

// Robust fallback: Zip Code prefix → State
const ZIP_STATE_PREFIXES: Record<string, { state: string; name: string }> = {
  '01': { state: 'MA', name: 'Massachusetts' }, '02': { state: 'MA', name: 'Massachusetts' },
  '03': { state: 'NH', name: 'New Hampshire' }, '04': { state: 'ME', name: 'Maine' },
  '05': { state: 'VT', name: 'Vermont' },       '06': { state: 'CT', name: 'Connecticut' },
  '07': { state: 'NJ', name: 'New Jersey' },    '08': { state: 'NJ', name: 'New Jersey' },
  '09': { state: 'NY', name: 'New York' },      '10': { state: 'NY', name: 'New York' },
  '11': { state: 'NY', name: 'New York' },      '12': { state: 'NY', name: 'New York' },
  '13': { state: 'NY', name: 'New York' },      '14': { state: 'NY', name: 'New York' },
  '15': { state: 'PA', name: 'Pennsylvania' },  '16': { state: 'PA', name: 'Pennsylvania' },
  '17': { state: 'PA', name: 'Pennsylvania' },  '18': { state: 'PA', name: 'Pennsylvania' },
  '19': { state: 'PA', name: 'Pennsylvania' },
  '20': { state: 'DC', name: 'Washington DC' }, '21': { state: 'MD', name: 'Maryland' },
  '22': { state: 'VA', name: 'Virginia' },      '23': { state: 'VA', name: 'Virginia' },
  '24': { state: 'VA', name: 'Virginia' },      '25': { state: 'WV', name: 'West Virginia' },
  '26': { state: 'WV', name: 'West Virginia' }, '27': { state: 'NC', name: 'North Carolina' },
  '28': { state: 'NC', name: 'North Carolina' },'29': { state: 'SC', name: 'South Carolina' },
  '30': { state: 'GA', name: 'Georgia' },       '31': { state: 'GA', name: 'Georgia' },
  '32': { state: 'FL', name: 'Florida' },       '33': { state: 'FL', name: 'Florida' },
  '34': { state: 'FL', name: 'Florida' },
  '35': { state: 'AL', name: 'Alabama' },       '36': { state: 'AL', name: 'Alabama' },
  '37': { state: 'TN', name: 'Tennessee' },     '38': { state: 'TN', name: 'Tennessee' },
  '39': { state: 'MS', name: 'Mississippi' },
  '40': { state: 'KY', name: 'Kentucky' },      '41': { state: 'KY', name: 'Kentucky' },
  '42': { state: 'KY', name: 'Kentucky' },
  '43': { state: 'OH', name: 'Ohio' },          '44': { state: 'OH', name: 'Ohio' },
  '45': { state: 'OH', name: 'Ohio' },
  '46': { state: 'IN', name: 'Indiana' },       '47': { state: 'IN', name: 'Indiana' },
  '48': { state: 'MI', name: 'Michigan' },      '49': { state: 'MI', name: 'Michigan' },
  '50': { state: 'IA', name: 'Iowa' },          '51': { state: 'IA', name: 'Iowa' },
  '52': { state: 'IA', name: 'Iowa' },
  '53': { state: 'WI', name: 'Wisconsin' },     '54': { state: 'WI', name: 'Wisconsin' },
  '55': { state: 'MN', name: 'Minnesota' },     '56': { state: 'MN', name: 'Minnesota' },
  '57': { state: 'SD', name: 'South Dakota' },  '58': { state: 'ND', name: 'North Dakota' },
  '59': { state: 'MT', name: 'Montana' },
  '60': { state: 'IL', name: 'Illinois' },      '61': { state: 'IL', name: 'Illinois' },
  '62': { state: 'IL', name: 'Illinois' },
  '63': { state: 'MO', name: 'Missouri' },      '64': { state: 'MO', name: 'Missouri' },
  '65': { state: 'MO', name: 'Missouri' },
  '66': { state: 'KS', name: 'Kansas' },        '67': { state: 'KS', name: 'Kansas' },
  '68': { state: 'NE', name: 'Nebraska' },      '69': { state: 'NE', name: 'Nebraska' },
  '70': { state: 'LA', name: 'Louisiana' },     '71': { state: 'LA', name: 'Louisiana' },
  '72': { state: 'AR', name: 'Arkansas' },
  '73': { state: 'OK', name: 'Oklahoma' },      '74': { state: 'OK', name: 'Oklahoma' },
  '75': { state: 'TX', name: 'Texas' },         '76': { state: 'TX', name: 'Texas' },
  '77': { state: 'TX', name: 'Texas' },         '78': { state: 'TX', name: 'Texas' },
  '79': { state: 'TX', name: 'Texas' },
  '80': { state: 'CO', name: 'Colorado' },      '81': { state: 'CO', name: 'Colorado' },
  '82': { state: 'WY', name: 'Wyoming' },       '83': { state: 'ID', name: 'Idaho' },
  '84': { state: 'UT', name: 'Utah' },
  '85': { state: 'AZ', name: 'Arizona' },       '86': { state: 'AZ', name: 'Arizona' },
  '87': { state: 'NM', name: 'New Mexico' },    '88': { state: 'NM', name: 'New Mexico' },
  '89': { state: 'NV', name: 'Nevada' },
  '90': { state: 'CA', name: 'California' },    '91': { state: 'CA', name: 'California' },
  '92': { state: 'CA', name: 'California' },    '93': { state: 'CA', name: 'California' },
  '94': { state: 'CA', name: 'California' },    '95': { state: 'CA', name: 'California' },
  '96': { state: 'HI', name: 'Hawaii' },
  '97': { state: 'OR', name: 'Oregon' },        '98': { state: 'WA', name: 'Washington' },
  '99': { state: 'AK', name: 'Alaska' },
};

const PROTECTED_STATES = [
  'AR','CA','CO','CT','DE','FL','IL','IN','LA','ME','MD','MS',
  'MN','NH','NY','OH','OK','OR','TX','UT','WA','WV'
];

interface ZipRow {
  zip: string; city: string | null; state: string;
  type: string; is_protected: number; contractor: string; locality: string;
}
interface AfsRow {
  gpci: number; urban_rate: number | null; rural_rate: number | null; super_rural_rate: number | null;
  hcpcs: string;
}export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get('zip');

  if (!zip || zip.length < 5) {
    return NextResponse.json({ error: 'Zip code is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const zipRow = await db.getZipData(zip) as ZipRow | undefined;
    const unified = await db.getUnifiedPricing(zip);

    let cityName: string | null = zipRow?.city ?? null;

    // OpenStreetMap Fallback: If DB is empty, try to resolve from a map service
    if (zipRow && !cityName) {
      cityName = await resolveCityFromZip(zip);
    }

    if (zipRow) {
      const afsRows = await db.getAfsRates(zipRow.contractor, zipRow.locality) as AfsRow[];

      const byHcpcs: Record<string, AfsRow> = {};
      for (const r of afsRows) byHcpcs[r.hcpcs] = r;

      const bls     = byHcpcs['A0429'];
      const als     = byHcpcs['A0427'];
      const mileage = byHcpcs['A0425'];

      if (!cityName) {
        cityName = await resolveCityFromZip(zip);
      }

      return NextResponse.json({
        zip,
        city:         cityName ?? 'Detected Locality',
        state:        zipRow.state,
        type:         zipRow.type,
        is_protected: zipRow.is_protected,
        contractor:   zipRow.contractor,
        locality:     zipRow.locality,
        gpci:         bls?.gpci ?? als?.gpci ?? 1.0,
        verified_tnt: unified?.verified_tnt || null,
        verified_market: unified?.verified_market || null,
        entity_info: unified ? { 
          id: unified.id, 
          name: unified.display_name,
          estimate_type: unified.estimate_type,
          match_level: unified.match_level,
          source_label: unified.source_label,
          effective_date: unified.effective_date,
          notes: unified.notes,
          last_verified: unified.last_verified || unified.effective_date || unified.last_updated
        } : null,
        rates: {
          bls_urban:       bls?.urban_rate       ?? null,
          bls_rural:       bls?.rural_rate       ?? null,
          bls_super_rural: bls?.super_rural_rate ?? null,
          als_urban:       als?.urban_rate       ?? null,
          als_rural:       als?.rural_rate       ?? null,
          als_super_rural: als?.super_rural_rate ?? null,
          mileage_urban:   mileage?.urban_rate   ?? null,
          mileage_rural:   mileage?.rural_rate   ?? null,
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // ── Fallback ──
    const prefix = zip.substring(0, 2);
    const locationInfo = (ZIP_STATE_PREFIXES as any)[prefix];
    
    // Always try to resolve city if missing
    let finalCity = cityName;
    if (!finalCity) {
      finalCity = await resolveCityFromZip(zip);
    }

    if (locationInfo || unified || finalCity) {
      return NextResponse.json({
        zip,
        city:         unified?.display_name ?? finalCity ?? 'Detected Locality',
        state:        locationInfo?.state ?? '',
        type:         'urban',
        is_protected: locationInfo ? (PROTECTED_STATES.includes(locationInfo.state) ? 1 : 0) : 0,
        contractor:   null,
        locality:     null,
        gpci:         null,
        verified_tnt: unified?.verified_tnt || null,
        verified_market: unified?.verified_market || null,
        entity_info: unified ? { 
          id: unified.id, 
          name: unified.display_name,
          estimate_type: unified.estimate_type,
          match_level: unified.match_level,
          source_label: unified.source_label,
          effective_date: unified.effective_date,
          notes: unified.notes,
          last_verified: unified.last_verified || unified.effective_date || unified.last_updated
        } : null,
        rates:        null,
      });
    }

    return NextResponse.json({
      zip, 
      city: finalCity ?? 'Unknown Locality', 
      state: locationInfo?.state ?? 'US', 
      type: 'urban',
      is_protected: 0, 
      contractor: null, 
      locality: null, 
      gpci: null, 
      rates: null,
    });

  } catch (error: any) {
    console.error('Lookup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    }, { status: 500 });
  }
}

async function resolveCityFromZip(zip: string): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=USA&format=json&addressdetails=1&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AmbulanceCostApp/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.length > 0 && data[0].address) {
      const a = data[0].address;
      return a.city || a.town || a.village || a.municipality || a.county || null;
    }
  } catch (err: any) { 
    console.error('OSM Fetch Error:', err.message);
  }
  return null;
}

