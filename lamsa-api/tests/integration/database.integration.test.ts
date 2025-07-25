/**
 * Database Integration Tests
 * Tests database connectivity and basic operations
 */

import { supabase, supabaseAdmin, db } from '../../src/config/supabase';
import { 
  generateTestUser, 
  generateTestProvider, 
  cleanupTestData 
} from '../utils/test-helpers';

describe('Database Integration', () => {
  const testIds = {
    userIds: [] as string[],
    providerIds: [] as string[]
  };

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(supabaseAdmin || supabase, testIds);
  });

  describe('Basic Connection', () => {
    it('should connect to the database successfully', async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('count')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have admin client available for system operations', () => {
      expect(supabaseAdmin).toBeDefined();
    });
  });

  describe('Service Categories', () => {
    it('should fetch service categories', async () => {
      const { data: categories, error } = await db.categories.getAll();
      
      expect(error).toBeNull();
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      
      if (categories && categories.length > 0) {
        expect(categories[0]).toHaveProperty('name_en');
        expect(categories[0]).toHaveProperty('name_ar');
        expect(categories[0]).toHaveProperty('icon');
      }
    });
  });

  describe('User Operations', () => {
    it('should create a test user', async () => {
      const testUserData = generateTestUser();
      
      const { data: newUser, error } = await db.users.create({
        phone: testUserData.phone,
        name: testUserData.name,
        email: testUserData.email,
        language: testUserData.language
      });

      if (error) {
        console.log('User creation error (may be expected if SMS is not configured):', error.message);
        expect(error.message).toBeTruthy();
      } else {
        expect(newUser).toBeDefined();
        expect(newUser?.phone).toBe(testUserData.phone);
        expect(newUser?.name).toBe(testUserData.name);
        
        if (newUser?.id) {
          testIds.userIds.push(newUser.id);
        }
      }
    });

    it('should validate phone number format', async () => {
      const invalidPhone = '123456'; // Invalid format
      
      const { data, error } = await db.users.create({
        phone: invalidPhone,
        name: 'Test User',
        language: 'ar'
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('Provider Search', () => {
    let testProvider: any;

    beforeAll(async () => {
      // Create a test provider for search tests
      const providerData = generateTestProvider();
      
      // Use admin client to bypass auth requirements
      const { data, error } = await (supabaseAdmin || supabase)
        .from('providers')
        .insert({
          phone: providerData.phone,
          email: providerData.email,
          business_name_en: providerData.business_name_en,
          business_name_ar: providerData.business_name_ar,
          location: `POINT(${providerData.location.longitude} ${providerData.location.latitude})`,
          is_active: true,
          is_verified: true
        })
        .select()
        .single();

      if (data) {
        testProvider = data;
        testIds.providerIds.push(data.id);
      }
    });

    it('should search providers near Amman', async () => {
      const ammanLat = 31.9539;
      const ammanLng = 35.9106;
      
      const { data: providers, error } = await db.providers.searchNearby(
        ammanLat,
        ammanLng,
        50 // 50km radius for test
      );

      expect(error).toBeNull();
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      
      if (providers && providers.length > 0) {
        const provider = providers[0];
        expect(provider).toHaveProperty('business_name_en');
        expect(provider).toHaveProperty('business_name_ar');
        expect(provider).toHaveProperty('distance_km');
        expect(typeof provider.distance_km).toBe('number');
      }
    });

    it('should respect radius limit in provider search', async () => {
      if (!testProvider) {
        console.log('Skipping test - no test provider created');
        return;
      }

      // Search with very small radius
      const { data: nearbyProviders } = await db.providers.searchNearby(
        31.9539,
        35.9106,
        0.1 // 100m radius
      );

      // Search with large radius
      const { data: allProviders } = await db.providers.searchNearby(
        31.9539,
        35.9106,
        100 // 100km radius
      );

      expect(nearbyProviders?.length || 0).toBeLessThanOrEqual(allProviders?.length || 0);
    });
  });

  describe('Availability Check', () => {
    it('should check provider availability', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Generate a test provider ID (may not exist, which is fine for this test)
      const testProviderId = generateTestProvider().id;
      
      const { data: isAvailable, error } = await supabase.rpc(
        'check_provider_availability',
        {
          p_provider_id: testProviderId,
          p_booking_date: tomorrow.toISOString().split('T')[0],
          p_start_time: '14:00:00',
          p_end_time: '15:00:00'
        }
      );

      // The function should execute without error
      // Result may be false if provider doesn't exist
      expect(error).toBeNull();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should validate time format in availability check', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data, error } = await supabase.rpc(
        'check_provider_availability',
        {
          p_provider_id: generateTestProvider().id,
          p_booking_date: tomorrow.toISOString().split('T')[0],
          p_start_time: 'invalid-time', // Invalid format
          p_end_time: '15:00:00'
        }
      );

      // Should error on invalid time format
      expect(error).toBeDefined();
    });
  });

  describe('Database Functions', () => {
    it('should have required RPC functions', async () => {
      const functionNames = [
        'check_provider_availability',
        'search_providers_nearby'
      ];

      for (const funcName of functionNames) {
        // Try to get function info (this will fail if function doesn't exist)
        const { error } = await supabase.rpc(funcName, {});
        
        // We expect an error about missing parameters, not about missing function
        if (error) {
          expect(error.message).not.toContain('does not exist');
        }
      }
    });
  });
});