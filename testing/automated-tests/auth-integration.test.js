/**
 * BeautyCort Authentication Integration Tests
 * 
 * Tests the complete authentication flow for both customers and providers,
 * including OTP verification, session management, and token refresh.
 */

const request = require('supertest');
const { app } = require('../../beautycort-api/src/app');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/database');
const { mockSMSService } = require('../helpers/mock-services');

describe('Authentication Integration Tests', () => {
  let testDatabase;

  beforeAll(async () => {
    testDatabase = await setupTestDatabase();
    mockSMSService.enableMockMode();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDatabase);
    mockSMSService.disableMockMode();
  });

  beforeEach(async () => {
    await testDatabase.query('BEGIN');
  });

  afterEach(async () => {
    await testDatabase.query('ROLLBACK');
  });

  describe('Customer Phone-Based Authentication', () => {
    const validPhoneNumbers = [
      '+962771234567',
      '+962781234567', 
      '+962791234567'
    ];

    const invalidPhoneNumbers = [
      '+96277123456',   // Too short
      '+9627712345678', // Too long
      '+962751234567',  // Invalid prefix
      '0771234567',     // Missing country code
      '+1234567890'     // Wrong country
    ];

    describe('OTP Request Flow', () => {
      test.each(validPhoneNumbers)('should send OTP to valid Jordan phone number: %s', async (phone) => {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('OTP sent successfully'),
          data: {
            phone: phone,
            testMode: true,
            testOTP: expect.stringMatching(/^\d{6}$/)
          }
        });

        // Verify OTP was stored in mock service
        const storedOTP = mockSMSService.getOTP(phone);
        expect(storedOTP).toBeTruthy();
        expect(storedOTP.otp).toMatch(/^\d{6}$/);
        expect(storedOTP.expiresAt).toBeInstanceOf(Date);
      });

      test.each(invalidPhoneNumbers)('should reject invalid phone number: %s', async (phone) => {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Invalid phone number')
          })
        });
      });

      test('should handle rate limiting for OTP requests', async () => {
        const phone = '+962771234567';

        // Send multiple OTP requests
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/auth/customer/send-otp')
            .send({ phone })
            .expect(200);
        }

        // 6th request should be rate limited
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
          .expect(429);

        expect(response.body.error.message).toContain('rate limit');
      });

      test('should handle missing phone number', async () => {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({})
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Phone number is required')
          })
        });
      });
    });

    describe('OTP Verification Flow', () => {
      let testPhone, testOTP;

      beforeEach(async () => {
        testPhone = '+962771234567';
        
        // Send OTP first
        await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone: testPhone })
          .expect(200);

        testOTP = mockSMSService.getOTP(testPhone).otp;
      });

      test('should verify valid OTP and create user session', async () => {
        const response = await request(app)
          .post('/api/auth/verify-otp')
          .send({
            phone: testPhone,
            otp: testOTP,
            name: 'Test Customer'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            token: expect.any(String),
            user: {
              phone: testPhone,
              name: 'Test Customer',
              id: expect.any(String)
            }
          }
        });

        // Verify JWT token is valid
        const token = response.body.data.token;
        expect(token).toMatch(/^eyJ/); // JWT format
        
        // Verify user was created in database
        const userQuery = await testDatabase.query(
          'SELECT * FROM users WHERE phone = $1',
          [testPhone]
        );
        expect(userQuery.rows).toHaveLength(1);
        expect(userQuery.rows[0].name).toBe('Test Customer');
      });

      test('should handle invalid OTP', async () => {
        const response = await request(app)
          .post('/api/auth/verify-otp')
          .send({
            phone: testPhone,
            otp: '000000', // Invalid OTP
            name: 'Test Customer'
          })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Invalid or expired OTP')
          })
        });
      });

      test('should handle expired OTP', async () => {
        // Manually expire the OTP
        mockSMSService.expireOTP(testPhone);

        const response = await request(app)
          .post('/api/auth/verify-otp')
          .send({
            phone: testPhone,
            otp: testOTP,
            name: 'Test Customer'
          })
          .expect(400);

        expect(response.body.error.message).toContain('expired');
      });

      test('should handle OTP verification without prior OTP request', async () => {
        const response = await request(app)
          .post('/api/auth/verify-otp')
          .send({
            phone: '+962779999999', // Phone with no OTP sent
            otp: '123456',
            name: 'Test Customer'
          })
          .expect(400);

        expect(response.body.error.message).toContain('Invalid or expired OTP');
      });

      test('should login existing user with OTP verification', async () => {
        // Create user first
        await testDatabase.query(
          'INSERT INTO users (id, phone, name) VALUES ($1, $2, $3)',
          ['existing-user-id', testPhone, 'Existing Customer']
        );

        const response = await request(app)
          .post('/api/auth/verify-otp')
          .send({
            phone: testPhone,
            otp: testOTP
          })
          .expect(200);

        expect(response.body.data.user).toMatchObject({
          phone: testPhone,
          name: 'Existing Customer',
          id: 'existing-user-id'
        });
      });
    });

    describe('Token Management', () => {
      let authToken, userId;

      beforeEach(async () => {
        // Create authenticated user
        const authResponse = await authenticateTestCustomer('+962771234567');
        authToken = authResponse.token;
        userId = authResponse.user.id;
      });

      test('should access protected endpoint with valid token', async () => {
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.user.id).toBe(userId);
      });

      test('should reject access with invalid token', async () => {
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body.error.message).toContain('Invalid token');
      });

      test('should refresh expired token', async () => {
        // Mock an expired token scenario
        const expiredToken = 'expired-jwt-token';

        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: expiredToken })
          .expect(401); // Should fail with expired token

        expect(response.body.error.message).toContain('Invalid refresh token');
      });

      test('should logout and invalidate session', async () => {
        // Logout
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Try to access protected endpoint after logout
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(401);

        expect(response.body.error.message).toContain('Invalid token');
      });
    });
  });

  describe('Provider Email/Password Authentication', () => {
    const validProvider = {
      email: 'provider@test.com',
      password: 'ValidPassword123!',
      phone: '+962771111111',
      business_name_ar: 'صالون تجميل',
      business_name_en: 'Beauty Salon',
      owner_name: 'Test Owner',
      latitude: 31.9539,
      longitude: 35.9106,
      address: {
        street: 'Test Street',
        city: 'Amman',
        district: 'Abdali',
        country: 'Jordan'
      }
    };

    describe('Provider Registration', () => {
      test('should register new provider successfully', async () => {
        const response = await request(app)
          .post('/api/auth/provider/signup')
          .send(validProvider)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            provider: {
              email: validProvider.email,
              business_name_en: validProvider.business_name_en,
              business_name_ar: validProvider.business_name_ar,
              owner_name: validProvider.owner_name,
              phone: validProvider.phone,
              verified: false // New providers start unverified
            },
            token: expect.any(String),
            type: 'provider'
          }
        });

        // Verify provider was created in database
        const providerQuery = await testDatabase.query(
          'SELECT * FROM providers WHERE email = $1',
          [validProvider.email]
        );
        expect(providerQuery.rows).toHaveLength(1);
        expect(providerQuery.rows[0].verified).toBe(false);
      });

      test('should reject duplicate email registration', async () => {
        // Register provider first
        await request(app)
          .post('/api/auth/provider/signup')
          .send(validProvider)
          .expect(201);

        // Try to register with same email
        const response = await request(app)
          .post('/api/auth/provider/signup')
          .send({
            ...validProvider,
            business_name_en: 'Different Salon'
          })
          .expect(409);

        expect(response.body.error.message).toContain('Email already registered');
      });

      test('should reject duplicate phone number registration', async () => {
        // Register provider first
        await request(app)
          .post('/api/auth/provider/signup')
          .send(validProvider)
          .expect(201);

        // Try to register with same phone
        const response = await request(app)
          .post('/api/auth/provider/signup')
          .send({
            ...validProvider,
            email: 'different@test.com'
          })
          .expect(409);

        expect(response.body.error.message).toContain('Phone number already registered');
      });

      test('should validate required fields', async () => {
        const requiredFields = [
          'email', 'password', 'phone', 'business_name_ar', 
          'business_name_en', 'owner_name', 'latitude', 'longitude'
        ];

        for (const field of requiredFields) {
          const incompleteProvider = { ...validProvider };
          delete incompleteProvider[field];

          const response = await request(app)
            .post('/api/auth/provider/signup')
            .send(incompleteProvider)
            .expect(400);

          expect(response.body.error.message).toContain(field);
        }
      });

      test('should validate password strength', async () => {
        const weakPasswords = [
          '123456',          // Too short
          'password',        // No numbers/special chars
          'PASSWORD123',     // No lowercase
          'password123'      // No uppercase
        ];

        for (const password of weakPasswords) {
          const response = await request(app)
            .post('/api/auth/provider/signup')
            .send({
              ...validProvider,
              password,
              email: `test${Math.random()}@test.com`
            })
            .expect(400);

          expect(response.body.error.message).toContain('Password');
        }
      });

      test('should validate email format', async () => {
        const invalidEmails = [
          'notanemail',
          '@test.com',
          'test@',
          'test.test.com'
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/api/auth/provider/signup')
            .send({
              ...validProvider,
              email
            })
            .expect(400);

          expect(response.body.error.message).toContain('email');
        }
      });

      test('should validate Jordan coordinates', async () => {
        const invalidCoordinates = [
          { latitude: 40.0, longitude: 35.9106 },  // Outside Jordan
          { latitude: 31.9539, longitude: 30.0 },  // Outside Jordan
          { latitude: 'invalid', longitude: 35.9106 }, // Invalid type
        ];

        for (const coords of invalidCoordinates) {
          const response = await request(app)
            .post('/api/auth/provider/signup')
            .send({
              ...validProvider,
              email: `test${Math.random()}@test.com`,
              ...coords
            })
            .expect(400);

          expect(response.body.error.message).toMatch(/latitude|longitude|Invalid/);
        }
      });
    });

    describe('Provider Login', () => {
      let registeredProvider;

      beforeEach(async () => {
        // Register and verify a provider for login tests
        const signupResponse = await request(app)
          .post('/api/auth/provider/signup')
          .send(validProvider)
          .expect(201);

        registeredProvider = signupResponse.body.data.provider;

        // Manually verify the provider in database
        await testDatabase.query(
          'UPDATE providers SET verified = true WHERE email = $1',
          [validProvider.email]
        );
      });

      test('should login verified provider successfully', async () => {
        const response = await request(app)
          .post('/api/auth/provider/login')
          .send({
            email: validProvider.email,
            password: validProvider.password
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            provider: {
              id: registeredProvider.id,
              email: validProvider.email,
              business_name_en: validProvider.business_name_en,
              business_name_ar: validProvider.business_name_ar
            },
            token: expect.any(String),
            type: 'provider'
          }
        });
      });

      test('should reject login for unverified provider', async () => {
        // Set provider as unverified
        await testDatabase.query(
          'UPDATE providers SET verified = false WHERE email = $1',
          [validProvider.email]
        );

        const response = await request(app)
          .post('/api/auth/provider/login')
          .send({
            email: validProvider.email,
            password: validProvider.password
          })
          .expect(403);

        expect(response.body.error.message).toContain('not verified');
      });

      test('should reject invalid email', async () => {
        const response = await request(app)
          .post('/api/auth/provider/login')
          .send({
            email: 'nonexistent@test.com',
            password: validProvider.password
          })
          .expect(401);

        expect(response.body.error.message).toContain('Invalid email or password');
      });

      test('should reject invalid password', async () => {
        const response = await request(app)
          .post('/api/auth/provider/login')
          .send({
            email: validProvider.email,
            password: 'wrongpassword'
          })
          .expect(401);

        expect(response.body.error.message).toContain('Invalid email or password');
      });

      test('should handle missing credentials', async () => {
        const response = await request(app)
          .post('/api/auth/provider/login')
          .send({})
          .expect(400);

        expect(response.body.error.message).toMatch(/email|password/);
      });
    });

    describe('Provider Password Reset', () => {
      beforeEach(async () => {
        // Register provider for password reset tests
        await request(app)
          .post('/api/auth/provider/signup')
          .send(validProvider)
          .expect(201);
      });

      test('should initiate password reset for existing provider', async () => {
        const response = await request(app)
          .post('/api/auth/provider/forgot-password')
          .send({ email: validProvider.email })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('reset instructions')
        });
      });

      test('should not reveal non-existent email addresses', async () => {
        const response = await request(app)
          .post('/api/auth/provider/forgot-password')
          .send({ email: 'nonexistent@test.com' })
          .expect(200);

        // Should return success even for non-existent emails (security)
        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('reset link will be sent')
        });
      });

      test('should validate reset token format', async () => {
        const response = await request(app)
          .post('/api/auth/provider/reset-password')
          .send({
            token: 'invalid-short-token',
            newPassword: 'NewPassword123!'
          })
          .expect(400);

        expect(response.body.error.message).toContain('Invalid or expired reset token');
      });

      test('should validate new password strength', async () => {
        const response = await request(app)
          .post('/api/auth/provider/reset-password')
          .send({
            token: 'a'.repeat(32), // Valid length token
            newPassword: '123' // Too weak
          })
          .expect(400);

        expect(response.body.error.message).toContain('Password must be at least 6 characters');
      });
    });
  });

  describe('Cross-Authentication Security', () => {
    test('customer token should not access provider endpoints', async () => {
      const customerAuth = await authenticateTestCustomer('+962771234567');

      const response = await request(app)
        .get('/api/provider/dashboard')
        .set('Authorization', `Bearer ${customerAuth.token}`)
        .expect(403);

      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    test('provider token should not access customer-specific endpoints', async () => {
      const providerAuth = await authenticateTestProvider();

      const response = await request(app)
        .get('/api/customer/loyalty-status')
        .set('Authorization', `Bearer ${providerAuth.token}`)
        .expect(403);

      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    test('should handle concurrent login sessions properly', async () => {
      // Login from multiple devices/sessions
      const auth1 = await authenticateTestCustomer('+962771234567');
      const auth2 = await authenticateTestCustomer('+962771234567');

      // Both sessions should be valid
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${auth1.token}`)
        .expect(200);

      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${auth2.token}`)
        .expect(200);
    });
  });

  // Helper functions
  async function authenticateTestCustomer(phone) {
    // Send OTP
    await request(app)
      .post('/api/auth/customer/send-otp')
      .send({ phone });

    const otp = mockSMSService.getOTP(phone).otp;

    // Verify OTP
    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        phone,
        otp,
        name: 'Test Customer'
      });

    return response.body.data;
  }

  async function authenticateTestProvider() {
    // Register provider
    const signupResponse = await request(app)
      .post('/api/auth/provider/signup')
      .send({
        ...validProvider,
        email: `provider${Math.random()}@test.com`
      });

    // Verify provider
    await testDatabase.query(
      'UPDATE providers SET verified = true WHERE email = $1',
      [signupResponse.body.data.provider.email]
    );

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/provider/login')
      .send({
        email: signupResponse.body.data.provider.email,
        password: validProvider.password
      });

    return loginResponse.body.data;
  }
});
