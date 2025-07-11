const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSMSConfiguration() {
  console.log('🔍 Checking Supabase SMS Configuration...\n');
  
  // Test sending OTP
  const testPhone = '+34663758161';
  console.log(`📱 Attempting to send OTP to: ${testPhone}`);
  
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: testPhone,
    });
    
    if (error) {
      console.error('❌ Error sending OTP:', error);
      console.error('\nPossible issues:');
      console.error('1. Phone Auth might not be enabled in Supabase Dashboard');
      console.error('2. SMS provider (Twilio/MessageBird) might not be configured');
      console.error('3. Test phone number might be in a region not supported by your SMS provider');
      console.error('4. SMS provider credentials might be incorrect');
    } else {
      console.log('✅ OTP request successful!');
      console.log('Response data:', data);
      console.log('\nIf you didn\'t receive an SMS, check:');
      console.log('1. Your Supabase Dashboard > Authentication > Providers > Phone');
      console.log('2. Your SMS provider dashboard for delivery status');
      console.log('3. Phone number format and region support');
    }
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
  
  console.log('\n📋 Supabase URL:', supabaseUrl);
  console.log('📋 Using Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
}

checkSMSConfiguration();