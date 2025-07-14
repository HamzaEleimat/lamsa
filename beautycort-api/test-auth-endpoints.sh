#!/bin/bash

# Test script for the restructured auth endpoints
# Run this script from the beautycort-api directory

API_URL="http://localhost:3000/api/auth"
TEST_PHONE="0791234567"
TEST_EMAIL="test@beautycort.com"
TEST_PASSWORD="Test123!"

echo "==================================="
echo "Testing BeautyCort Auth Endpoints"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -w "\nHTTP_CODE:%{http_code}")
    else
        response=$(curl -s -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\nHTTP_CODE:%{http_code}")
    fi
    
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    echo "Response: $body"
    
    if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
    fi
    echo ""
}

echo "==================================="
echo "1. CUSTOMER AUTH ENDPOINTS"
echo "==================================="
echo ""

# Test customer send OTP
test_endpoint "POST" "/customer/send-otp" \
    '{"phone":"'$TEST_PHONE'"}' \
    "Customer Send OTP"

# Test customer verify OTP
test_endpoint "POST" "/customer/verify-otp" \
    '{"phone":"'$TEST_PHONE'","otp":"123456","name":"Test Customer"}' \
    "Customer Verify OTP"

echo "==================================="
echo "2. PROVIDER AUTH ENDPOINTS"
echo "==================================="
echo ""

# Test provider send OTP
test_endpoint "POST" "/provider/send-otp" \
    '{"phone":"0792345678"}' \
    "Provider Send OTP"

# Test provider verify OTP
test_endpoint "POST" "/provider/verify-otp" \
    '{"phone":"0792345678","otp":"123456"}' \
    "Provider Verify OTP"

# Test provider signup
provider_data='{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "phone": "0792345678",
    "phoneVerified": true,
    "business_name_ar": "صالون الجمال",
    "business_name_en": "Beauty Salon",
    "owner_name": "Test Owner",
    "latitude": 31.9539,
    "longitude": 35.9106,
    "address": {
        "street": "123 Test Street",
        "city": "Amman",
        "district": "Abdoun",
        "country": "Jordan"
    },
    "license_number": "LIC123456"
}'

test_endpoint "POST" "/provider/signup" \
    "$provider_data" \
    "Provider Signup"

# Test provider login
test_endpoint "POST" "/provider/login" \
    '{"email":"'$TEST_EMAIL'","password":"'$TEST_PASSWORD'"}' \
    "Provider Login"

# Test provider forgot password
test_endpoint "POST" "/provider/forgot-password" \
    '{"email":"'$TEST_EMAIL'"}' \
    "Provider Forgot Password"

# Test provider reset password
test_endpoint "POST" "/provider/reset-password" \
    '{"token":"'$(openssl rand -hex 16)'","newPassword":"NewTest123!"}' \
    "Provider Reset Password"

echo "==================================="
echo "3. SHARED ENDPOINTS (Need Auth)"
echo "==================================="
echo ""

# First, get a token for testing authenticated endpoints
echo "Getting auth token..."
auth_response=$(curl -s -X POST "$API_URL/customer/send-otp" \
    -H "Content-Type: application/json" \
    -d '{"phone":"'$TEST_PHONE'"}')

# Extract test OTP if available
test_otp=$(echo "$auth_response" | grep -o '"testOTP":"[0-9]*"' | cut -d'"' -f4)

if [ -z "$test_otp" ]; then
    test_otp="123456"
fi

# Verify OTP to get token
verify_response=$(curl -s -X POST "$API_URL/customer/verify-otp" \
    -H "Content-Type: application/json" \
    -d '{"phone":"'$TEST_PHONE'","otp":"'$test_otp'"}')

JWT_TOKEN=$(echo "$verify_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$verify_response" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$JWT_TOKEN" ]; then
    echo -e "${GREEN}✓ Got JWT token${NC}"
    echo ""
    
    # Test authenticated endpoints
    test_endpoint "GET" "/me" "" "Get Current User"
    
    test_endpoint "POST" "/signout" "" "Sign Out"
    
    # Test refresh token
    test_endpoint "POST" "/refresh" \
        '{"refreshToken":"'$REFRESH_TOKEN'"}' \
        "Refresh Token"
else
    echo -e "${RED}✗ Failed to get JWT token${NC}"
fi

echo "==================================="
echo "4. VALIDATION TESTS"
echo "==================================="
echo ""

# Test invalid phone format
test_endpoint "POST" "/customer/send-otp" \
    '{"phone":"123"}' \
    "Invalid Phone Format"

# Test invalid OTP format
test_endpoint "POST" "/customer/verify-otp" \
    '{"phone":"'$TEST_PHONE'","otp":"123"}' \
    "Invalid OTP Format"

# Test invalid email format
test_endpoint "POST" "/provider/login" \
    '{"email":"invalid-email","password":"test"}' \
    "Invalid Email Format"

# Test weak password
test_endpoint "POST" "/provider/signup" \
    '{
        "email": "weak@test.com",
        "password": "weak",
        "phone": "0793456789",
        "business_name_ar": "test",
        "business_name_en": "test",
        "owner_name": "test",
        "latitude": 31.9539,
        "longitude": 35.9106,
        "address": {
            "street": "test",
            "city": "Amman",
            "district": "test",
            "country": "Jordan"
        }
    }' \
    "Weak Password"

echo "==================================="
echo "Test completed!"
echo "==================================="
