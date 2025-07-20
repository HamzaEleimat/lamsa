#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TEST_PHONE = '+962777123456';

console.log('🔐 Testing OTP Flow with Mock System');
console.log('=====================================\n');

async function testOTPFlow() {
  try {
    // Step 1: Send OTP
    console.log('📱 Step 1: Sending OTP to', TEST_PHONE);
    const sendResponse = await axios.post(`${BASE_URL}/auth/customer/send-otp`, {
      phone: TEST_PHONE
    });
    
    console.log('✅ Response:', JSON.stringify(sendResponse.data, null, 2));
    
    // In development mode with mock OTP, we need to check the server console
    // for the actual OTP code. For automated testing, we'll use a known test OTP
    // The mock system should log: "📱 Mock OTP sent to {phone}: {otp}"
    
    console.log('\n⚠️  In development mode, the OTP is logged to the server console.');
    console.log('Look for: "📱 Mock OTP sent to +962777123456: XXXXXX"\n');
    
    // For demonstration, let's try with a test OTP pattern
    // We'll need to manually check server logs for the actual OTP
    
    // Step 2: Let's demonstrate the verification endpoint structure
    console.log('📝 Step 2: OTP Verification Request Structure:');
    const verifyPayload = {
      phone: TEST_PHONE,
      otp: '123456', // Replace with actual OTP from server logs
      name: 'Test Customer'
    };
    console.log(JSON.stringify(verifyPayload, null, 2));
    
    console.log('\n💡 To complete verification, replace the OTP in the payload above');
    console.log('with the actual OTP from the server console logs.\n');
    
    // Step 3: Show what a successful response looks like
    console.log('🎯 Expected Successful Response Structure:');
    console.log(JSON.stringify({
      success: true,
      message: 'Phone verified successfully',
      data: {
        user: {
          id: 'uuid',
          phone: TEST_PHONE,
          name: 'Test Customer',
          role: 'customer',
          created_at: 'timestamp'
        },
        token: 'JWT_TOKEN_HERE'
      }
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testOTPFlow();