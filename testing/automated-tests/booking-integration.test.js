/**
 * BeautyCort Booking Integration Tests
 * 
 * Tests the complete booking lifecycle from service discovery to completion,
 * including provider search, booking creation, status updates, and reviews.
 */

const request = require('supertest');
const { app } = require('../../beautycort-api/src/app');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/database');
const { createTestUser, createTestProvider, createTestService } = require('../helpers/test-data');

describe('Booking Integration Tests', () => {
  let testDatabase;
  let customerAuth, providerAuth;
  let testProvider, testService;

  beforeAll(async () => {
    testDatabase = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDatabase);
  });

  beforeEach(async () => {
    await testDatabase.query('BEGIN');
    
    // Create test customer and provider
    customerAuth = await createTestUser({
      phone: '+962771234567',
      name: 'Test Customer',
      location: { lat: 31.9539, lng: 35.9106 }
    });

    providerAuth = await createTestProvider({
      email: 'provider@test.com',
      businessName: 'Test Beauty Salon',
      location: { lat: 31.9565, lng: 35.8945 }, // ~2km from customer
      verified: true
    });

    testProvider = providerAuth.provider;

    // Create test service
    testService = await createTestService({
      providerId: testProvider.id,
      nameEn: 'Haircut & Styling',
      nameAr: 'قص وتصفيف شعر',
      price: 45.00,
      duration: 60,
      category: 'hair_styling'
    });
  });

  afterEach(async () => {
    await testDatabase.query('ROLLBACK');
  });

  describe('Service Discovery Flow', () => {
    test('should search providers by location', async () => {
      const response = await request(app)
        .get('/api/providers')
        .query({
          lat: 31.9539,  // Customer location
          lng: 35.9106,
          radius: 5000   // 5km radius
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          data: expect.arrayContaining([
            expect.objectContaining({
              id: testProvider.id,
              business_name: testProvider.business_name,
              distance_km: expect.any(Number),
              rating: expect.any(Number),
              total_reviews: expect.any(Number)
            })
          ]),
          total: expect.any(Number),
          page: 1,
          hasNext: expect.any(Boolean),
          hasPrev: false
        }
      });

      // Verify distance calculation
      const foundProvider = response.body.data.data.find(p => p.id === testProvider.id);
      expect(foundProvider.distance_km).toBeGreaterThan(0);
      expect(foundProvider.distance_km).toBeLessThan(5);
    });

    test('should filter providers by service category', async () => {
      // Create another provider with different services
      const spaProvider = await createTestProvider({
        email: 'spa@test.com',
        businessName: 'Test Spa',
        location: { lat: 31.9600, lng: 35.9000 }
      });

      await createTestService({
        providerId: spaProvider.provider.id,
        nameEn: 'Facial Treatment',
        nameAr: 'علاج الوجه',
        price: 65.00,
        duration: 90,
        category: 'skincare'
      });

      const response = await request(app)
        .post('/api/providers/search')
        .send({
          location: {
            lat: 31.9539,
            lng: 35.9106,
            radius: 5000
          },
          services: ['hair_styling']
        })
        .expect(200);

      // Should only return providers with hair styling services
      const providers = response.body.data.data;
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe(testProvider.id);
    });

    test('should filter providers by price range', async () => {
      // Create expensive service
      await createTestService({
        providerId: testProvider.id,
        nameEn: 'Premium Hair Treatment',
        nameAr: 'علاج شعر فاخر',
        price: 150.00,
        duration: 120,
        category: 'hair_styling'
      });

      const response = await request(app)
        .post('/api/providers/search')
        .send({
          location: {
            lat: 31.9539,
            lng: 35.9106,
            radius: 5000
          },
          priceRange: {
            min: 0,
            max: 50
          }
        })
        .expect(200);

      const providers = response.body.data.data;
      providers.forEach(provider => {
        expect(provider.min_price).toBeLessThanOrEqual(50);
      });
    });

    test('should return providers sorted by distance', async () => {
      // Create providers at different distances
      const nearProvider = await createTestProvider({
        email: 'near@test.com',
        businessName: 'Near Salon',
        location: { lat: 31.9540, lng: 35.9107 } // Very close
      });

      const farProvider = await createTestProvider({
        email: 'far@test.com',
        businessName: 'Far Salon',
        location: { lat: 31.9800, lng: 35.9500 } // Further away
      });

      const response = await request(app)
        .get('/api/providers')
        .query({
          lat: 31.9539,
          lng: 35.9106,
          radius: 10000
        })
        .expect(200);

      const providers = response.body.data.data;
      expect(providers.length).toBeGreaterThanOrEqual(3);

      // Verify sorted by distance
      for (let i = 1; i < providers.length; i++) {
        expect(providers[i].distance_km).toBeGreaterThanOrEqual(providers[i-1].distance_km);
      }
    });

    test('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/providers')
        .query({
          lat: 32.5000,  // Far from any test providers
          lng: 36.0000,
          radius: 1000   // Small radius
        })
        .expect(200);

      expect(response.body.data.data).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });
  });

  describe('Provider Details and Availability', () => {
    test('should get provider details with services and reviews', async () => {
      const response = await request(app)
        .get(`/api/providers/${testProvider.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testProvider.id,
          business_name: testProvider.business_name,
          services_by_category: expect.any(Object),
          reviews_summary: expect.objectContaining({
            average_rating: expect.any(Number),
            total_reviews: expect.any(Number),
            rating_distribution: expect.any(Object)
          }),
          availability: expect.any(Array)
        })
      });
    });

    test('should check provider availability for specific date', async () => {
      // Set up provider availability
      await testDatabase.query(`
        INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available)
        VALUES ($1, 1, '09:00', '17:00', true)
      `, [testProvider.id]); // Monday availability

      const monday = '2024-01-15'; // Assuming this is a Monday
      const response = await request(app)
        .get(`/api/providers/${testProvider.id}/availability`)
        .query({ date: monday })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          date: monday,
          provider_id: testProvider.id,
          slots: expect.arrayContaining([
            expect.objectContaining({
              time: expect.stringMatching(/^\d{2}:\d{2}$/),
              available: expect.any(Boolean)
            })
          ])
        }
      });

      // Should have multiple 30-minute slots between 09:00 and 17:00
      const slots = response.body.data.slots;
      expect(slots.length).toBeGreaterThan(10);
      expect(slots[0].time).toBe('09:00');
      expect(slots[slots.length - 1].time).toBe('16:30');
    });

    test('should show unavailable slots for existing bookings', async () => {
      // Set up availability
      await testDatabase.query(`
        INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available)
        VALUES ($1, 1, '09:00', '17:00', true)
      `, [testProvider.id]);

      // Create existing booking
      await testDatabase.query(`
        INSERT INTO bookings (id, user_id, provider_id, service_id, booking_date, start_time, end_time, 
                             total_price, original_price, status)
        VALUES ('existing-booking', $1, $2, $3, '2024-01-15', '14:00', '15:00', 45.00, 45.00, 'confirmed')
      `, [customerAuth.user.id, testProvider.id, testService.id]);

      const response = await request(app)
        .get(`/api/providers/${testProvider.id}/availability`)
        .query({ date: '2024-01-15' })
        .expect(200);

      const slots = response.body.data.slots;
      const bookedSlot = slots.find(slot => slot.time === '14:00');
      expect(bookedSlot.available).toBe(false);
    });
  });

  describe('Booking Creation Flow', () => {
    beforeEach(async () => {
      // Set up provider availability for booking tests
      await testDatabase.query(`
        INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available)
        VALUES ($1, 1, '09:00', '17:00', true)
      `, [testProvider.id]);
    });

    test('should create booking successfully', async () => {
      const bookingData = {
        providerId: testProvider.id,
        serviceId: testService.id,
        date: '2024-01-15',
        time: '14:00',
        notes: 'Please use organic products',
        location_type: 'salon'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send(bookingData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          userId: customerAuth.user.id,
          providerId: testProvider.id,
          serviceId: testService.id,
          booking_date: '2024-01-15',
          start_time: '14:00:00',
          end_time: '15:00:00', // Service duration is 60 minutes
          status: 'pending',
          total_price: 45.00,
          original_price: 45.00,
          user_notes: 'Please use organic products'
        })
      });

      // Verify booking was created in database
      const bookingQuery = await testDatabase.query(
        'SELECT * FROM bookings WHERE id = $1',
        [response.body.data.id]
      );
      expect(bookingQuery.rows).toHaveLength(1);
    });

    test('should calculate booking fees correctly', async () => {
      const bookingData = {
        providerId: testProvider.id,
        serviceId: testService.id,
        date: '2024-01-15',
        time: '14:00'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send(bookingData)
        .expect(201);

      const booking = response.body.data;
      
      // Platform fee should be 15% of total price
      const expectedPlatformFee = Math.round(booking.total_price * 0.15 * 100) / 100;
      const expectedProviderEarnings = booking.total_price - expectedPlatformFee;

      expect(booking.platform_fee).toBe(expectedPlatformFee);
      expect(booking.provider_earnings).toBe(expectedProviderEarnings);
    });

    test('should prevent double booking in same time slot', async () => {
      const bookingData = {
        providerId: testProvider.id,
        serviceId: testService.id,
        date: '2024-01-15',
        time: '14:00'
      };

      // Create first booking
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send(bookingData)
        .expect(201);

      // Try to create overlapping booking
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({
          ...bookingData,
          time: '14:30' // Overlaps with first booking (14:00-15:00)
        })
        .expect(409);

      expect(response.body.error.message).toContain('time slot not available');
    });

    test('should validate booking date is in future', async () => {
      const bookingData = {
        providerId: testProvider.id,
        serviceId: testService.id,
        date: '2023-01-15', // Past date
        time: '14:00'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error.message).toContain('future date');
    });

    test('should validate booking time is within provider availability', async () => {
      const bookingData = {
        providerId: testProvider.id,
        serviceId: testService.id,
        date: '2024-01-15',
        time: '08:00' // Before provider opening hours (09:00)
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error.message).toContain('not available');
    });

    test('should handle mobile service booking with customer location', async () => {
      // Update provider to offer mobile services
      await testDatabase.query(
        'UPDATE providers SET is_mobile = true, travel_radius_km = 10 WHERE id = $1',
        [testProvider.id]
      );

      const bookingData = {
        providerId: testProvider.id,
        serviceId: testService.id,
        date: '2024-01-15',
        time: '14:00',
        location_type: 'customer',
        user_location: {
          lat: 31.9600,
          lng: 35.9000
        },
        user_address: 'Customer Address, Amman'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        location_type: 'customer',
        user_address: 'Customer Address, Amman'
      });
    });

    test('should apply promotion discount if valid code provided', async () => {
      // Create promotion
      const promotionId = await testDatabase.query(`
        INSERT INTO promotions (id, provider_id, code, title_en, title_ar, promotion_type, 
                               discount_value, valid_from, valid_until, active)
        VALUES ('test-promo', $1, 'SAVE10', 'Save 10%', 'وفر 10%', 'percentage', 
                10, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', true)
        RETURNING id
      `, [testProvider.id]);

      const bookingData = {
        providerId: testProvider.id,
        serviceId: testService.id,
        date: '2024-01-15',
        time: '14:00',
        promotionCode: 'SAVE10'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send(bookingData)
        .expect(201);

      const booking = response.body.data;
      expect(booking.original_price).toBe(45.00);
      expect(booking.discount_amount).toBe(4.50); // 10% of 45
      expect(booking.total_price).toBe(40.50);
    });
  });

  describe('Booking Management Lifecycle', () => {
    let testBookingId;

    beforeEach(async () => {
      // Create a test booking for management tests
      const bookingResult = await testDatabase.query(`
        INSERT INTO bookings (id, user_id, provider_id, service_id, booking_date, start_time, end_time,
                             total_price, original_price, status, user_notes)
        VALUES ('test-booking', $1, $2, $3, '2024-01-15', '14:00', '15:00', 45.00, 45.00, 'pending', 'Test booking')
        RETURNING id
      `, [customerAuth.user.id, testProvider.id, testService.id]);
      
      testBookingId = bookingResult.rows[0].id;
    });

    test('customer should view their bookings', async () => {
      const response = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          data: expect.arrayContaining([
            expect.objectContaining({
              id: testBookingId,
              status: 'pending',
              total_price: 45.00
            })
          ])
        }
      });
    });

    test('provider should view their bookings', async () => {
      const response = await request(app)
        .get('/api/bookings/provider')
        .set('Authorization', `Bearer ${providerAuth.token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          data: expect.arrayContaining([
            expect.objectContaining({
              id: testBookingId,
              status: 'pending',
              provider_id: testProvider.id
            })
          ])
        }
      });
    });

    test('should get booking details', async () => {
      const response = await request(app)
        .get(`/api/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testBookingId,
          userId: customerAuth.user.id,
          providerId: testProvider.id,
          serviceId: testService.id,
          user_notes: 'Test booking'
        })
      });
    });

    test('provider should confirm booking', async () => {
      const response = await request(app)
        .patch(`/api/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${providerAuth.token}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.data.status).toBe('confirmed');

      // Verify in database
      const bookingQuery = await testDatabase.query(
        'SELECT status FROM bookings WHERE id = $1',
        [testBookingId]
      );
      expect(bookingQuery.rows[0].status).toBe('confirmed');
    });

    test('customer should cancel booking', async () => {
      const response = await request(app)
        .patch(`/api/bookings/${testBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({ reason: 'Schedule changed' })
        .expect(200);

      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.cancellation_reason).toBe('Schedule changed');
      expect(response.body.data.cancelled_by).toBe('customer');
    });

    test('should reschedule booking', async () => {
      // Set up availability for new time slot
      await testDatabase.query(`
        INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available)
        VALUES ($1, 2, '09:00', '17:00', true)
      `, [testProvider.id]); // Tuesday availability

      const response = await request(app)
        .patch(`/api/bookings/${testBookingId}/reschedule`)
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({
          date: '2024-01-16', // Tuesday
          time: '10:00'
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: testBookingId,
        booking_date: '2024-01-16',
        start_time: '10:00:00',
        status: 'confirmed' // Auto-confirm reschedule
      });
    });

    test('should prevent unauthorized booking access', async () => {
      // Create another customer
      const otherCustomer = await createTestUser({
        phone: '+962779999999',
        name: 'Other Customer'
      });

      const response = await request(app)
        .get(`/api/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${otherCustomer.token}`)
        .expect(403);

      expect(response.body.error.message).toContain('access');
    });
  });

  describe('Service Completion and Reviews', () => {
    let completedBookingId;

    beforeEach(async () => {
      // Create completed booking for review tests
      const bookingResult = await testDatabase.query(`
        INSERT INTO bookings (id, user_id, provider_id, service_id, booking_date, start_time, end_time,
                             total_price, original_price, status, completed_at)
        VALUES ('completed-booking', $1, $2, $3, '2024-01-10', '14:00', '15:00', 45.00, 45.00, 'completed', NOW())
        RETURNING id
      `, [customerAuth.user.id, testProvider.id, testService.id]);
      
      completedBookingId = bookingResult.rows[0].id;
    });

    test('provider should mark service as completed', async () => {
      // Start with confirmed booking
      await testDatabase.query(
        'UPDATE bookings SET status = $1 WHERE id = $2',
        ['confirmed', completedBookingId]
      );

      const response = await request(app)
        .patch(`/api/bookings/${completedBookingId}/complete`)
        .set('Authorization', `Bearer ${providerAuth.token}`)
        .send({
          provider_notes: 'Service completed successfully'
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        status: 'completed',
        provider_notes: 'Service completed successfully',
        completed_at: expect.any(String)
      });
    });

    test('customer should submit review after service completion', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({
          bookingId: completedBookingId,
          rating: 5,
          comment: 'Excellent service! Very professional and friendly staff.'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          booking_id: completedBookingId,
          user_id: customerAuth.user.id,
          provider_id: testProvider.id,
          rating: 5,
          comment: 'Excellent service! Very professional and friendly staff.'
        })
      });

      // Verify provider rating was updated
      const providerQuery = await testDatabase.query(
        'SELECT rating, total_reviews FROM providers WHERE id = $1',
        [testProvider.id]
      );
      
      expect(providerQuery.rows[0].rating).toBeGreaterThan(0);
      expect(providerQuery.rows[0].total_reviews).toBeGreaterThan(0);
    });

    test('should prevent duplicate reviews for same booking', async () => {
      // Submit first review
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({
          bookingId: completedBookingId,
          rating: 5,
          comment: 'Great service'
        })
        .expect(201);

      // Try to submit second review
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({
          bookingId: completedBookingId,
          rating: 4,
          comment: 'Still good'
        })
        .expect(409);

      expect(response.body.error.message).toContain('already reviewed');
    });

    test('provider should respond to customer review', async () => {
      // Create review first
      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({
          bookingId: completedBookingId,
          rating: 4,
          comment: 'Good service, could be improved'
        })
        .expect(201);

      const reviewId = reviewResponse.body.data.id;

      // Provider responds to review
      const response = await request(app)
        .patch(`/api/reviews/${reviewId}/response`)
        .set('Authorization', `Bearer ${providerAuth.token}`)
        .send({
          response: 'Thank you for your feedback! We appreciate your suggestions.'
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        response: 'Thank you for your feedback! We appreciate your suggestions.',
        response_at: expect.any(String)
      });
    });

    test('should trigger loyalty points after booking completion', async () => {
      // Complete booking (should trigger loyalty points)
      await testDatabase.query(
        'UPDATE bookings SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', completedBookingId]
      );

      // Check loyalty transaction was created
      const loyaltyQuery = await testDatabase.query(
        'SELECT * FROM loyalty_transactions WHERE user_id = $1 AND booking_id = $2',
        [customerAuth.user.id, completedBookingId]
      );

      expect(loyaltyQuery.rows).toHaveLength(1);
      expect(loyaltyQuery.rows[0].transaction_type).toBe('earned');
      expect(loyaltyQuery.rows[0].points_change).toBeGreaterThan(0);

      // Check user loyalty status was updated
      const statusQuery = await testDatabase.query(
        'SELECT * FROM user_loyalty_status WHERE user_id = $1',
        [customerAuth.user.id]
      );

      expect(statusQuery.rows).toHaveLength(1);
      expect(statusQuery.rows[0].total_points).toBeGreaterThan(0);
      expect(statusQuery.rows[0].total_bookings).toBe(1);
      expect(statusQuery.rows[0].lifetime_spent).toBe(45.00);
    });
  });

  describe('Booking Edge Cases and Error Handling', () => {
    test('should handle booking service that no longer exists', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({
          providerId: testProvider.id,
          serviceId: 'non-existent-service',
          date: '2024-01-15',
          time: '14:00'
        })
        .expect(404);

      expect(response.body.error.message).toContain('Service not found');
    });

    test('should handle booking with inactive provider', async () => {
      // Deactivate provider
      await testDatabase.query(
        'UPDATE providers SET active = false WHERE id = $1',
        [testProvider.id]
      );

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: '2024-01-15',
          time: '14:00'
        })
        .expect(400);

      expect(response.body.error.message).toContain('Provider not available');
    });

    test('should handle booking too far in advance', async () => {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 35); // 35 days ahead

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: farFutureDate.toISOString().split('T')[0],
          time: '14:00'
        })
        .expect(400);

      expect(response.body.error.message).toContain('advance booking limit');
    });

    test('should handle concurrent booking attempts', async () => {
      const bookingData = {
        providerId: testProvider.id,
        serviceId: testService.id,
        date: '2024-01-15',
        time: '14:00'
      };

      // Set up availability
      await testDatabase.query(`
        INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available)
        VALUES ($1, 1, '09:00', '17:00', true)
      `, [testProvider.id]);

      // Simulate concurrent booking attempts
      const promises = [
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerAuth.token}`)
          .send(bookingData),
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerAuth.token}`)
          .send(bookingData)
      ];

      const results = await Promise.allSettled(promises);

      // One should succeed, one should fail
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failures = results.filter(r => r.status === 'fulfilled' && r.value.status !== 201);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
    });
  });
});
