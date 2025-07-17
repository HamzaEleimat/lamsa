#!/bin/bash

# Fix the .env.production file formatting issues

echo "🔧 Fixing .env.production file formatting..."

# First, let's fix the corrupted line 146 where TARGET_CPU_UTILIZATION and REFRESH_TOKEN_SECRET got merged
sed -i 's/TARGET_CPU_UTILIZATION=70REFRESH_TOKEN_SECRET=/TARGET_CPU_UTILIZATION=70\nREFRESH_TOKEN_SECRET=/' .env.production

echo "✅ Fixed line formatting"

# Now let's validate the secrets again
echo "🔍 Running validation..."
node scripts/validate-secrets.js

echo "✅ Environment file fix completed!"