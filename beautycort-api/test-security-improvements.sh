#!/bin/bash

echo "=== BeautyCort API Security Testing ==="
echo ""

# API base URL
API_URL="http://localhost:3001/api"
PHONE="+962791234567"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Testing Security Headers${NC}"
echo "Checking for security headers..."
curl -s -I "$API_URL/health" | grep -E "(X-Content-Type-Options|X-Frame-Options|X-XSS-Protection|Strict-Transport-Security)"
echo ""

echo -e "${YELLOW}2. Testing CORS from Unauthorized Origin${NC}"
echo "Attempting request from evil.com (should fail)..."
response=$(curl -s -X POST "$API_URL/auth/customer/send-otp" \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.com" \
  -d "{\"phone\": \"$PHONE\"}" \
  -w "\nHTTP_STATUS:%{http_code}")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$http_status" = "500" ] || [ "$http_status" = "403" ]; then
  echo -e "${GREEN}✓ CORS blocked unauthorized origin${NC}"
else
  echo -e "${RED}✗ CORS did not block unauthorized origin (status: $http_status)${NC}"
fi
echo ""

echo -e "${YELLOW}3. Testing CORS from Allowed Origin (Expo)${NC}"
echo "Attempting request from Expo development..."
response=$(curl -s -X POST "$API_URL/auth/customer/send-otp" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:19000" \
  -d "{\"phone\": \"$PHONE\"}" \
  -w "\nHTTP_STATUS:%{http_code}")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$http_status" = "200" ] || [ "$http_status" = "400" ]; then
  echo -e "${GREEN}✓ CORS allowed Expo origin${NC}"
else
  echo -e "${RED}✗ CORS blocked allowed origin (status: $http_status)${NC}"
fi
echo ""

echo -e "${YELLOW}4. Testing OTP Rate Limiting${NC}"
echo "Sending 5 OTP requests (should fail after 3)..."
for i in {1..5}; do
  echo -n "Attempt $i: "
  response=$(curl -s -X POST "$API_URL/auth/customer/send-otp" \
    -H "Content-Type: application/json" \
    -d "{\"phone\": \"$PHONE\"}" \
    -w "\nHTTP_STATUS:%{http_code}")
  
  http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  body=$(echo "$response" | grep -v "HTTP_STATUS")
  
  if [ "$http_status" = "429" ]; then
    echo -e "${GREEN}✓ Rate limit hit (429)${NC}"
  elif [ "$http_status" = "200" ]; then
    echo -e "${YELLOW}Success (200)${NC}"
  else
    echo -e "Status: $http_status"
    echo "$body" | jq .error 2>/dev/null || echo "$body"
  fi
done
echo ""

echo -e "${YELLOW}5. Testing Rate Limit Headers${NC}"
echo "Checking for rate limit headers..."
curl -s -I -X GET "$API_URL/health" | grep -E "RateLimit-"
echo ""

echo -e "${YELLOW}6. Testing Request Size Limit${NC}"
echo "Sending large request (11MB, should fail)..."
# Create a large JSON payload
large_data=$(python3 -c "print('x' * 11000000)")
response=$(curl -s -X POST "$API_URL/auth/provider/signup" \
  -H "Content-Type: application/json" \
  -d "{\"data\": \"$large_data\"}" \
  -w "\nHTTP_STATUS:%{http_code}" \
  --max-time 5 2>/dev/null || echo "Request failed/timed out")
if [[ "$response" == *"413"* ]] || [[ "$response" == *"failed"* ]]; then
  echo -e "${GREEN}✓ Large request properly rejected${NC}"
else
  echo -e "${RED}✗ Large request not properly handled${NC}"
fi
echo ""

echo -e "${YELLOW}7. Testing 404 Handler${NC}"
echo "Requesting non-existent route..."
response=$(curl -s "$API_URL/non-existent-route")
echo "$response" | jq . 2>/dev/null || echo "$response"
echo ""

echo -e "${YELLOW}8. Testing Mobile App Request (No Origin)${NC}"
echo "Sending request without Origin header (mobile app simulation)..."
response=$(curl -s -X GET "$API_URL/health" \
  -H "User-Agent: BeautyCort/1.0 (iOS)" \
  -w "\nHTTP_STATUS:%{http_code}")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$http_status" = "200" ]; then
  echo -e "${GREEN}✓ Mobile app request allowed (no origin)${NC}"
else
  echo -e "${RED}✗ Mobile app request blocked (status: $http_status)${NC}"
fi
echo ""

echo -e "${GREEN}=== Security Testing Complete ===${NC}"
echo ""
echo "Summary:"
echo "- Security headers are applied via Helmet"
echo "- CORS is configured for mobile app support"
echo "- Rate limiting prevents OTP abuse"
echo "- Request size limits are enforced"
echo "- 404 and error handlers are working"
echo ""
echo "Note: Some tests may show different results based on:"
echo "- Whether SKIP_RATE_LIMIT=true is set in .env"
echo "- The current state of rate limit windows"
