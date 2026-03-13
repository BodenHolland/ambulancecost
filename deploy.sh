#!/bin/bash
set -e

echo "🚀 Starting Cloudflare Deployment for Ambulancecost.com"

# 1. Ensure D1 database exists
echo "📦 Checking D1 database..."
if ! npx wrangler d1 list | grep -q "ambulance-db"; then
  echo "📦 Creating D1 database..."
  npx wrangler d1 create ambulance-db
fi

# Get DB ID
DB_ID=$(npx wrangler d1 info ambulance-db --json | grep -o '"uuid": "[^"]*' | head -n 1 | cut -d'"' -f4)

if [ -z "$DB_ID" ]; then
  DB_ID=$(npx wrangler d1 info ambulance-db --json | sed -n 's/.*"database_id": *"\([^"]*\)".*/\1/p')
fi

echo "✅ D1 Database ID: $DB_ID"

# 2. Seed the database if table doesn't exist
echo "🌱 Checking/Seeding database..."
if ! npx wrangler d1 execute ambulance-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name='afs_rates';" --remote | grep -q "afs_rates"; then
  echo "Seeding from zip_lookup_clean.sql..."
  npx wrangler d1 execute ambulance-db --file=zip_lookup_clean.sql --remote
else
  echo "Database already seeded."
fi

# 3. Create wrangler.toml
echo "📝 Generating wrangler.toml..."
cat > wrangler.toml <<EOF
name = "ambulancecost"
compatibility_date = "2024-04-03"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"

[[d1_databases]]
binding = "DB"
database_name = "ambulance-db"
database_id = "$DB_ID"
EOF

# 4. Build and Deploy
echo "Building project..."
npm_config_legacy_peer_deps=true npx @cloudflare/next-on-pages

echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy .vercel/output/static --project-name=ambulancecost

echo "🎉 Deployment complete!"
