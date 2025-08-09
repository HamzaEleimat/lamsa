#!/usr/bin/env node

/**
 * Minimal Setup Test Providers for Postman API Testing
 * Uses ONLY columns that exist in the actual database schema
 * 
 * Usage: node postman/scripts/setup-test-providers.js
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const TEST_PASSWORD = 'TestProvider123!';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test provider data - ONLY using columns that exist in schema
const testProviders = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    email: 'test.provider1@lamsa.test',
    phone: '+962781234567',
    business_name_en: 'Test Beauty Salon',
    business_name_ar: 'صالون التجميل التجريبي',
    owner_name: 'Test Owner One',
    description_en: 'Test beauty salon for API testing purposes',
    description_ar: 'صالون تجميل تجريبي لأغراض اختبار API',
    latitude: 31.9539,
    longitude: 35.9106,
    address: {
      street_en: '123 Test Street',
      street_ar: 'شارع الاختبار 123',
      area_en: 'Abdoun',
      area_ar: 'عبدون',
      city_en: 'Amman',
      city_ar: 'عمان',
      building_no: '123'
    },
    commercial_registration_no: 'TEST-REG-001',
    status: 'active',
    accepts_cash: true,
    accepts_card: false,
    services: [
      {
        id: 'd1111111-1111-1111-1111-111111111111',
        name_en: 'Test Hair Cut',
        name_ar: 'قص شعر تجريبي',
        description_en: 'Basic hair cut service for testing',
        description_ar: 'خدمة قص شعر أساسية للاختبار',
        price: 20.00,
        duration_minutes: 30,
        category: 'Hair Styling'
      },
      {
        id: 'd2222222-2222-2222-2222-222222222222',
        name_en: 'Test Hair Coloring',
        name_ar: 'صبغ شعر تجريبي',
        description_en: 'Premium hair coloring service for testing',
        description_ar: 'خدمة صبغ شعر متميزة للاختبار',
        price: 50.00,
        duration_minutes: 120,
        category: 'Hair Styling'
      }
    ]
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    email: 'test.provider2@lamsa.test',
    phone: '+962787654321',
    business_name_en: 'Test Mobile Stylist',
    business_name_ar: 'مصففة الشعر المتنقلة التجريبية',
    owner_name: 'Test Owner Two',
    description_en: 'Test mobile beauty service for API testing',
    description_ar: 'خدمة تجميل متنقلة تجريبية لاختبار API',
    latitude: 31.9594,
    longitude: 35.8428,
    address: {
      street_en: '456 Mobile Base',
      street_ar: 'قاعدة المتنقل 456',
      area_en: 'Sweifieh',
      area_ar: 'الصويفية',
      city_en: 'Amman',
      city_ar: 'عمان',
      building_no: '456'
    },
    commercial_registration_no: 'TEST-REG-002',
    status: 'active',
    accepts_cash: true,
    accepts_card: true,
    services: [
      {
        id: 'd3333333-3333-3333-3333-333333333333',
        name_en: 'Mobile Hair Styling',
        name_ar: 'تصفيف شعر متنقل',
        description_en: 'Professional hair styling at your location',
        description_ar: 'تصفيف شعر احترافي في موقعك',
        price: 35.00,
        duration_minutes: 60,
        category: 'Hair Styling'
      }
    ]
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    email: 'test.provider3@lamsa.test',
    phone: '+962799876543',
    business_name_en: 'Test Nail Studio',
    business_name_ar: 'استوديو الأظافر التجريبي',
    owner_name: 'Test Owner Three',
    description_en: 'Test nail studio for API testing',
    description_ar: 'استوديو أظافر تجريبي لاختبار API',
    latitude: 31.9515,
    longitude: 35.9239,
    address: {
      street_en: '789 Nail Plaza',
      street_ar: 'بلازا الأظافر 789',
      area_en: 'Rainbow Street',
      area_ar: 'شارع الرينبو',
      city_en: 'Amman',
      city_ar: 'عمان',
      building_no: '789'
    },
    commercial_registration_no: 'TEST-REG-003',
    status: 'active',
    accepts_cash: true,
    accepts_card: false,
    services: [
      {
        id: 'd5555555-5555-5555-5555-555555555555',
        name_en: 'Test Manicure',
        name_ar: 'مانيكير تجريبي',
        description_en: 'Basic manicure service for testing',
        description_ar: 'خدمة مانيكير أساسية للاختبار',
        price: 15.00,
        duration_minutes: 45,
        category: 'Nail Care'
      }
    ]
  }
];

async function setupTestProviders() {
  console.log('🔄 Setting up minimal test providers for Postman testing...\n');

  try {
    // Generate password hash
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    console.log('✅ Generated password hash for test providers');

    // Get service categories
    const { data: categories, error: catError } = await supabase
      .from('service_categories')
      .select('id, name_en');
    
    if (catError) {
      console.error('❌ Error fetching service categories:', catError);
      return;
    }

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name_en] = cat.id;
    });

    // Process each test provider
    for (const provider of testProviders) {
      console.log(`\n📝 Processing ${provider.business_name_en}...`);

      // Create location point
      const locationPoint = `POINT(${provider.longitude} ${provider.latitude})`;

      // Create or update provider - ONLY using columns that exist
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .upsert({
          id: provider.id,
          email: provider.email,
          password_hash: passwordHash,
          phone: provider.phone,
          business_name_en: provider.business_name_en,
          business_name_ar: provider.business_name_ar,
          owner_name: provider.owner_name,
          description_en: provider.description_en,
          description_ar: provider.description_ar,
          latitude: provider.latitude,
          longitude: provider.longitude,
          location: locationPoint,
          address: provider.address,
          commercial_registration_no: provider.commercial_registration_no,
          status: provider.status,
          rating: 4.5,
          total_reviews: 10,
          accepts_cash: provider.accepts_cash,
          accepts_card: provider.accepts_card,
          advance_booking_days: 30,
          cancellation_hours: 24,
          verified_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'email'
        })
        .select();

      if (providerError) {
        console.error(`❌ Error creating provider ${provider.email}:`, providerError);
        continue;
      }

      console.log(`✅ Provider ${provider.email} created/updated`);

      // Create services for the provider
      for (const service of provider.services) {
        const categoryId = categoryMap[service.category];
        if (!categoryId) {
          console.warn(`⚠️  Category '${service.category}' not found, skipping service ${service.name_en}`);
          continue;
        }

        const { error: serviceError } = await supabase
          .from('services')
          .upsert({
            id: service.id,
            provider_id: provider.id,
            category_id: categoryId,
            name_en: service.name_en,
            name_ar: service.name_ar,
            description_en: service.description_en,
            description_ar: service.description_ar,
            price: service.price,
            duration_minutes: service.duration_minutes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (serviceError) {
          console.error(`❌ Error creating service ${service.name_en}:`, serviceError);
        } else {
          console.log(`   ✅ Service: ${service.name_en} (${service.price} JOD)`);
        }
      }
    }

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST PROVIDERS SUMMARY');
    console.log('='.repeat(60));
    console.log('\nProvider Credentials (all use same password):');
    console.log(`Password: ${TEST_PASSWORD}\n`);
    
    testProviders.forEach((p, i) => {
      console.log(`Provider ${i + 1}:`);
      console.log(`  Email: ${p.email}`);
      console.log(`  Phone: ${p.phone}`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Services: ${p.services.map(s => s.name_en).join(', ')}`);
      console.log('');
    });

    console.log('✅ Test providers setup complete!');
    console.log('📝 You can now use these providers in your Postman tests');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the setup
setupTestProviders().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});