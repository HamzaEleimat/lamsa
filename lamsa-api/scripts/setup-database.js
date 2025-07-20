const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDatabaseSetup() {
  try {
    console.log('🔄 Setting up database schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Note: Supabase doesn't support running raw SQL through the client library
    // You need to run this schema directly in the Supabase SQL editor
    console.log('⚠️  Please run the following SQL in your Supabase SQL editor:');
    console.log('📍 Navigate to: https://app.supabase.com/project/[your-project-id]/sql/new');
    console.log('📋 Copy and paste the schema from: database/schema.sql');
    console.log('\n✅ After running the schema, your database will be ready!');
    
    // Test connection
    const { data, error } = await supabase.from('users').select('count').limit(0);
    
    if (error && error.code === '42P01') {
      console.log('\n❌ Tables not found. Please run the schema.sql file in Supabase SQL editor first.');
    } else if (!error) {
      console.log('\n✅ Database connection successful!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runDatabaseSetup();