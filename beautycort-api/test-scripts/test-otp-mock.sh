#!/bin/bash

# Mock OTP Test Script for BeautyCort
# This script tests the OTP flow in development mode with mock OTP

# Base URL
BASE_URL="http://localhost:3001/api"
TEST_PHONE="+962777123456"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== BeautyCort Mock OTP Test ===${NC}"
echo -e "${BLUE}Testing with phone: $TEST_PHONE${NC}"
echo ""

# Step 1: Send OTP
echo -e "${BLUE}Step 1: Sending OTP...${NC}"
SEND_RESPONSE=$(curl -X POST $BASE_URL/auth/customer/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$TEST_PHONE\"}" \
  -s)

echo "$SEND_RESPONSE" | jq '.'

if echo "$SEND_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OTP sent successfully!${NC}"
    echo -e "${YELLOW}Note: In development mode, check server console for the OTP code${NC}"
    echo -e "${YELLOW}Look for: '📱 Mock OTP sent to $TEST_PHONE: XXXXXX'${NC}"
    echo ""
    
    # Since we're in mock mode, let's try a few common test OTPs
    echo -e "${BLUE}Step 2: Testing OTP verification...${NC}"
    
    # First, let's test with an invalid OTP
    echo -e "\n${BLUE}Testing with invalid OTP (000000):${NC}"
    INVALID_RESPONSE=$(curl -X POST $BASE_URL/auth/customer/verify-otp \
      -H "Content-Type: application/json" \
      -d "{
        \"phone\": \"$TEST_PHONE\",
        \"otp\": \"000000\",
        \"name\": \"Test Customer\"
      }" \
      -s)
    
    echo "$INVALID_RESPONSE" | jq '.'
    
    # Now prompt for the actual OTP
    echo -e "\n${BLUE}Enter the actual OTP from server console:${NC}"
    read -p "OTP Code: " ACTUAL_OTP
    
    echo -e "\n${BLUE}Verifying with OTP: $ACTUAL_OTP${NC}"
    VERIFY_RESPONSE=$(curl -X POST $BASE_URL/auth/customer/verify-otp \
      -H "Content-Type: application/json" \
      -d "{
        \"phone\": \"$TEST_PHONE\",
        \"otp\": \"$ACTUAL_OTP\",
        \"name\": \"Test Customer\"
      }" \
      -s)
    
    echo "$VERIFY_RESPONSE" | jq '.'
    
    # Check if verification was successful
    if echo "$VERIFY_RESPONSE" | jq -e '.data.token' > /dev/null 2>&1; then
        TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.data.token')
        USER_ID=$(echo "$VERIFY_RESPONSE" | jq -r '.data.user.id')
        
        echo -e "${GREEN}✓ Phone verified successfully!${NC}"
        echo -e "${GREEN}✓ User ID: $USER_ID${NC}"
        echo -e "${GREEN}✓ JWT Token obtained (length: ${#TOKEN})${NC}"
        echo ""
        
        # Step 3: Test authenticated endpoint
        echo -e "${BLUE}Step 3: Testing authenticated access...${NC}"
        PROFILE_RESPONSE=$(curl -X GET $BASE_URL/users/profile \
          -H "Authorization: Bearer $TOKEN" \
          -s)
        
        echo "$PROFILE_RESPONSE" | jq '.'
        
        if echo "$PROFILE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Authentication working correctly!${NC}"
            echo -e "${GREEN}✓ User profile retrieved successfully${NC}"
        else
            echo -e "${RED}✗ Failed to access protected endpoint${NC}"
        fi
    else
        echo -e "${RED}✗ OTP verification failed${NC}"
    fi
else
    echo -e "${RED}✗ Failed to send OTP${NC}"
fi

echo ""
echo -e "${BLUE}=== Test Complete ===${NC}"