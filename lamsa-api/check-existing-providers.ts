import { supabase, supabaseAdmin } from './src/config/supabase-simple';
import dotenv from 'dotenv';

dotenv.config();

async function checkExistingProviders() {
  console.log('🔍 Checking Existing Providers\n');
  
  // 1. List all providers in the database
  console.log('1️⃣ Fetching all providers from database...');
  try {
    const { data: providers, error } = await supabase
      .from('providers')
      .select('id, email, phone, business_name_en, created_at, status')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log('❌ Error fetching providers:', error.message);
    } else if (providers && providers.length > 0) {
      console.log(`✅ Found ${providers.length} providers:`);
      providers.forEach(provider => {
        console.log(`\n   Email: ${provider.email}`);
        console.log(`   Business: ${provider.business_name_en}`);
        console.log(`   Status: ${provider.status || 'Not set'}`);
        console.log(`   Created: ${new Date(provider.created_at).toLocaleString()}`);
      });
    } else {
      console.log('❌ No providers found in database');
    }
  } catch (err) {
    console.log('❌ Error:', err);
  }

  // 2. Check auth users if admin is available
  if (supabaseAdmin) {
    console.log('\n2️⃣ Checking Supabase Auth users...');
    try {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 50
      });

      if (error) {
        console.log('❌ Error fetching auth users:', error.message);
      } else if (users && users.length > 0) {
        // Filter for provider emails
        const providerUsers = users.filter(u => 
          u.email?.includes('provider') || 
          u.user_metadata?.type === 'provider'
        );
        
        console.log(`✅ Found ${providerUsers.length} provider auth users:`);
        providerUsers.forEach(user => {
          console.log(`\n   Email: ${user.email}`);
          console.log(`   ID: ${user.id}`);
          console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
          console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
          console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
        });
      }
    } catch (err) {
      console.log('❌ Error:', err);
    }
  }

  console.log('\n' + '=' .repeat(50));
}

checkExistingProviders()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Check failed:', err);
    process.exit(1);
  });