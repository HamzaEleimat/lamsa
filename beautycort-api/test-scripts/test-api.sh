#!/bin/bash

# API Testing Script for BeautyCort
# Base URL
BASE_URL="http://localhost:3001/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print test header
print_header() {
    echo -e "\n${BLUE}==== Testing: $1 ====${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Test Health Check
print_header "Health Check"
curl -X GET $BASE_URL/health -s | jq '.'

# Test Customer Send OTP
print_header "Customer Send OTP"
SEND_OTP_RESPONSE=$(curl -X POST $BASE_URL/auth/customer/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+962777123456"
  }' -s)
echo "$SEND_OTP_RESPONSE" | jq '.'

# Test Customer Verify OTP
print_header "Customer Verify OTP"
VERIFY_OTP_RESPONSE=$(curl -X POST $BASE_URL/auth/customer/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+962777123456",
    "otp": "123456",
    "name": "Test Customer"
  }' -s)
echo "$VERIFY_OTP_RESPONSE" | jq '.'

# Test Provider Signup
print_header "Provider Signup"
PROVIDER_SIGNUP=$(curl -X POST $BASE_URL/auth/provider/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testprovider@example.com",
    "password": "TestPass123!",
    "business_name_en": "Test Beauty Salon",
    "business_name_ar": "صالون تجميل تجريبي",
    "owner_name": "Test Owner",
    "phone": "+962788123456",
    "address": {
      "street": "123 Test Street",
      "city": "Amman",
      "district": "Abdali",
      "country": "Jordan"
    },
    "latitude": 31.9539,
    "longitude": 35.9106
  }' -s)
echo "$PROVIDER_SIGNUP" | jq '.'


# Test Provider Login
print_header "Provider Login"
PROVIDER_LOGIN=$(curl -X POST $BASE_URL/auth/provider/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testprovider@example.com",
    "password": "TestPass123!"
  }' -s)
echo "$PROVIDER_LOGIN" | jq '.'

# Extract provider token if successful
if echo "$PROVIDER_LOGIN" | jq -e '.token' > /dev/null 2>&1; then
    PROVIDER_TOKEN=$(echo "$PROVIDER_LOGIN" | jq -r '.token')
    print_success "Provider login successful, token obtained"
fi

# Test Get All Providers (Public)
print_header "Get All Providers (Public)"
curl -X GET "$BASE_URL/providers" -s | jq '.'

# Test Search Providers by Location
print_header "Search Providers by Location"
curl -X GET "$BASE_URL/providers?latitude=31.9539&longitude=35.9106&radius=5000" -s | jq '.'

# Test Get Service Categories
print_header "Get Service Categories"
curl -X GET "$BASE_URL/services/categories" -s | jq '.'

# Test Get All Services
print_header "Get All Services"
curl -X GET "$BASE_URL/services" -s | jq '.'

# Test Search Services
print_header "Search Services"
curl -X GET "$BASE_URL/services/search?query=hair" -s | jq '.'

# If we have a provider token, test protected routes
if [ ! -z "$PROVIDER_TOKEN" ]; then
    print_header "Testing Protected Provider Routes"
    
    # Get Provider Profile
    echo -e "\n${BLUE}Get Provider Profile:${NC}"
    curl -X GET "$BASE_URL/users/profile" \
      -H "Authorization: Bearer $PROVIDER_TOKEN" -s | jq '.'
    
    # Create a Service (Protected)
    echo -e "\n${BLUE}Create Service (Provider):${NC}"
    PROVIDER_ID=$(echo "$PROVIDER_LOGIN" | jq -r '.user.provider_id')
    if [ "$PROVIDER_ID" != "null" ]; then
        curl -X POST "$BASE_URL/services/providers/$PROVIDER_ID/services" \
          -H "Authorization: Bearer $PROVIDER_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{
            "name_en": "Hair Cut",
            "name_ar": "قص شعر",
            "description_en": "Professional hair cutting service",
            "description_ar": "خدمة قص شعر احترافية",
            "category": "HAIR",
            "price": 15.00,
            "duration_minutes": 30
          }' -s | jq '.'
    fi
fi

print_header "Test Summary"
echo "API is running on $BASE_URL"
echo "All basic endpoints have been tested"
echo "Note: Some tests may fail if data already exists in the database"