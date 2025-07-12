const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = 'http://localhost:3001/api';

// Test phone numbers configured in the system
const TEST_PHONES = {
  jordan: '+962777123456',
  us: '+17025551234',
  spain: '+34663758161'
};

async function testSMSDelivery() {
  console.log('\n🚀 BeautyCort Production SMS Test\n');
  console.log('Available test phone numbers:');
  console.log('1. Jordan: ' + TEST_PHONES.jordan);
  console.log('2. US: ' + TEST_PHONES.us);
  console.log('3. Spain: ' + TEST_PHONES.spain);
  
  rl.question('\nSelect phone number (1-3) or enter custom: ', async (answer) => {
    let phone;
    
    if (answer === '1') phone = TEST_PHONES.jordan;
    else if (answer === '2') phone = TEST_PHONES.us;
    else if (answer === '3') phone = TEST_PHONES.spain;
    else if (answer.startsWith('+')) phone = answer;
    else {
      console.log('❌ Invalid selection');
      rl.close();
      return;
    }
    
    console.log(`\n📱 Testing with phone: ${phone}`);
    console.log('📤 Sending OTP...\n');
    
    try {
      // Send OTP
      const sendResponse = await axios.post(`${BASE_URL}/auth/customer/send-otp`, {
        phone: phone
      });
      
      console.log('Response:', JSON.stringify(sendResponse.data, null, 2));
      
      if (sendResponse.data.success) {
        console.log('\n✅ OTP request sent successfully!');
        
        // Check if it's mock mode
        if (sendResponse.data.data.testMode) {
          console.log('\n⚠️  Running in TEST MODE - Mock OTP provided');
          console.log(`📱 Mock OTP: ${sendResponse.data.data.testOTP}`);
          console.log('ℹ️  In production, the OTP would be sent via SMS\n');
        } else {
          console.log('\n📱 Check your phone for the SMS with OTP code');
          console.log('ℹ️  If SMS not received, check:');
          console.log('   - Supabase dashboard > Authentication > Phone Auth is enabled');
          console.log('   - Twilio integration is configured in Supabase');
          console.log('   - Phone number is verified in Twilio (if in trial mode)\n');
        }
        
        // Wait for OTP input
        rl.question('Enter the OTP code: ', async (otp) => {
          try {
            console.log('\n🔐 Verifying OTP...\n');
            
            const verifyResponse = await axios.post(`${BASE_URL}/auth/customer/verify-otp`, {
              phone: phone,
              otp: otp,
              name: 'Test User'
            });
            
            console.log('Verification Response:', JSON.stringify(verifyResponse.data, null, 2));
            
            if (verifyResponse.data.success) {
              console.log('\n✅ Phone verified successfully!');
              console.log(`🔑 JWT Token: ${verifyResponse.data.data.token.substring(0, 50)}...`);
              
              // Test protected endpoint
              console.log('\n🔒 Testing protected endpoint...');
              const profileResponse = await axios.get(`${BASE_URL}/users/profile`, {
                headers: {
                  'Authorization': `Bearer ${verifyResponse.data.data.token}`
                }
              });
              
              console.log('Profile Response:', JSON.stringify(profileResponse.data, null, 2));
              console.log('\n✅ Authentication working correctly!');
            }
          } catch (error) {
            console.error('\n❌ Verification failed:', error.response?.data || error.message);
          }
          
          rl.close();
        });
      }
    } catch (error) {
      console.error('\n❌ Failed to send OTP:', error.response?.data || error.message);
      console.log('\nTroubleshooting:');
      console.log('1. Ensure the API server is running on port 3001');
      console.log('2. Check Supabase configuration in .env file');
      console.log('3. Verify Supabase Phone Auth is enabled');
      console.log('4. Check Twilio integration in Supabase dashboard\n');
      rl.close();
    }
  });
}

// Check if server is running
axios.get(`${BASE_URL}/health`)
  .then(() => {
    console.log('✅ API server is running');
    testSMSDelivery();
  })
  .catch(() => {
    console.error('❌ API server is not running. Please start it with: npm run dev');
    process.exit(1);
  });
