#!/usr/bin/env node

/**
 * Script to activate pending providers in development
 * Usage: node scripts/activate-providers.js [email]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function activateProviders(email) {
  try {
    let query = supabase
      .from('providers')
      .update({ 
        status: 'active',
        verified_at: new Date().toISOString()
      })
      .eq('status', 'pending_verification');

    // If email is provided, only update that specific provider
    if (email) {
      query = query.eq('email', email);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error('Error updating providers:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ Activated ${data.length} provider(s):`);
      data.forEach(provider => {
        console.log(`   - ${provider.email} (${provider.business_name_en})`);
      });
    } else {
      console.log('No pending providers found to activate');
    }
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Get email from command line arguments
const email = process.argv[2];

console.log('🔄 Activating pending providers...');
if (email) {
  console.log(`   Looking for provider with email: ${email}`);
}

activateProviders(email).then(() => {
  console.log('✅ Done');
  process.exit(0);
});