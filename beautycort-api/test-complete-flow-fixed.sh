#!/bin/bash

# Test Complete Flow Script
echo "=== BeautyCort Complete Flow Test ==="

API_URL="http://localhost:3001/api"

# Step 1: Customer Phone Auth
echo -e "\n1. Testing Customer Phone Auth..."
CUSTOMER_PHONE="+962777123456"

# Send OTP
echo "   - Sending OTP to $CUSTOMER_PHONE"
OTP_RESPONSE=$(curl -X POST $API_URL/auth/customer/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$CUSTOMER_PHONE\"}" \
  -s)

echo "$OTP_RESPONSE" | jq .
TEST_OTP=$(echo "$OTP_RESPONSE" | jq -r '.data.testOTP')
echo "   - Using test OTP: $TEST_OTP"

# Verify OTP (using the actual OTP returned)
echo "   - Verifying OTP..."
CUSTOMER_RESPONSE=$(curl -X POST $API_URL/auth/customer/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$CUSTOMER_PHONE\", \"otp\": \"$TEST_OTP\"}" \
  -s)

echo "$CUSTOMER_RESPONSE" | jq .
CUSTOMER_TOKEN=$(echo "$CUSTOMER_RESPONSE" | jq -r '.data.token')
echo "   - Customer Token: ${CUSTOMER_TOKEN:0:20}..."

# Step 2: Provider Signup
echo -e "\n2. Testing Provider Signup..."
PROVIDER_EMAIL="provider_$(date +%s)@beautycort.com"
PROVIDER_PHONE="+962791234567"

PROVIDER_SIGNUP=$(curl -X POST $API_URL/auth/provider/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$PROVIDER_EMAIL'",
    "password": "Test123!@#",
    "phone": "'$PROVIDER_PHONE'",
    "business_name_ar": "صالون تجميل تجريبي",
    "business_name_en": "Test Beauty Salon",
    "owner_name": "Test Owner",
    "latitude": 31.9539,
    "longitude": 35.9106,
    "address": {
      "street": "123 Main Street",
      "city": "Amman",
      "district": "Abdali",
      "country": "Jordan"
    },
    "license_number": "LIC123456"
  }' \
  -s)

echo "$PROVIDER_SIGNUP" | jq .
PROVIDER_ID=$(echo "$PROVIDER_SIGNUP" | jq -r '.data.provider.id')
echo "   - Provider ID: $PROVIDER_ID"

# Step 3: Provider Login
echo -e "\n3. Testing Provider Login..."
PROVIDER_LOGIN=$(curl -X POST $API_URL/auth/provider/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$PROVIDER_EMAIL\", \"password\": \"Test123!@#\"}" \
  -s)

echo "$PROVIDER_LOGIN" | jq .
PROVIDER_TOKEN=$(echo "$PROVIDER_LOGIN" | jq -r '.data.token')
echo "   - Provider Token: ${PROVIDER_TOKEN:0:20}..."

# Step 4: Create a Service
echo -e "\n4. Creating a Service..."
SERVICE_RESPONSE=$(curl -X POST $API_URL/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PROVIDER_TOKEN" \
  -d '{
    "name_en": "Hair Cut & Style",
    "name_ar": "قص وتصفيف الشعر",
    "description_en": "Professional haircut and styling service",
    "description_ar": "خدمة قص وتصفيف الشعر الاحترافية",
    "price": 25.00,
    "duration_minutes": 60,
    "category": "HAIR"
  }' \
  -s)

echo "$SERVICE_RESPONSE" | jq .

# Step 5: Get Provider for Mobile App
echo -e "\n5. Viewing Provider in Mobile App (as Customer)..."

# Get all providers
echo "   - Getting all providers..."
curl -X GET $API_URL/providers \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -s | jq .

# Search for nearby providers
echo "   - Searching for nearby providers..."
curl -X GET "$API_URL/providers/search?lat=31.9539&lng=35.9106&radius=10" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -s | jq .

# Get specific provider with services
echo "   - Getting provider details with services..."
curl -X GET "$API_URL/providers/$PROVIDER_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -s | jq .

# Get provider's services
echo "   - Getting provider's services..."
curl -X GET "$API_URL/services/providers/$PROVIDER_ID/services" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -s | jq .

echo -e "\n=== Test Complete ===\n"
echo "Summary:"
echo "- Customer Phone: $CUSTOMER_PHONE"
echo "- Customer Token: ${CUSTOMER_TOKEN:0:20}..."
echo "- Provider Email: $PROVIDER_EMAIL"
echo "- Provider Token: ${PROVIDER_TOKEN:0:20}..."
echo "- Provider ID: $PROVIDER_ID"

# Test Dashboard Login
echo -e "\n6. Testing Dashboard Login Flow..."
echo "   - You can now test the dashboard login at: http://localhost:3000/login"
echo "   - Use credentials: $PROVIDER_EMAIL / Test123!@#"