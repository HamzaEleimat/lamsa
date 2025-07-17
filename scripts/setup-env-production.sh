#!/bin/bash

# BeautyCort Production Environment Configuration Helper
# This script helps you configure your .env.production file step by step

set -e

echo "🔧 BeautyCort Production Environment Configuration"
echo "================================================="
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "📄 Creating .env.production from template..."
    cp .env.production.template .env.production
    echo "✅ .env.production file created"
else
    echo "📄 .env.production file already exists"
fi

echo ""
echo "📋 Current file location: $(pwd)/.env.production"
echo "📏 File size: $(wc -l < .env.production) lines"
echo ""

# Function to update environment variable
update_env_var() {
    local var_name="$1"
    local var_value="$2"
    local file_path=".env.production"
    
    # Check if variable exists
    if grep -q "^${var_name}=" "$file_path"; then
        # Update existing variable
        sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" "$file_path"
        echo "✅ Updated ${var_name}"
    else
        # Add new variable
        echo "${var_name}=${var_value}" >> "$file_path"
        echo "✅ Added ${var_name}"
    fi
}

echo "🔐 Step 1: Adding generated secrets to .env.production..."
echo ""

# Add the generated secrets
update_env_var "JWT_SECRET" "b5ed49b8c6c28fbfec29c8d9e41254399ac740844f0cd8971de8b3329548dd511e1d7be11e8df122d0eafa37ba413862501174abbfca0ca320d16772e209254a"
update_env_var "REFRESH_TOKEN_SECRET" "f8e34cc78b954837b38eec9ca5c0ad737a3b586a97b5623004fcba5051fa7aff9e38db6aeec30780175d1125056857b91d21b2e9ce69abc160401ccd08a38d93"
update_env_var "REDIS_PASSWORD" "20ef30351f25354dcddac07d3fd3ae24733f7cace5bbf67752510f82599172cf"
update_env_var "BACKUP_ENCRYPTION_KEY" "095c8f1a290952e46d9a972e45f801861251c690708464475006f20a4d10f516"
update_env_var "TAP_WEBHOOK_SECRET" "d23bceea23a59824fd04bb7dadd52f7202c6b083940c748800320f411a8719c7"
update_env_var "SESSION_SECRET" "4449b2f3d8e7fad62ddfba988be1d4e4d048db7ab9de3ce8261d2b151a82e548"
update_env_var "NEXTAUTH_SECRET" "a503e9af7c12da9c9ee0a885aab7c8a9573893c36a8b2ff8a969f7c5f38c1c90"

echo ""
echo "✅ All generated secrets have been added to .env.production"
echo ""

echo "📝 Step 2: What you need to do manually:"
echo "======================================="
echo ""
echo "1. Open .env.production in VS Code (you mentioned you can see it)"
echo "2. Replace the Supabase credentials with your actual values:"
echo ""
echo "   Replace this line:"
echo "   SUPABASE_URL=https://your-project-id.supabase.co"
echo "   With your actual Supabase URL"
echo ""
echo "   Replace this line:"
echo "   SUPABASE_ANON_KEY=your_production_anon_key_here"
echo "   With your actual anon key"
echo ""
echo "   Replace this line:"
echo "   SUPABASE_SERVICE_KEY=your_production_service_key_here"
echo "   With your actual service key"
echo ""
echo "   Replace this line:"
echo "   DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres"
echo "   With your actual database URL (replace 'password' with your DB password)"
echo ""

echo "🔍 Step 3: Verify your configuration:"
echo "===================================="
echo ""
echo "After updating the Supabase credentials, run:"
echo "node scripts/validate-secrets.js"
echo ""

echo "📂 Current .env.production status:"
echo "================================="
echo ""
echo "File exists: ✅"
echo "Location: $(pwd)/.env.production"
echo "Size: $(stat -c%s .env.production) bytes"
echo ""

echo "💡 Tips:"
echo "========"
echo "- If you can't see the file in terminal, try: ls -la .env*"
echo "- If you can see it in VS Code, you can edit it directly there"
echo "- The file is in the root directory: /home/hamza/beautycort/.env.production"
echo ""

echo "🚀 Once you've added your Supabase credentials, you can test with:"
echo "cd beautycort-api && npm run test:connection:prod"
echo ""

echo "✅ Environment configuration helper completed!"