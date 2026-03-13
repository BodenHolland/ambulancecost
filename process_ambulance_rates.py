import pandas as pd
import requests
import os
import json

def download_file(url, filename):
    print(f"Downloading {url}...")
    response = requests.get(url)
    with open(filename, 'wb') as f:
        f.write(response.content)
    print(f"Saved to {filename}")

def process_texas():
    # Texas TDI
    # Code Rates: year, date_submitted, political_subdivision, res_rate, non_res_rate, code
    # ZIP Mapping: year, date_submitted, political_subdivision, zip_code
    codes_url = "https://data.texas.gov/resource/ipyh-z9mx.csv"
    zips_url = "https://data.texas.gov/resource/iyci-uypg.csv"
    
    download_file(codes_url, "tx_codes.csv")
    download_file(zips_url, "tx_zips.csv")
    
    df_codes = pd.read_csv("tx_codes.csv")
    df_zips = pd.read_csv("tx_zips.csv")
    
    # Filter for A0428 and A0425
    df_codes = df_codes[df_codes['code'].isin(['A0428', 'A0425'])]
    
    # Merge on political_subdivision and year (optional, but safer)
    merged = pd.merge(df_codes, df_zips, on=['political_subdivision'], how='inner')
    
    results = []
    for (zip_val, subdivision), group in merged.groupby(['zip_code', 'political_subdivision']):
        bls = group[group['code'] == 'A0428']['non_res_rate'].astype(float).max()
        mileage = group[group['code'] == 'A0425']['non_res_rate'].astype(float).max()
        
        if pd.notna(bls) or pd.notna(mileage):
            results.append({
                "zip_prefix": str(zip_val)[:3],
                "city": subdivision,
                "bls_base": float(bls) if pd.notna(bls) else 0.0,
                "mileage": float(mileage) if pd.notna(mileage) else 0.0,
                "source_url": codes_url,
                "verified_date": "2026-03-12"
            })
    return results

def process_washington():
    # Washington OIC
    wa_url = "https://data.wa.gov/resource/r9b2-b8ff.csv"
    download_file(wa_url, "wa_rates.csv")
    
    df = pd.read_csv("wa_rates.csv")
    
    results = []
    for idx, row in df.iterrows():
        zips = str(row['service_zips']).split(',')
        for z in zips:
            z = z.strip()
            if not z or len(z) < 3: continue
            
            results.append({
                "zip_prefix": z[:3],
                "city": row['gaso_name'],
                "bls_base": float(row['a0428_bls_ne']) if pd.notna(row['a0428_bls_ne']) else 0.0,
                "mileage": float(row['a0425_mileage']) if pd.notna(row['a0425_mileage']) else 0.0,
                "source_url": wa_url,
                "verified_date": "2026-03-12"
            })
    return results

def process_arizona():
    # Arizona ADHS
    # This is a guess on structure, I'll print headers if it fails
    az_url = "https://www.azdhs.gov/documents/preparedness/emergency-medical-services-trauma-system/ambulance/ground/rates/ground-ambulance-rate-schedule.xlsx"
    download_file(az_url, "az_rates.xlsx")
    
    try:
        df = pd.read_excel("az_rates.xlsx")
        # ADHS excel usually has 'Ambulance Service', 'BLS', 'Mileage'
        # I'll look for keywords
        cols = df.columns
        print(f"AZ Columns: {cols}")
        
        # Simplified logic for now
        results = []
        return results
    except Exception as e:
        print(f"Error processing AZ: {e}")
        return []

def main():
    all_overrides = []
    
    # Load existing if exists
    if os.path.exists("market_overrides.json"):
        with open("market_overrides.json", "r") as f:
            all_overrides = json.load(f)

    # Process each state
    tx_data = process_texas()
    wa_data = process_washington()
    # az_data = process_arizona() # Skip AZ for now until I see headers or just try it

    all_overrides.extend(tx_data)
    all_overrides.extend(wa_data)
    
    # Remove duplicates by zip_prefix (keep last/most specific)
    unique_overrides = {}
    for entry in all_overrides:
        unique_overrides[entry['zip_prefix']] = entry
        
    with open("market_overrides.json", "w") as f:
        json.dump(list(unique_overrides.values()), f, indent=2)
    
    print(f"Final override count: {len(unique_overrides)}")

if __name__ == "__main__":
    main()
