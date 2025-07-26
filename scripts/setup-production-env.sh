#!/bin/bash

# Lamsa Production Environment Setup Script
# This script helps set up production environment files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Lamsa Production Environment Setup${NC}"
echo "===================================="

# Function to generate secure random string
generate_secret() {
    local length=${1:-64}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to validate Supabase URL
validate_supabase_url() {
    if [[ $1 =~ ^https://[a-zA-Z0-9-]+\.supabase\.co/?$ ]]; then
        return 0
    else
        return 1
    fi
}

# Check if production environment files already exist
echo -e "\n${YELLOW}Checking existing environment files...${NC}"

API_ENV_EXISTS=false
MOBILE_ENV_EXISTS=false
WEB_ENV_EXISTS=false

if [ -f "$PROJECT_ROOT/lamsa-api/.env.production" ]; then
    API_ENV_EXISTS=true
    echo -e "  ✓ API production environment exists"
fi

if [ -f "$PROJECT_ROOT/lamsa-mobile/.env.production" ]; then
    MOBILE_ENV_EXISTS=true
    echo -e "  ✓ Mobile production environment exists"
fi

if [ -f "$PROJECT_ROOT/lamsa-web/.env.production.local" ]; then
    WEB_ENV_EXISTS=true
    echo -e "  ✓ Web production environment exists"
fi

# Prompt for Supabase credentials
echo -e "\n${YELLOW}Step 1: Supabase Configuration${NC}"
echo "Please provide your Supabase production credentials:"

read -p "Supabase URL (https://your-project.supabase.co): " SUPABASE_URL
while ! validate_supabase_url "$SUPABASE_URL"; do
    echo -e "${RED}Invalid Supabase URL format. Please enter a valid URL.${NC}"
    read -p "Supabase URL (https://your-project.supabase.co): " SUPABASE_URL
done

read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Supabase Service Key: " SUPABASE_SERVICE_KEY

# Generate secure secrets
echo -e "\n${YELLOW}Step 2: Generating Secure Secrets${NC}"
JWT_SECRET=$(generate_secret 64)
REDIS_PASSWORD=$(generate_secret 32)
PII_ENCRYPTION_KEY=$(generate_secret 32)

echo -e "  ✓ Generated JWT secret (64 chars)"
echo -e "  ✓ Generated Redis password (32 chars)"
echo -e "  ✓ Generated PII encryption key (32 chars)"

# Optional third-party services
echo -e "\n${YELLOW}Step 3: Third-party Services (Optional)${NC}"
echo "Press Enter to skip if not available yet"

read -p "Tap Payment Secret Key: " TAP_SECRET_KEY
read -p "Tap Payment Public Key: " TAP_PUBLIC_KEY
read -p "Twilio Account SID: " TWILIO_ACCOUNT_SID
read -p "Twilio Auth Token: " TWILIO_AUTH_TOKEN
read -p "Twilio Phone Number: " TWILIO_PHONE_NUMBER

# Create API production environment
if [ "$API_ENV_EXISTS" = false ] || [ "$1" = "--force" ]; then
    echo -e "\n${YELLOW}Creating API production environment...${NC}"
    
    cat > "$PROJECT_ROOT/lamsa-api/.env.production" << EOF
# Lamsa API Production Environment
# Generated on $(date)

# Database
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

# Security
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d
PII_ENCRYPTION_KEY=$PII_ENCRYPTION_KEY

# Redis
USE_REDIS_TOKENS=true
REDIS_URL=redis://default:$REDIS_PASSWORD@localhost:6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Application
NODE_ENV=production
PORT=3000
APP_NAME=Lamsa
DEFAULT_LANGUAGE=ar
CURRENCY=JOD
TIMEZONE=Asia/Amman

# Payments (Optional)
TAP_SECRET_KEY=$TAP_SECRET_KEY
TAP_PUBLIC_KEY=$TAP_PUBLIC_KEY

# SMS (Optional)
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER

# Monitoring (Add your keys)
SENTRY_DSN=
NEW_RELIC_LICENSE_KEY=

# Features
ENABLE_SWAGGER=false
ENABLE_MORGAN_LOGGING=true
ENABLE_DETAILED_LOGGING=false
ENABLE_PERFORMANCE_MONITORING=true
EOF
    
    chmod 600 "$PROJECT_ROOT/lamsa-api/.env.production"
    echo -e "  ✓ Created API production environment"
fi

# Create Mobile production environment
if [ "$MOBILE_ENV_EXISTS" = false ] || [ "$1" = "--force" ]; then
    echo -e "\n${YELLOW}Creating Mobile production environment...${NC}"
    
    cat > "$PROJECT_ROOT/lamsa-mobile/.env.production" << EOF
# Lamsa Mobile Production Environment
# Generated on $(date)

# API Configuration
EXPO_PUBLIC_API_URL=https://api.lamsa.jo
EXPO_PUBLIC_API_VERSION=v1

# Supabase
EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# App Configuration
EXPO_PUBLIC_APP_NAME=Lamsa
EXPO_PUBLIC_DEFAULT_LANGUAGE=ar
EXPO_PUBLIC_CURRENCY=JOD

# Features
EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH=true
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_LOCATION_SERVICES=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true

# Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=

# Payments (Optional)
EXPO_PUBLIC_TAP_PUBLIC_KEY=$TAP_PUBLIC_KEY

# Push Notifications
EXPO_PUSH_TOKEN=

# Monitoring
EXPO_PUBLIC_SENTRY_DSN=
EOF
    
    chmod 600 "$PROJECT_ROOT/lamsa-mobile/.env.production"
    echo -e "  ✓ Created Mobile production environment"
fi

# Create Web production environment
if [ "$WEB_ENV_EXISTS" = false ] || [ "$1" = "--force" ]; then
    echo -e "\n${YELLOW}Creating Web production environment...${NC}"
    
    cat > "$PROJECT_ROOT/lamsa-web/.env.production.local" << EOF
# Lamsa Web Production Environment
# Generated on $(date)

# Application
NEXT_PUBLIC_APP_NAME=Lamsa
NEXT_PUBLIC_APP_URL=https://lamsa.jo
NEXT_PUBLIC_API_URL=https://api.lamsa.jo
NEXT_PUBLIC_API_VERSION=v1

# Supabase
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

# NextAuth
NEXTAUTH_URL=https://lamsa.jo
NEXTAUTH_SECRET=$(generate_secret 32)

# Payments (Optional)
NEXT_PUBLIC_TAP_PUBLIC_KEY=$TAP_PUBLIC_KEY
TAP_SECRET_KEY=$TAP_SECRET_KEY

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PWA=true
EOF
    
    chmod 600 "$PROJECT_ROOT/lamsa-web/.env.production.local"
    echo -e "  ✓ Created Web production environment"
fi

# Create Docker environment file
echo -e "\n${YELLOW}Creating Docker production environment...${NC}"

cat > "$PROJECT_ROOT/.env.production" << EOF
# Lamsa Docker Production Environment
# Generated on $(date)

# Database
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

# Security
JWT_SECRET=$JWT_SECRET
REDIS_PASSWORD=$REDIS_PASSWORD

# Payments
TAP_SECRET_KEY=$TAP_SECRET_KEY
TAP_PUBLIC_KEY=$TAP_PUBLIC_KEY

# SMS
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER

# Application
APP_NAME=Lamsa
DEFAULT_LANGUAGE=ar
CURRENCY=JOD
TIMEZONE=Asia/Amman

# Monitoring
SENTRY_DSN=
EXPO_PUSH_TOKEN=
EOF

chmod 600 "$PROJECT_ROOT/.env.production"
echo -e "  ✓ Created Docker production environment"

# Summary
echo -e "\n${GREEN}Production Environment Setup Complete!${NC}"
echo "======================================="
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Add monitoring service keys (Sentry, New Relic)"
echo "2. Add Google Maps API key for mobile app"
echo "3. Configure your Redis instance (or use Upstash)"
echo "4. Set up SSL certificates for HTTPS"
echo "5. Run validation: node scripts/validate-env.js"
echo ""
echo -e "${YELLOW}Important Security Notes:${NC}"
echo "- All .env.production files have restricted permissions (600)"
echo "- Never commit these files to version control"
echo "- Rotate secrets regularly (every 90 days)"
echo "- Use a secrets management service in production"
echo ""
echo -e "${GREEN}Ready to validate your setup:${NC}"
echo "  cd $PROJECT_ROOT"
echo "  node scripts/validate-env.js --production"