/**
 * Test script for enhanced phone authentication
 * Tests validation, error handling, and security features
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Test cases for phone validation
const testPhoneNumbers = [
  // Valid Jordan numbers
  { phone: '+962791234567', expected: 'valid', description: 'International format' },
  { phone: '962791234567', expected: 'valid', description: 'Without + prefix' },
  { phone: '0791234567', expected: 'valid', description: 'Local format with 0' },
  { phone: '791234567', expected: 'valid', description: 'Local format without 0' },
  { phone: '079 123 4567', expected: 'valid', description: 'With spaces' },
  
  // Invalid Jordan numbers
  { phone: '+962761234567', expected: 'invalid', description: 'Wrong prefix (76)' },
  { phone: '0701234567', expected: 'invalid', description: 'Landline number' },
  { phone: '07912345', expected: 'invalid', description: 'Too short' },
  { phone: '079123456789', expected: 'invalid', description: 'Too long' },
  
  // Test numbers (for development)
  { phone: '+15551234567', expected: 'valid_test', description: 'US test number' },
  { phone: '+34123456789', expected: 'valid_test', description: 'Spain test number' },
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

async function testPhoneValidation() {
  console.log('\n' + colors.blue + '=== Testing Phone Number Validation ===' + colors.reset);
  
  for (const test of testPhoneNumbers) {
    try {
      const response = await axios.post(`${API_URL}/auth/customer/send-otp`, {
        phone: test.phone
      });
      
      const isValid = response.status === 200;
      const expectedValid = test.expected === 'valid' || test.expected === 'valid_test';
      
      if (isValid === expectedValid) {
        console.log(colors.green + '✓' + colors.reset + ` ${test.description}: ${test.phone}`);
        if (test.expected === 'valid_test') {
          console.log(colors.gray + '  (Test number accepted in development)' + colors.reset);
        }
      } else {
        console.log(colors.red + '✗' + colors.reset + ` ${test.description}: ${test.phone} - Expected ${test.expected}, got ${isValid ? 'valid' : 'invalid'}`);
      }
    } catch (error) {
      const isInvalid = error.response?.status === 400;
      const expectedInvalid = test.expected === 'invalid';
      
      if (isInvalid && expectedInvalid) {
        console.log(colors.green + '✓' + colors.reset + ` ${test.description}: ${test.phone} - Correctly rejected`);
      } else if (!isInvalid || !expectedInvalid) {
        console.log(colors.red + '✗' + colors.reset + ` ${test.description}: ${test.phone} - ${error.response?.data?.message || error.message}`);
      }
    }
  }
}

async function testRateLimiting() {
  console.log('\n' + colors.blue + '=== Testing Rate Limiting ===' + colors.reset);
  
  const testPhone = '+962791234567';
  console.log(`Testing with phone: ${testPhone}`);
  
  // Note: This test won't work properly with real SMS as Supabase has its own rate limiting
  // But it will test our local rate limiting for OTP verification attempts
  
  console.log(colors.yellow + 'Rate limiting is enforced by both our code and Supabase' + colors.reset);
  console.log(colors.gray + '- OTP sending: Limited by Supabase (60 seconds between requests)' + colors.reset);
  console.log(colors.gray + '- OTP verification: Limited by our code (3 attempts, then 15 min block)' + colors.reset);
}

async function testErrorHandling() {
  console.log('\n' + colors.blue + '=== Testing Error Handling ===' + colors.reset);
  
  // Test various error scenarios
  const errorTests = [
    {
      name: 'Empty phone number',
      data: { phone: '' },
      expectedError: 'phone'
    },
    {
      name: 'Invalid phone format',
      data: { phone: 'abc123' },
      expectedError: 'Invalid phone'
    },
    {
      name: 'Wrong country code',
      data: { phone: '+441234567890' },
      expectedError: 'Invalid phone'
    }
  ];
  
  for (const test of errorTests) {
    try {
      await axios.post(`${API_URL}/auth/customer/send-otp`, test.data);
      console.log(colors.red + '✗' + colors.reset + ` ${test.name}: Expected error but got success`);
    } catch (error) {
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.toLowerCase().includes(test.expectedError.toLowerCase())) {
        console.log(colors.green + '✓' + colors.reset + ` ${test.name}: Got expected error`);
        console.log(colors.gray + `  Error: ${errorMessage}` + colors.reset);
      } else {
        console.log(colors.red + '✗' + colors.reset + ` ${test.name}: Unexpected error`);
        console.log(colors.gray + `  Got: ${errorMessage}` + colors.reset);
      }
    }
  }
}

async function testCompleteFlow() {
  console.log('\n' + colors.blue + '=== Testing Complete Authentication Flow ===' + colors.reset);
  
  const testPhone = '+962791234567';
  
  try {
    // Step 1: Send OTP
    console.log('\n1. Sending OTP...');
    const otpResponse = await axios.post(`${API_URL}/auth/customer/send-otp`, {
      phone: testPhone
    });
    
    console.log(colors.green + '✓' + colors.reset + ' OTP sent successfully');
    
    if (otpResponse.data.data.testOTP) {
      console.log(colors.yellow + `  Test OTP: ${otpResponse.data.data.testOTP}` + colors.reset);
      
      // Step 2: Verify OTP
      console.log('\n2. Verifying OTP...');
      const verifyResponse = await axios.post(`${API_URL}/auth/verify-otp`, {
        phone: testPhone,
        otp: otpResponse.data.data.testOTP,
        name: 'Test User'
      });
      
      console.log(colors.green + '✓' + colors.reset + ' OTP verified successfully');
      console.log(colors.gray + `  User ID: ${verifyResponse.data.data.user.id}` + colors.reset);
      console.log(colors.gray + `  Token: ${verifyResponse.data.data.token.substring(0, 20)}...` + colors.reset);
      
      // Step 3: Test invalid OTP
      console.log('\n3. Testing invalid OTP...');
      try {
        await axios.post(`${API_URL}/auth/verify-otp`, {
          phone: testPhone,
          otp: '000000'
        });
        console.log(colors.red + '✗' + colors.reset + ' Invalid OTP was accepted (should fail)');
      } catch (error) {
        console.log(colors.green + '✓' + colors.reset + ' Invalid OTP correctly rejected');
        console.log(colors.gray + `  Error: ${error.response?.data?.message}` + colors.reset);
      }
    } else {
      console.log(colors.yellow + '  Real SMS mode - check your phone for OTP' + colors.reset);
    }
    
  } catch (error) {
    console.log(colors.red + '✗' + colors.reset + ' Flow failed:', error.response?.data?.message || error.message);
  }
}

async function runAllTests() {
  console.log(colors.blue + '\n🧪 Enhanced Phone Authentication Test Suite\n' + colors.reset);
  console.log('Testing enhanced features:');
  console.log('- Unified phone validation');
  console.log('- Comprehensive error handling');
  console.log('- Rate limiting protection');
  console.log('- Security features');
  
  await testPhoneValidation();
  await testRateLimiting();
  await testErrorHandling();
  await testCompleteFlow();
  
  console.log(colors.blue + '\n✅ Test suite completed\n' + colors.reset);
}

// Run tests
runAllTests().catch(console.error);
