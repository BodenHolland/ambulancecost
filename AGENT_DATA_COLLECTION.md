# Ambulance Cost Database — Agent Data Collection Instructions

You are being tasked with researching and populating ambulance pricing data for the AmbulanceCost project. You must work slowly and methodically. Accuracy is paramount — one correct, well-sourced entry is worth more than fifty guesses.

**Do not rush. Do not guess. Do not fabricate data or URLs.**

---

## PHASE 1: DATABASE AUDIT (Do this FIRST — before any research)

Before collecting any new data, you must evaluate what already exists in the database. This prevents duplicate work and ensures you understand the current state.

### Step 1.1 — Clone and set up

```bash
git clone https://github.com/BodenHolland/ambulancecost.git
cd ambulancecost
npm install
npm install better-sqlite3
```

If `zip_lookup.db` does not exist in the project root, export it from remote:

```bash
npx wrangler d1 export ambulance-db --output=zip_lookup_export.sql --remote
cat zip_lookup_export.sql | sqlite3 zip_lookup.db
```

### Step 1.2 — Assess current coverage

Run these queries and record the results before doing anything else:

```bash
# How many provider entities exist?
sqlite3 zip_lookup.db "SELECT COUNT(*) FROM pricing_entities WHERE estimate_type = 'official';"

# Which states have provider data?
sqlite3 zip_lookup.db "SELECT state, COUNT(*) as providers FROM pricing_entities WHERE estimate_type = 'official' AND state IS NOT NULL GROUP BY state ORDER BY providers DESC;"

# How many ZIP codes have direct mappings?
sqlite3 zip_lookup.db "SELECT COUNT(*) FROM zip_mappings;"

# How many 3-digit prefixes have mappings?
sqlite3 zip_lookup.db "SELECT COUNT(*) FROM prefix_mappings WHERE entity_id NOT LIKE '%average%';"

# What percentage of prefixes are covered?
sqlite3 zip_lookup.db "SELECT ROUND(COUNT(DISTINCT prefix) * 100.0 / 1000, 1) as coverage_pct FROM prefix_mappings;"
```

### Step 1.3 — Check if your target already exists

Before researching any city or provider, **always check the database first**:

```bash
# Check by city/provider name (partial match)
sqlite3 zip_lookup.db "SELECT id, display_name, bls_base, als_base, mileage, state, last_updated FROM pricing_entities WHERE display_name LIKE '%Beverly Hills%';"

# Check by ZIP code
sqlite3 zip_lookup.db "SELECT * FROM zip_mappings WHERE zip = '90210';"

# Check by prefix
sqlite3 zip_lookup.db "SELECT pm.prefix, pe.id, pe.display_name, pe.bls_base FROM prefix_mappings pm JOIN pricing_entities pe ON pm.entity_id = pe.id WHERE pm.prefix = '902';"

# Check by state
sqlite3 zip_lookup.db "SELECT id, display_name, bls_base, mileage, last_updated FROM pricing_entities WHERE state = 'CA' AND estimate_type = 'official';"
```

**If data already exists for your target:**
- Check the `last_updated` date. If it is from 2026 and has valid rates, **skip it**.
- If it exists but has NULL rates or is older than 2025, it may be worth updating.
- If updating, use `INSERT OR REPLACE` to overwrite, and document why in your commit message.

### Step 1.4 — Run validation

```bash
node scripts/validate_db.js
```

Review the output. Note any issues flagged (orphaned mappings, zero-value rates, missing metadata). If you fix any existing issues, that counts as valuable work too.

**Report your Phase 1 findings before proceeding to Phase 2.**

---

## PHASE 2: DATA RESEARCH

### Data Freshness Requirement

**Only use 2026 official fee schedules.** Most municipalities and providers publish updated fee schedules annually, effective January 1 or July 1.

- The `effective_date` of the rate schedule must be in **2025 or 2026**.
- If a provider's most recent published schedule is from 2024 or earlier, **do not add it**. It is stale.
- If you find a 2025 schedule and cannot find a 2026 update, the 2025 data is acceptable but note this in the `notes` field.

### What to collect

For each ambulance provider, collect **two separate categories of data** which may come from **different sources**:

#### Category A: Transport Rates (BLS / ALS / Mileage)

| Field | HCPCS Code | Description |
|-------|-----------|-------------|
| `bls_base` | A0429 | BLS Emergency base rate (per trip) |
| `als_base` | A0427 | ALS Emergency base rate (per trip) |
| `mileage` | A0425 | Per loaded mile charge |

These rates are stored alongside `source_url` — the URL where you found the transport rate data.

#### Category B: Treat No Transport (TNT) Fee

| Field | Description |
|-------|-------------|
| `tnt_fee` | Fee charged when ambulance responds but does not transport the patient |
| `tnt_description` | Brief description of the TNT policy |

TNT data is stored alongside `tnt_source_url` — the URL where you found the TNT fee data. **This may be a different URL than the transport rates.** Many providers publish transport rates and TNT fees in different documents or on different pages.

If both happen to come from the same URL, set both `source_url` and `tnt_source_url` to the same value. Do not leave `tnt_source_url` as NULL if you are providing a `tnt_fee`.

### Rate terminology mapping

Providers use inconsistent names. Here's how to map them:

| They call it | We store it as |
|---|---|
| BLS Emergency, BLS Base Rate, Basic Life Support, BLS-E | `bls_base` |
| ALS Emergency, ALS-1, ALS Base Rate, Advanced Life Support, ALS-E | `als_base` |
| Mileage, Per Mile, Loaded Mile, Transport Mileage, Per Loaded Mile | `mileage` |
| Treat No Transport, TNT, Treatment Without Transport, Response Fee (no transport), Non-Transport Response, Assessment Only | `tnt_fee` |

### What NOT to include

- Non-emergency or scheduled transport rates (we only track emergency)
- Air ambulance rates
- Rates you calculated, estimated, or inferred — only explicitly published provider rates
- Data from fee schedules dated before 2025
- URLs you have not personally verified load and contain the cited data

### Where to find data

#### Tier 1: City/County Government Fee Schedules (Most reliable)
- City government websites → Finance/Revenue department → Fee schedules
- County EMS district websites → Billing/Rates pages
- Municipal fire department websites → Ambulance billing pages
- Search: `"{city name}" ambulance fee schedule 2026`
- Search: `"{city name}" fire department ambulance rates 2026`
- Search: `site:*.gov ambulance fee schedule {state}`

#### Tier 2: State Open Data Portals
- Most states publish data at `data.{state}.gov`
- Search: `site:data.{state abbreviation}.gov ambulance`
- Examples: `data.texas.gov`, `data.wa.gov`, `data.ca.gov`, `data.ny.gov`

#### Tier 3: State EMS Regulatory Agencies
- Many states regulate and publish approved ambulance rate maximums
- Search: `"{state}" EMS rate schedule 2026` or `"{state}" ambulance maximum allowable rate`
- State health departments often oversee EMS licensing

#### Tier 4: Public Records / Budget Documents
- City council meeting minutes often contain ambulance fee approvals
- Search: `"{city}" council ambulance fee approval 2026`

**Do not use news articles as a primary source.** If a news article cites rates, find the original government document it references.

---

## PHASE 3: DATA ENTRY

Only proceed here after completing Phase 1 (audit) and Phase 2 (research).

### Database Schema

#### `pricing_entities` — The provider/rate record

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | TEXT PK | Yes | Unique slug: `{slugified_name}_{state}` |
| `display_name` | TEXT | Yes | Human-readable provider name |
| `bls_base` | REAL | — | BLS base rate. **NULL if unknown. NEVER 0.** |
| `als_base` | REAL | — | ALS base rate. **NULL if unknown. NEVER 0.** |
| `mileage` | REAL | — | Per-mile rate. **NULL if unknown. NEVER 0.** |
| `tnt_fee` | REAL | — | TNT fee. **NULL if not applicable. NEVER 0.** |
| `tnt_description` | TEXT | — | Brief TNT policy description |
| `source_url` | TEXT | Yes | URL for transport rate data (BLS/ALS/mileage) |
| `tnt_source_url` | TEXT | — | URL for TNT fee data (may differ from source_url). Required if tnt_fee is set. |
| `last_updated` | TEXT | Yes | Date you added/updated this record (YYYY-MM-DD) |
| `estimate_type` | TEXT | Yes | Must be `'official'` for real provider data |
| `source_label` | TEXT | — | Short label (e.g., "City of Denver Fee Schedule FY2026") |
| `effective_date` | TEXT | — | When the rate schedule took effect (YYYY-MM-DD) |
| `last_verified` | TEXT | Yes | Date you verified the source URL is live and accurate (YYYY-MM-DD) |
| `notes` | TEXT | — | Only if something unusual. Otherwise NULL. |
| `state` | TEXT | Yes | Two-letter state code |

#### `zip_mappings` — Specific ZIP → provider

| Column | Type | Description |
|--------|------|-------------|
| `zip` | TEXT PK | 5-digit ZIP code |
| `entity_id` | TEXT FK | References `pricing_entities.id` |

Use when a provider serves specific known ZIP codes.

#### `prefix_mappings` — Regional prefix → provider

| Column | Type | Description |
|--------|------|-------------|
| `prefix` | TEXT PK | 3-digit ZIP prefix |
| `entity_id` | TEXT FK | References `pricing_entities.id` |

Use when a provider covers a broad region. **Only map a prefix if no more-specific provider already covers it.** Check first:

```bash
sqlite3 zip_lookup.db "SELECT * FROM prefix_mappings WHERE prefix = 'XXX';"
```

### Fallback chain (for your understanding — do not manually create averages)

1. Exact ZIP match (`zip_mappings`) — highest priority
2. 3-digit prefix match (`prefix_mappings`)
3. Statewide average — auto-computed, do not create manually
4. National average — auto-computed, do not create manually

### Entity ID naming convention

Format: `{slugified_provider_name}_{two_letter_state}`

- Lowercase only
- Underscores for spaces
- Remove special characters (parentheses, slashes, ampersands, hashes)
- Always end with the two-letter state code
- Keep it readable

Examples:
- `beverly_hills_fire_dept_ca`
- `miami_dade_fire_rescue_fl`
- `chicago_fire_dept_il`
- `denver_health_paramedics_co`

### How to insert data

#### Method A: Add to JSON files + run migration (preferred for small additions)

**Transport rates** → `data/verified_market_rates.json`:

```json
{
  "zip_prefix": "902",
  "city": "Beverly Hills Fire Department",
  "bls_base": 2450.00,
  "als_base": 2800.00,
  "mileage": 65.00,
  "source_url": "https://www.beverlyhills.org/cbhfiles/storage/files/...",
  "verified_date": "2026-03-19"
}
```

Notes on this format:
- Use `null` (not `0`) for any rate you don't have
- `als_base` can be `null` if only BLS is published

**TNT fees** → `data/verified_tnt_rates.json`:

```json
{
  "city": "Beverly Hills",
  "state": "CA",
  "zipUnits": ["90210", "90211", "90212"],
  "tntFee": 350.00,
  "description": "Beverly Hills FD charges a response fee when no transport occurs.",
  "sourceUrl": "https://www.beverlyhills.org/...",
  "isVerified": true,
  "lastUpdated": "2026-03-19"
}
```

Then run the full pipeline:
```bash
node migrate_v2.js
node scripts/fix_zero_values.js
node scripts/fix_entity_metadata.js
node scripts/compute_averages.js
```

#### Method B: Direct SQL (preferred for bulk or scripted additions)

```sql
-- 1. Insert the provider entity
INSERT OR REPLACE INTO pricing_entities
  (id, display_name, bls_base, als_base, mileage,
   tnt_fee, tnt_description,
   source_url, tnt_source_url,
   last_updated, estimate_type, source_label,
   effective_date, last_verified, state)
VALUES
  ('beverly_hills_fire_dept_ca',
   'Beverly Hills Fire Department',
   2450.00,    -- bls_base (NULL if unknown, NEVER 0)
   2800.00,    -- als_base (NULL if unknown, NEVER 0)
   65.00,      -- mileage  (NULL if unknown, NEVER 0)
   NULL,       -- tnt_fee  (NULL if not applicable, NEVER 0)
   NULL,       -- tnt_description
   'https://www.beverlyhills.org/cbhfiles/storage/files/transport-rates.pdf',
   NULL,       -- tnt_source_url (NULL when no TNT fee; set to URL if tnt_fee is provided)
   '2026-03-19',
   'official',
   'Beverly Hills FD Fee Schedule FY2026',
   '2026-01-01',
   '2026-03-19',
   'CA');

-- 2. Map specific ZIP codes this provider serves
INSERT OR REPLACE INTO zip_mappings (zip, entity_id) VALUES ('90210', 'beverly_hills_fire_dept_ca');
INSERT OR REPLACE INTO zip_mappings (zip, entity_id) VALUES ('90211', 'beverly_hills_fire_dept_ca');
INSERT OR REPLACE INTO zip_mappings (zip, entity_id) VALUES ('90212', 'beverly_hills_fire_dept_ca');

-- 3. ONLY map prefix if no other provider already covers it
-- Check first: SELECT * FROM prefix_mappings WHERE prefix = '902';
-- If empty:
INSERT OR IGNORE INTO prefix_mappings (prefix, entity_id) VALUES ('902', 'beverly_hills_fire_dept_ca');
```

Execute locally:
```bash
sqlite3 zip_lookup.db < your_inserts.sql
```

Push to production:
```bash
npx wrangler d1 execute ambulance-db --remote --file=your_inserts.sql
```

---

## PHASE 4: VALIDATION (Do this AFTER every data entry)

### Step 4.1 — Run automated validation

```bash
node scripts/validate_db.js
```

Review the output for any new issues introduced by your changes.

### Step 4.2 — Verify your entries manually

For every entity you added, run:

```bash
# Verify the entity exists with correct data
sqlite3 zip_lookup.db "SELECT id, display_name, bls_base, als_base, mileage, tnt_fee, source_url, tnt_source_url, state, effective_date FROM pricing_entities WHERE id = 'your_entity_id';"

# Verify ZIP mappings point to the right entity
sqlite3 zip_lookup.db "SELECT z.zip, p.display_name FROM zip_mappings z JOIN pricing_entities p ON z.entity_id = p.id WHERE z.zip IN ('90210', '90211');"

# Verify prefix mapping (if you added one)
sqlite3 zip_lookup.db "SELECT pm.prefix, pe.display_name FROM prefix_mappings pm JOIN pricing_entities pe ON pm.entity_id = pe.id WHERE pm.prefix = '902';"
```

### Step 4.3 — Verify no zeros exist

```bash
sqlite3 zip_lookup.db "SELECT id, bls_base, als_base, mileage, tnt_fee FROM pricing_entities WHERE bls_base = 0 OR als_base = 0 OR mileage = 0 OR tnt_fee = 0;"
```

This must return zero rows. If it returns anything, fix it: change 0 → NULL.

### Step 4.4 — Test the API (if local server is running)

```bash
curl -s "http://localhost:3000/api/lookup?zip=90210" | python3 -m json.tool
```

Confirm:
- `city` shows the correct city name
- `verified_market` is not null and contains your rates
- `entity_info.match_level` is `zip` or `prefix` (not `national_average`)

---

## PHASE 5: COMMIT AND PUSH

```bash
git checkout -b data/{short-description}
git add data/verified_market_rates.json data/verified_tnt_rates.json
git add scripts/  # if you created any new scripts
# Do NOT add zip_lookup.db — it is gitignored
git commit -m "Add {provider name} ambulance rates ({state})"
git push -u origin data/{short-description}
```

---

## HARD RULES — Violations make your work unusable

1. **NEVER use 0 for unknown values.** Use NULL. Zero means "this service is free" and will display $0 to users.
2. **NEVER fabricate a source URL.** Every rate must link to a real, loadable page or PDF that contains the cited number.
3. **NEVER add data from fee schedules dated before 2025.** Only 2025 or 2026 schedules are acceptable.
4. **NEVER estimate or calculate rates.** Only use rates explicitly published by the provider.
5. **NEVER skip Phase 1.** Always audit the database before adding data to avoid duplicates or overwrites.
6. **NEVER create statewide_average or national_average entities.** Those are auto-computed by `compute_averages.js`.
7. **ALWAYS provide `source_url` for transport rates.** No exceptions.
8. **ALWAYS provide `tnt_source_url` when providing `tnt_fee`.** Even if it's the same URL as `source_url`.
9. **ALWAYS check if a prefix mapping already exists** before adding one. Use `INSERT OR IGNORE`, not `INSERT OR REPLACE`, for prefix_mappings.
10. **ALWAYS run Phase 4 validation** after every batch of changes.
