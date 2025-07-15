#!/bin/bash

# SMS Authentication Test Script for BeautyCort
# Using test US phone number connected to Supabase

# Base URL
BASE_URL="http://localhost:3001/api"

# Test phone number (Spanish number for testing)
TEST_PHONE="+34663758161"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== BeautyCort SMS Authentication Test ===${NC}"
echo -e "${BLUE}Using test phone number: $TEST_PHONE${NC}"
echo ""

# Step 1: Send OTP
echo -e "${BLUE}Step 1: Sending OTP to $TEST_PHONE${NC}"
SEND_OTP_RESPONSE=$(curl -X POST $BASE_URL/auth/customer/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$TEST_PHONE\"}" \
  -s)

echo "$SEND_OTP_RESPONSE" | jq '.'

# Check if OTP was sent successfully
if echo "$SEND_OTP_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OTP sent successfully!${NC}"
    echo -e "${YELLOW}Check your SMS for the OTP code${NC}"
    echo ""
    
    # Wait for user to input OTP
    echo -e "${BLUE}Step 2: Enter the OTP code you received:${NC}"
    read -p "OTP Code: " OTP_CODE
    
    # Step 3: Verify OTP
    echo -e "\n${BLUE}Step 3: Verifying OTP...${NC}"
    VERIFY_RESPONSE=$(curl -X POST $BASE_URL/auth/customer/verify-otp \
      -H "Content-Type: application/json" \
      -d "{
        \"phone\": \"$TEST_PHONE\",
        \"otp\": \"$OTP_CODE\",
        \"name\": \"Test User\"
      }" \
      -s)
    
    echo "$VERIFY_RESPONSE" | jq '.'
    
    # Check if verification was successful
    if echo "$VERIFY_RESPONSE" | jq -e '.data.token' > /dev/null 2>&1; then
        TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.data.token')
        echo -e "${GREEN}✓ Phone verified successfully!${NC}"
        echo -e "${GREEN}✓ JWT Token obtained${NC}"
        echo ""
        
        # Step 4: Test authenticated endpoint
        echo -e "${BLUE}Step 4: Testing authenticated endpoint...${NC}"
        PROFILE_RESPONSE=$(curl -X GET $BASE_URL/users/profile \
          -H "Authorization: Bearer $TOKEN" \
          -s)
        
        echo "$PROFILE_RESPONSE" | jq '.'
        
        if echo "$PROFILE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Authentication working correctly!${NC}"
        else
            echo -e "${RED}✗ Failed to access protected endpoint${NC}"
        fi
    else
        echo -e "${RED}✗ OTP verification failed${NC}"
        echo -e "${YELLOW}Make sure you entered the correct OTP code${NC}"
    fi
else
    echo -e "${RED}✗ Failed to send OTP${NC}"
    echo -e "${YELLOW}Check that Supabase SMS is configured correctly${NC}"
fi

echo ""
echo -e "${BLUE}=== Test Complete ===${NC}"