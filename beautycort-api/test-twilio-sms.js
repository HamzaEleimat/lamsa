const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTwilioSMS() {
  console.log('🔍 Testing Supabase + Twilio SMS Integration\n');
  
  // Test phone numbers
  const testPhones = [
    '+34663758161',  // Spanish number
    '+14247884091',  // US number (your Twilio number - won't work as recipient)
  ];
  
  for (const phone of testPhones) {
    console.log(`\n📱 Testing with phone: ${phone}`);
    console.log('=' .repeat(50));
    
    try {
      // Method 1: signInWithOtp
      console.log('\n1️⃣ Testing signInWithOtp...');
      const { data: otpData, error: otpError } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          channel: 'sms',
        }
      });
      
      if (otpError) {
        console.error('❌ OTP Error:', otpError);
      } else {
        console.log('✅ OTP Response:', JSON.stringify(otpData, null, 2));
        
        // Check for Twilio message ID
        if (otpData?.messageId) {
          console.log('📨 Twilio Message ID:', otpData.messageId);
          console.log('✅ SMS should have been sent via Twilio!');
        } else {
          console.log('⚠️  No messageId returned - SMS may not have been sent');
        }
      }
      
    } catch (err) {
      console.error('💥 Unexpected error:', err);
    }
  }
  
  console.log('\n\n📋 Troubleshooting Tips:');
  console.log('1. Check Supabase Dashboard > Logs for Twilio errors');
  console.log('2. Verify phone numbers in Twilio Console if using trial account');
  console.log('3. Check Twilio Console > Monitor > Logs for SMS delivery status');
  console.log('4. Ensure Twilio Messaging Service SID is correctly configured in Supabase');
  console.log('5. For trial accounts: Both sender and recipient must be verified numbers');
}

testTwilioSMS();