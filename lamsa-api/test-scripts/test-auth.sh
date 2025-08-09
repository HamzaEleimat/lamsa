#!/bin/bash

# ========================================
# Lamsa Authentication Testing Suite
# ========================================
# Comprehensive testing script for all authentication endpoints
# Includes happy path, error cases, rate limiting, and security tests

set -e  # Exit on any error

# ========================================
# Configuration & Setup
# ========================================

# API Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
API_PATH="/api/auth"
FULL_API_URL="${API_BASE_URL}${API_PATH}"

# Test Environment
NODE_ENV="${NODE_ENV:-development}"
MOCK_OTP_MODE="${MOCK_OTP_MODE:-true}"

# Test Data - Safe Phone Numbers (No Real SMS)
JORDAN_PHONE_1="+962790000001"
JORDAN_PHONE_2="+962780000002"
JORDAN_PHONE_3="+962770000003"
JORDAN_LOCAL_1="0790000001"
JORDAN_LOCAL_2="790000002"

# Provider Test Data
PROVIDER_EMAIL_1="testprovider1@beautycort.test"
PROVIDER_EMAIL_2="testprovider2@beautycort.test"
PROVIDER_PASSWORD="SecureTest123!"
WEAK_PASSWORD="123"

# Invalid Test Data
INVALID_PHONE_1="123456789"
INVALID_PHONE_2="+962700000000"
INVALID_PHONE_3="+1234567890123"
INVALID_EMAIL="not-an-email"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ========================================
# Utility Functions
# ========================================

log_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${WHITE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

log_test() {
    echo -e "${CYAN}TEST: $1${NC}"
    echo -e "${YELLOW}Endpoint: $2${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

log_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_error() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

log_info() {
    echo -e "${PURPLE}ℹ️  INFO: $1${NC}"
}

# Make HTTP request and parse response
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local headers="$4"
    local description="$5"
    
    log_test "$description" "$method $endpoint"
    
    # Default headers
    local default_headers='-H "Content-Type: application/json" -H "Accept: application/json"'
    
    # Combine headers
    local all_headers="$default_headers"
    if [ -n "$headers" ]; then
        all_headers="$default_headers $headers"
    fi
    
    # Make request
    if [ "$method" = "GET" ]; then
        response=$(eval "curl -s -X $method \"$FULL_API_URL$endpoint\" $all_headers -w \"\\nHTTP_CODE:%{http_code}\"")
    else
        response=$(eval "curl -s -X $method \"$FULL_API_URL$endpoint\" $all_headers -d '$data' -w \"\\nHTTP_CODE:%{http_code}\"")
    fi
    
    # Parse response
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    echo "Request Data: $data"
    echo "Response Code: $http_code"
    echo "Response Body: $body"
    echo ""
    
    # Return values for further processing
    export LAST_HTTP_CODE="$http_code"
    export LAST_RESPONSE_BODY="$body"
}

# Validate response contains expected fields
validate_success_response() {
    local expected_fields="$1"
    
    if echo "$LAST_RESPONSE_BODY" | jq -e '.success' > /dev/null 2>&1; then
        if echo "$LAST_RESPONSE_BODY" | jq -e '.success == true' > /dev/null 2>&1; then
            log_success "Success response format valid"
            
            # Check for expected fields
            for field in $expected_fields; do
                if echo "$LAST_RESPONSE_BODY" | jq -e ".data.$field" > /dev/null 2>&1; then
                    log_info "Field '$field' present in response"
                else
                    log_warning "Expected field '$field' missing from response"
                fi
            done
        else
            log_error "Success field is false"
        fi
    else
        log_error "Invalid success response format"
    fi
}

# Validate error response
validate_error_response() {
    local expected_code="$1"
    
    if [ "$LAST_HTTP_CODE" = "$expected_code" ]; then
        log_success "HTTP status code $expected_code as expected"
        
        if echo "$LAST_RESPONSE_BODY" | jq -e '.success == false' > /dev/null 2>&1; then
            log_success "Error response format valid"
            
            if echo "$LAST_RESPONSE_BODY" | jq -e '.error' > /dev/null 2>&1; then
                log_success "Error message present"
            else
                log_warning "Error message missing"
            fi
        else
            log_error "Invalid error response format"
        fi
    else
        log_error "Expected HTTP $expected_code, got $LAST_HTTP_CODE"
    fi
}

# Extract token from response
extract_token() {
    echo "$LAST_RESPONSE_BODY" | jq -r '.data.token // empty'
}

# Extract test OTP from response
extract_test_otp() {
    echo "$LAST_RESPONSE_BODY" | jq -r '.data.testOTP // "123456"'
}

# ========================================
# Pre-Test Setup
# ========================================

log_header "Pre-Test Setup & Validation"

echo "API Base URL: $API_BASE_URL"
echo "Full API URL: $FULL_API_URL"
echo "Environment: $NODE_ENV"
echo "Mock OTP Mode: $MOCK_OTP_MODE"
echo ""

# Test API connectivity
log_test "API Connectivity Check" "GET /api/health"
health_response=$(curl -s "$API_BASE_URL/api/health" -w "\nHTTP_CODE:%{http_code}" 2>/dev/null || echo "HTTP_CODE:000")
health_code=$(echo "$health_response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$health_code" = "200" ] || [ "$health_code" = "404" ]; then
    log_success "API server is running"
else
    log_error "API server not accessible (HTTP $health_code)"
    echo "Please ensure the API server is running on $API_BASE_URL"
    exit 1
fi

# ========================================
# Customer Authentication Tests
# ========================================

log_header "Customer Authentication Flow Tests"

# Test 1: Send OTP to valid Jordan number
make_request "POST" "/customer/send-otp" \
    "{\"phone\":\"$JORDAN_PHONE_1\"}" \
    "" \
    "CUST-001: Send OTP to new Jordan number"

if [ "$LAST_HTTP_CODE" = "200" ]; then
    validate_success_response "phone"
    CUSTOMER_TEST_OTP=$(extract_test_otp)
    log_info "Test OTP extracted: $CUSTOMER_TEST_OTP"
else
    validate_error_response "200"
fi

# Test 2: Send OTP with invalid phone format
make_request "POST" "/customer/send-otp" \
    "{\"phone\":\"$INVALID_PHONE_1\"}" \
    "" \
    "CUST-002: Send OTP with invalid phone format"

validate_error_response "400"

# Test 3: Send OTP with missing phone
make_request "POST" "/customer/send-otp" \
    "{}" \
    "" \
    "CUST-003: Send OTP with missing phone"

validate_error_response "400"

# Test 4: Send OTP with alternative Jordan format
make_request "POST" "/customer/send-otp" \
    "{\"phone\":\"$JORDAN_LOCAL_1\"}" \
    "" \
    "CUST-004: Send OTP with local Jordan format"

if [ "$LAST_HTTP_CODE" = "200" ]; then
    validate_success_response "phone"
    # Check if phone was normalized
    normalized_phone=$(echo "$LAST_RESPONSE_BODY" | jq -r '.data.phone')
    if [[ "$normalized_phone" == "+962"* ]]; then
        log_success "Phone number normalized to international format: $normalized_phone"
    else
        log_warning "Phone number not normalized: $normalized_phone"
    fi
else
    validate_error_response "200"
fi

# Test 5: Verify OTP with correct code
make_request "POST" "/customer/verify-otp" \
    "{\"phone\":\"$JORDAN_PHONE_1\",\"otp\":\"$CUSTOMER_TEST_OTP\",\"name\":\"Test Customer\"}" \
    "" \
    "CUST-005: Verify OTP with correct code"

if [ "$LAST_HTTP_CODE" = "200" ]; then
    validate_success_response "user token"
    CUSTOMER_TOKEN=$(extract_token)
    if [ -n "$CUSTOMER_TOKEN" ]; then
        log_success "JWT token received: ${CUSTOMER_TOKEN:0:20}..."
    else
        log_error "No JWT token in response"
    fi
else
    validate_error_response "200"
fi

# Test 6: Verify OTP with wrong code
make_request "POST" "/customer/verify-otp" \
    "{\"phone\":\"$JORDAN_PHONE_2\",\"otp\":\"000000\"}" \
    "" \
    "CUST-006: Verify OTP with wrong code"

validate_error_response "400"

# Test 7: Verify OTP with missing fields
make_request "POST" "/customer/verify-otp" \
    "{\"phone\":\"$JORDAN_PHONE_1\"}" \
    "" \
    "CUST-007: Verify OTP with missing OTP field"

validate_error_response "400"

# Test 8: Try to reuse OTP (should fail)
make_request "POST" "/customer/verify-otp" \
    "{\"phone\":\"$JORDAN_PHONE_1\",\"otp\":\"$CUSTOMER_TEST_OTP\"}" \
    "" \
    "CUST-008: Try to reuse OTP (should fail)"

validate_error_response "400"

# ========================================
# Provider Authentication Tests
# ========================================

log_header "Provider Authentication Flow Tests"

# Test 9: Provider signup with valid data
make_request "POST" "/provider/signup" \
    "{
        \"email\": \"$PROVIDER_EMAIL_1\",
        \"password\": \"$PROVIDER_PASSWORD\",
        \"phone\": \"$JORDAN_PHONE_2\",
        \"business_name_ar\": \"صالون الجمال التجريبي\",
        \"business_name_en\": \"Test Beauty Salon\",
        \"owner_name\": \"Ahmed Ali\",
        \"latitude\": 31.9454,
        \"longitude\": 35.9284,
        \"address\": {
            \"street\": \"Al-Malek Hussein Street\",
            \"city\": \"Amman\",
            \"district\": \"Abdoun\",
            \"country\": \"Jordan\"
        },
        \"license_number\": \"BS123456\"
    }" \
    "" \
    "PROV-001: Provider signup with valid data"

if [ "$LAST_HTTP_CODE" = "201" ]; then
    validate_success_response "provider token"
    PROVIDER_TOKEN=$(extract_token)
    if [ -n "$PROVIDER_TOKEN" ]; then
        log_success "Provider JWT token received: ${PROVIDER_TOKEN:0:20}..."
    else
        log_error "No JWT token in response"
    fi
else
    validate_error_response "201"
fi

# Test 10: Provider signup with duplicate email
make_request "POST" "/provider/signup" \
    "{
        \"email\": \"$PROVIDER_EMAIL_1\",
        \"password\": \"AnotherPassword123\",
        \"phone\": \"$JORDAN_PHONE_3\",
        \"business_name_ar\": \"صالون آخر\",
        \"business_name_en\": \"Another Salon\",
        \"owner_name\": \"Sara Ahmed\",
        \"latitude\": 31.9454,
        \"longitude\": 35.9284,
        \"address\": {
            \"street\": \"Rainbow Street\",
            \"city\": \"Amman\",
            \"district\": \"Jabal Amman\",
            \"country\": \"Jordan\"
        }
    }" \
    "" \
    "PROV-002: Provider signup with duplicate email"

validate_error_response "409"

# Test 11: Provider signup with duplicate phone
make_request "POST" "/provider/signup" \
    "{
        \"email\": \"$PROVIDER_EMAIL_2\",
        \"password\": \"$PROVIDER_PASSWORD\",
        \"phone\": \"$JORDAN_PHONE_2\",
        \"business_name_ar\": \"صالون مختلف\",
        \"business_name_en\": \"Different Salon\",
        \"owner_name\": \"Omar Hassan\",
        \"latitude\": 31.9454,
        \"longitude\": 35.9284,
        \"address\": {
            \"street\": \"University Street\",
            \"city\": \"Amman\",
            \"district\": \"Jabal Hussein\",
            \"country\": \"Jordan\"
        }
    }" \
    "" \
    "PROV-003: Provider signup with duplicate phone"

validate_error_response "409"

# Test 12: Provider signup with invalid email
make_request "POST" "/provider/signup" \
    "{
        \"email\": \"$INVALID_EMAIL\",
        \"password\": \"$PROVIDER_PASSWORD\",
        \"phone\": \"+962770000004\",
        \"business_name_ar\": \"صالون\",
        \"business_name_en\": \"Salon\",
        \"owner_name\": \"Test\",
        \"latitude\": 31.9454,
        \"longitude\": 35.9284,
        \"address\": {
            \"street\": \"Test\",
            \"city\": \"Amman\",
            \"district\": \"Test\",
            \"country\": \"Jordan\"
        }
    }" \
    "" \
    "PROV-004: Provider signup with invalid email"

validate_error_response "400"

# Test 13: Provider signup with weak password
make_request "POST" "/provider/signup" \
    "{
        \"email\": \"weak@test.com\",
        \"password\": \"$WEAK_PASSWORD\",
        \"phone\": \"+962770000005\",
        \"business_name_ar\": \"صالون\",
        \"business_name_en\": \"Salon\",
        \"owner_name\": \"Test\",
        \"latitude\": 31.9454,
        \"longitude\": 35.9284,
        \"address\": {
            \"street\": \"Test\",
            \"city\": \"Amman\",
            \"district\": \"Test\",
            \"country\": \"Jordan\"
        }
    }" \
    "" \
    "PROV-005: Provider signup with weak password"

validate_error_response "400"

# Test 14: Provider signup with missing required fields
make_request "POST" "/provider/signup" \
    "{
        \"email\": \"incomplete@test.com\",
        \"password\": \"$PROVIDER_PASSWORD\"
    }" \
    "" \
    "PROV-006: Provider signup with missing required fields"

validate_error_response "400"

# Test 15: Provider login with valid credentials
make_request "POST" "/provider/login" \
    "{\"email\":\"$PROVIDER_EMAIL_1\",\"password\":\"$PROVIDER_PASSWORD\"}" \
    "" \
    "PROV-007: Provider login with valid credentials"

if [ "$LAST_HTTP_CODE" = "200" ]; then
    validate_success_response "provider token"
    LOGIN_TOKEN=$(extract_token)
    if [ -n "$LOGIN_TOKEN" ]; then
        log_success "Login JWT token received: ${LOGIN_TOKEN:0:20}..."
    fi
elif [ "$LAST_HTTP_CODE" = "403" ]; then
    log_info "Provider not verified - this is expected for new providers"
    validate_error_response "403"
else
    validate_error_response "200"
fi

# Test 16: Provider login with invalid email
make_request "POST" "/provider/login" \
    "{\"email\":\"nonexistent@test.com\",\"password\":\"$PROVIDER_PASSWORD\"}" \
    "" \
    "PROV-008: Provider login with invalid email"

validate_error_response "401"

# Test 17: Provider login with wrong password
make_request "POST" "/provider/login" \
    "{\"email\":\"$PROVIDER_EMAIL_1\",\"password\":\"WrongPassword123\"}" \
    "" \
    "PROV-009: Provider login with wrong password"

validate_error_response "401"

# ========================================
# Provider OTP Verification Tests
# ========================================

log_header "Provider OTP Verification Tests"

# Test 18: Send OTP to provider phone
make_request "POST" "/provider/send-otp" \
    "{\"phone\":\"+962770000010\"}" \
    "" \
    "PROV-010: Send OTP to provider phone"

if [ "$LAST_HTTP_CODE" = "200" ]; then
    validate_success_response "phone"
    PROVIDER_OTP=$(extract_test_otp)
    PROVIDER_OTP_PHONE="+962770000010"
else
    validate_error_response "200"
fi

# Test 19: Verify provider OTP
if [ -n "$PROVIDER_OTP" ]; then
    make_request "POST" "/provider/verify-otp" \
        "{\"phone\":\"$PROVIDER_OTP_PHONE\",\"otp\":\"$PROVIDER_OTP\"}" \
        "" \
        "PROV-011: Verify provider OTP"
    
    if [ "$LAST_HTTP_CODE" = "200" ]; then
        validate_success_response "phone verified"
    else
        validate_error_response "200"
    fi
fi

# Test 20: Provider OTP with already registered phone
make_request "POST" "/provider/send-otp" \
    "{\"phone\":\"$JORDAN_PHONE_2\"}" \
    "" \
    "PROV-012: Send OTP to already registered provider phone"

validate_error_response "409"

# ========================================
# Token Management Tests
# ========================================

log_header "Token Management Tests"

# Test 21: Access protected endpoint with valid token
if [ -n "$CUSTOMER_TOKEN" ]; then
    make_request "GET" "/me" \
        "" \
        "-H \"Authorization: Bearer $CUSTOMER_TOKEN\"" \
        "TOK-001: Access protected endpoint with valid customer token"
    
    if [ "$LAST_HTTP_CODE" = "200" ]; then
        validate_success_response "type profile"
    else
        validate_error_response "200"
    fi
fi

# Test 22: Access protected endpoint without token
make_request "GET" "/me" \
    "" \
    "" \
    "TOK-002: Access protected endpoint without token"

validate_error_response "401"

# Test 23: Access protected endpoint with invalid token
make_request "GET" "/me" \
    "" \
    "-H \"Authorization: Bearer invalid.token.here\"" \
    "TOK-003: Access protected endpoint with invalid token"

validate_error_response "401"

# Test 24: Refresh token
if [ -n "$CUSTOMER_TOKEN" ]; then
    make_request "POST" "/refresh" \
        "{\"refreshToken\":\"$CUSTOMER_TOKEN\"}" \
        "" \
        "TOK-004: Refresh token"
    
    if [ "$LAST_HTTP_CODE" = "200" ]; then
        validate_success_response "token"
    else
        validate_error_response "200"
    fi
fi

# Test 25: Refresh with invalid token
make_request "POST" "/refresh" \
    "{\"refreshToken\":\"invalid.token.here\"}" \
    "" \
    "TOK-005: Refresh with invalid token"

validate_error_response "401"

# Test 26: Signout
if [ -n "$CUSTOMER_TOKEN" ]; then
    make_request "POST" "/signout" \
        "" \
        "-H \"Authorization: Bearer $CUSTOMER_TOKEN\"" \
        "TOK-006: Signout with valid token"
    
    if [ "$LAST_HTTP_CODE" = "200" ]; then
        validate_success_response ""
    else
        validate_error_response "200"
    fi
fi

# ========================================
# Password Recovery Tests
# ========================================

log_header "Password Recovery Tests"

# Test 27: Forgot password with valid email
make_request "POST" "/provider/forgot-password" \
    "{\"email\":\"$PROVIDER_EMAIL_1\"}" \
    "" \
    "PWD-001: Forgot password with valid email"

if [ "$LAST_HTTP_CODE" = "200" ]; then
    validate_success_response ""
else
    validate_error_response "200"
fi

# Test 28: Forgot password with invalid email
make_request "POST" "/provider/forgot-password" \
    "{\"email\":\"nonexistent@test.com\"}" \
    "" \
    "PWD-002: Forgot password with invalid email (should still return success)"

if [ "$LAST_HTTP_CODE" = "200" ]; then
    validate_success_response ""
else
    validate_error_response "200"
fi

# Test 29: Reset password with valid token
RESET_TOKEN="abcdefghijklmnopqrstuvwxyz1234567890"
make_request "POST" "/provider/reset-password" \
    "{\"token\":\"$RESET_TOKEN\",\"newPassword\":\"NewSecurePass123!\"}" \
    "" \
    "PWD-003: Reset password with valid token"

if [ "$LAST_HTTP_CODE" = "200" ]; then
    validate_success_response ""
else
    validate_error_response "200"
fi

# Test 30: Reset password with invalid token
make_request "POST" "/provider/reset-password" \
    "{\"token\":\"short\",\"newPassword\":\"NewSecurePass123!\"}" \
    "" \
    "PWD-004: Reset password with invalid token"

validate_error_response "400"

# ========================================
# Rate Limiting Tests
# ========================================

log_header "Rate Limiting Tests"

log_info "Testing OTP rate limiting (3 requests per 15 minutes per phone)"

# Test 31-34: OTP Rate Limiting
OTP_RATE_TEST_PHONE="+962790000099"
for i in {1..5}; do
    make_request "POST" "/customer/send-otp" \
        "{\"phone\":\"$OTP_RATE_TEST_PHONE\"}" \
        "" \
        "RATE-$((30+$i)): OTP rate limit test $i/5"
    
    if [ $i -le 3 ]; then
        if [ "$LAST_HTTP_CODE" = "200" ]; then
            log_success "Request $i allowed"
        else
            log_error "Request $i should have been allowed"
        fi
    else
        if [ "$LAST_HTTP_CODE" = "429" ]; then
            log_success "Request $i correctly rate limited"
        else
            log_warning "Request $i should have been rate limited (got $LAST_HTTP_CODE)"
        fi
    fi
    
    sleep 1
done

log_info "Testing auth rate limiting (10 requests per 15 minutes per IP)"

# Test 35-36: Auth Rate Limiting (limited test to avoid too many requests)
for i in {1..2}; do
    make_request "POST" "/provider/login" \
        "{\"email\":\"nonexistent@test.com\",\"password\":\"wrong\"}" \
        "" \
        "RATE-$((35+$i)): Auth rate limit test $i/2"
    
    if [ "$LAST_HTTP_CODE" = "401" ]; then
        log_success "Failed auth request $i processed normally"
    elif [ "$LAST_HTTP_CODE" = "429" ]; then
        log_info "Auth request $i rate limited"
    else
        log_warning "Unexpected response code: $LAST_HTTP_CODE"
    fi
    
    sleep 1
done

# ========================================
# Security Tests
# ========================================

log_header "Security Tests"

# Test 37: SQL Injection in phone field
make_request "POST" "/customer/send-otp" \
    "{\"phone\":\"'+962790000001'; DROP TABLE users; --\"}" \
    "" \
    "SEC-001: SQL injection attempt in phone field"

validate_error_response "400"

# Test 38: SQL Injection in email field
make_request "POST" "/provider/login" \
    "{\"email\":\"admin@test.com' OR 1=1 --\",\"password\":\"any\"}" \
    "" \
    "SEC-002: SQL injection attempt in email field"

validate_error_response "401"

# Test 39: XSS in name field
make_request "POST" "/customer/verify-otp" \
    "{\"phone\":\"$JORDAN_PHONE_3\",\"otp\":\"123456\",\"name\":\"<script>alert('XSS')</script>\"}" \
    "" \
    "SEC-003: XSS attempt in name field"

# Should either sanitize or reject
if [ "$LAST_HTTP_CODE" = "200" ] || [ "$LAST_HTTP_CODE" = "400" ]; then
    log_success "XSS input handled appropriately"
else
    log_warning "Unexpected response to XSS attempt: $LAST_HTTP_CODE"
fi

# Test 40: Oversized payload
LARGE_STRING=$(python3 -c "print('A' * 1000)" 2>/dev/null || echo "$(perl -E 'say \"A\" x 1000')")
make_request "POST" "/customer/verify-otp" \
    "{\"phone\":\"$JORDAN_PHONE_3\",\"otp\":\"123456\",\"name\":\"$LARGE_STRING\"}" \
    "" \
    "SEC-004: Oversized payload test"

# Should reject or handle gracefully
if [ "$LAST_HTTP_CODE" = "400" ] || [ "$LAST_HTTP_CODE" = "413" ]; then
    log_success "Oversized payload rejected appropriately"
else
    log_warning "Oversized payload response: $LAST_HTTP_CODE"
fi

# Test 41: JWT Token manipulation
MANIPULATED_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1hbGljaW91cyIsInR5cGUiOiJhZG1pbiJ9.invalid"
make_request "GET" "/me" \
    "" \
    "-H \"Authorization: Bearer $MANIPULATED_TOKEN\"" \
    "SEC-005: JWT token manipulation attempt"

validate_error_response "401"

# ========================================
# OTP Expiration Tests
# ========================================

log_header "OTP Expiration Tests"

log_info "Testing OTP expiration behavior..."

# Test 42: Generate OTP for expiration test
make_request "POST" "/customer/send-otp" \
    "{\"phone\":\"+962790000088\"}" \
    "" \
    "EXP-001: Generate OTP for expiration test"

if [ "$LAST_HTTP_CODE" = "200" ]; then
    EXPIRATION_TEST_OTP=$(extract_test_otp)
    log_info "OTP for expiration test: $EXPIRATION_TEST_OTP"
    
    # In production, would wait for actual expiration
    # For development with mock OTP, test immediate verification
    make_request "POST" "/customer/verify-otp" \
        "{\"phone\":\"+962790000088\",\"otp\":\"$EXPIRATION_TEST_OTP\"}" \
        "" \
        "EXP-002: Verify OTP immediately (should work)"
    
    if [ "$LAST_HTTP_CODE" = "200" ]; then
        log_success "Fresh OTP verification successful"
    else
        log_error "Fresh OTP verification failed"
    fi
    
    # Test 43: Try to reuse the same OTP
    make_request "POST" "/customer/verify-otp" \
        "{\"phone\":\"+962790000088\",\"otp\":\"$EXPIRATION_TEST_OTP\"}" \
        "" \
        "EXP-003: Try to reuse OTP (should fail)"
    
    validate_error_response "400"
    
else
    log_error "Could not generate OTP for expiration test"
fi

# ========================================
# Database State Verification Commands
# ========================================

log_header "Database Verification Commands"

log_info "For manual verification, use these SQL commands in Supabase dashboard:"
echo ""
echo "-- Check created customers:"
echo "SELECT id, phone, name, created_at FROM users WHERE phone LIKE '+96279000000%' ORDER BY created_at DESC;"
echo ""
echo "-- Check created providers:"
echo "SELECT id, email, business_name_en, owner_name, verified, created_at FROM providers WHERE email LIKE '%@beautycort.test' ORDER BY created_at DESC;"
echo ""
echo "-- Check Supabase auth users:"
echo "SELECT id, email, created_at, email_confirmed_at FROM auth.users WHERE email LIKE '%@beautycort.test' ORDER BY created_at DESC;"
echo ""
echo "-- Cleanup test data:"
echo "DELETE FROM users WHERE phone LIKE '+96279000000%';"
echo "DELETE FROM providers WHERE email LIKE '%@beautycort.test';"
echo "DELETE FROM auth.users WHERE email LIKE '%@beautycort.test';"

# ========================================
# Supabase Dashboard Checklist
# ========================================

log_header "Supabase Dashboard Manual Verification Checklist"

echo "□ Open Supabase Dashboard: https://app.supabase.com/project/[your-project-id]"
echo "□ Navigate to Table Editor"
echo "□ Check 'users' table for new customer records"
echo "□ Check 'providers' table for new provider records"
echo "□ Navigate to Authentication > Users"
echo "□ Check auth.users table for provider auth records"
echo "□ Verify phone numbers are properly normalized (+962 format)"
echo "□ Verify provider accounts have verified=false initially"
echo "□ Check that duplicate email/phone constraints work"
echo "□ Monitor real-time updates during testing"
echo "□ Clean up test data after testing"

# ========================================
# Performance & Load Testing Notes
# ========================================

log_header "Performance Testing Notes"

echo "For load testing, consider:"
echo "• Use Apache Bench (ab) or wrk for concurrent requests"
echo "• Test rate limiting under concurrent load"
echo "• Monitor database connections and query performance"
echo "• Test OTP generation under high load"
echo "• Verify JWT token generation performance"
echo ""
echo "Example load test command:"
echo "ab -n 100 -c 10 -T application/json -p otp_payload.json $FULL_API_URL/customer/send-otp"

# ========================================
# Environment-Specific Testing Notes
# ========================================

log_header "Environment-Specific Testing Notes"

echo "DEVELOPMENT MODE:"
echo "• Mock OTP enabled - test OTPs included in responses"
echo "• Rate limiting may be disabled (SKIP_RATE_LIMIT=true)"
echo "• Supabase configuration may use test/local instance"
echo "• Error details more verbose for debugging"
echo ""
echo "PRODUCTION MODE:"
echo "• Real SMS sending via Twilio/Supabase"
echo "• Rate limiting fully enforced"
echo "• Error messages less detailed for security"
echo "• JWT secrets must be properly configured"
echo ""
echo "TESTING RECOMMENDATIONS:"
echo "• Use test phone numbers to avoid SMS costs"
echo "• Test with both valid and invalid Jordan phone formats"
echo "• Verify rate limiting with multiple IPs if possible"
echo "• Test OTP expiration with configurable timeouts"
echo "• Validate all error responses don't leak sensitive data"

# ========================================
# Test Results Summary
# ========================================

log_header "Test Results Summary"

echo -e "${WHITE}Total Tests: $TOTAL_TESTS${NC}"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}⚠️  Pass rate: $PASS_RATE%${NC}"
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi

# ========================================
# Expected Response Examples
# ========================================

: <<'EOF'
EXPECTED RESPONSE FORMATS:

1. Successful OTP Send:
{
  "success": true,
  "message": "OTP sent successfully to +962790000001",
  "data": {
    "phone": "+962790000001",
    "testOTP": "123456",
    "testMode": true,
    "warning": "OTP included for testing only - never do this in production!"
  }
}

2. Successful OTP Verification:
{
  "success": true,
  "message": "Phone verified successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone": "+962790000001",
      "name": "Test Customer",
      "language": "en",
      "created_at": "2025-01-12T15:32:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "customer"
  }
}

3. Successful Provider Signup:
{
  "success": true,
  "message": "Provider account created successfully. Pending verification.",
  "data": {
    "provider": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "business_name_ar": "صالون الجمال التجريبي",
      "business_name_en": "Test Beauty Salon",
      "owner_name": "Ahmed Ali",
      "phone": "+962780000002",
      "email": "testprovider1@beautycort.test",
      "verified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "provider"
  }
}

4. Validation Error (400):
{
  "success": false,
  "error": "Invalid phone number format. Please use Jordan format (e.g., 0791234567)"
}

5. Authentication Error (401):
{
  "success": false,
  "error": "Invalid email or password"
}

6. Resource Conflict (409):
{
  "success": false,
  "error": "Email already registered"
}

7. Rate Limit Error (429):
{
  "success": false,
  "error": "Too many OTP requests. Please try again after 15 minutes."
}

DATABASE STATE EXPECTATIONS:

After Customer OTP Verification:
- New record in 'users' table with normalized phone number
- created_at timestamp reflects verification time
- name field populated if provided

After Provider Signup:
- New record in 'providers' table with all business details
- verified field set to false initially
- New record in auth.users table with matching email
- email_confirmed_at initially null

Rate Limiting Behavior:
- OTP: Max 3 requests per 15 minutes per phone
- Auth: Max 10 requests per 15 minutes per IP
- After limit: HTTP 429 with retry-after information

OTP Expiration:
- Default: 10 minutes in development (configurable)
- Production: 5 minutes (configurable)
- OTP invalidated after successful use
- Expired OTPs return 400 error

Security Measures:
- SQL injection attempts return 400/401
- XSS attempts sanitized or rejected
- JWT manipulation returns 401
- Oversized payloads return 400/413
EOF
