#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '../.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBuckets() {
  const buckets = [
    {
      name: 'provider-images',
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    },
    {
      name: 'user-avatars',
      public: true,
      fileSizeLimit: 2097152, // 2MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    }
  ];

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBucket } = await supabase.storage.getBucket(bucket.name);
      
      if (existingBucket) {
        console.log(`✅ Bucket '${bucket.name}' already exists`);
        continue;
      }

      // Create bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      });

      if (error) {
        console.error(`❌ Failed to create bucket '${bucket.name}':`, error.message);
      } else {
        console.log(`✅ Created bucket '${bucket.name}'`);
      }
    } catch (err) {
      console.error(`❌ Error with bucket '${bucket.name}':`, err.message);
    }
  }
}

createBuckets()
  .then(() => {
    console.log('\n✅ Storage bucket setup complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Storage bucket setup failed:', err);
    process.exit(1);
  });