const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './lamsa-api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    // Get all users
    console.log('Fetching all users...\n');
    const { data: users, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('Error fetching users:', error.message);
      return;
    }

    console.log('Total users:', users.length);
    console.log('\nUser details:');
    users.forEach(user => {
      console.log('---');
      console.log('ID:', user.id);
      console.log('Phone:', user.phone);
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Created:', user.created_at);
    });

    // Check for specific phone
    const testPhone = '+962771234568';
    console.log('\n---\nChecking for phone:', testPhone);
    const { data: specificUser, error: specificError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', testPhone)
      .single();

    if (specificError && specificError.code !== 'PGRST116') {
      console.error('Error:', specificError.message);
    } else if (specificUser) {
      console.log('✅ User exists with this phone');
      console.log('User ID:', specificUser.id);
    } else {
      console.log('❌ No user with this phone number');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();