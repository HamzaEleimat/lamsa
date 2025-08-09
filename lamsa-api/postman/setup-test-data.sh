#!/bin/bash

# Setup Test Data for Postman API Testing
# This script prepares the database with verified test providers and services

set -e

echo "======================================"
echo "Lamsa API - Test Data Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: This script must be run from the lamsa-api directory${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
    echo -e "${YELLOW}Warning: .env file not found. Using existing environment variables${NC}"
fi

# Check required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}Error: Missing required environment variables${NC}"
    echo "Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set"
    exit 1
fi

echo ""
echo "Step 1: Installing dependencies..."
echo "-----------------------------------"

# Check if bcryptjs is installed
if ! npm list bcryptjs >/dev/null 2>&1; then
    echo "Installing bcryptjs for password hashing..."
    npm install bcryptjs --save-dev
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"

echo ""
echo "Step 2: Creating test providers..."
echo "-----------------------------------"

# Generate bcrypt hash for the test password
echo "Generating password hash..."
node -e "
const bcrypt = require('bcryptjs');
const password = 'TestProvider123!';
bcrypt.hash(password, 10).then(hash => {
    console.log('Password hash generated:');
    console.log(hash);
    process.env.TEST_PASSWORD_HASH = hash;
    
    // Update SQL file with actual hash
    const fs = require('fs');
    const sqlPath = './postman/data/test-providers.sql';
    let sql = fs.readFileSync(sqlPath, 'utf8');
    sql = sql.replace(/\\\$2b\\\$10\\\$YourHashHere\.ReplaceWithActualBcryptHash/g, hash);
    fs.writeFileSync(sqlPath + '.tmp', sql);
    console.log('SQL file updated with password hash');
});
" 

# Wait for hash generation
sleep 2

# Check if SQL file was updated
if [ -f "./postman/data/test-providers.sql.tmp" ]; then
    mv "./postman/data/test-providers.sql.tmp" "./postman/data/test-providers.sql"
    echo -e "${GREEN}✓ Password hash updated in SQL${NC}"
fi

echo ""
echo "Step 3: Executing database setup..."
echo "-----------------------------------"

# Option 1: Try using psql directly with Supabase connection
if [ ! -z "$DATABASE_URL" ]; then
    echo "Using direct database connection to execute SQL..."
    psql "$DATABASE_URL" -f ./postman/data/test-providers.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Test providers created via direct SQL execution${NC}"
    else
        echo -e "${YELLOW}Direct SQL execution failed, trying Node.js script...${NC}"
        node ./postman/scripts/setup-test-providers.js
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Test providers created via Node.js script${NC}"
        else
            echo -e "${RED}Error creating test providers${NC}"
            exit 1
        fi
    fi
else
    # Option 2: Use Node.js script
    echo "Using Node.js script to create test providers..."
    node ./postman/scripts/setup-test-providers.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Test providers created via Node.js script${NC}"
    else
        echo -e "${RED}Error creating test providers${NC}"
        exit 1
    fi
fi

echo ""
echo "Step 4: Activating test providers..."
echo "-----------------------------------"

# Activate all test providers
node ./scripts/activate-providers.js test.provider1@lamsa.test
node ./scripts/activate-providers.js test.provider2@lamsa.test
node ./scripts/activate-providers.js test.provider3@lamsa.test

echo -e "${GREEN}✓ Test providers activated${NC}"

echo ""
echo "======================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Test Provider Credentials:"
echo "--------------------------"
echo "All providers use password: TestProvider123!"
echo ""
echo "Provider 1 - Test Beauty Salon:"
echo "  Email: test.provider1@lamsa.test"
echo "  Phone: +962781234567"
echo "  ID: a1111111-1111-1111-1111-111111111111"
echo ""
echo "Provider 2 - Test Mobile Stylist:"
echo "  Email: test.provider2@lamsa.test"
echo "  Phone: +962787654321"
echo "  ID: b2222222-2222-2222-2222-222222222222"
echo ""
echo "Provider 3 - Test Nail Studio:"
echo "  Email: test.provider3@lamsa.test"
echo "  Phone: +962799876543"
echo "  ID: c3333333-3333-3333-3333-333333333333"
echo ""
echo "Next Steps:"
echo "-----------"
echo "1. Import the Postman environment: postman/environments/test-providers.postman_environment.json"
echo "2. Add the pre-request script to your collection: postman/scripts/pre-request/provider-test-setup.js"
echo "3. Run your Postman tests!"
echo ""
echo -e "${GREEN}Happy testing! 🚀${NC}"