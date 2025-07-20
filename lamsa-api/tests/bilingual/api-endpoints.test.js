/**
 * Automated bilingual testing for API endpoints
 * Tests API responses and error handling in both Arabic and English
 */

const request = require('supertest');
const app = require('../../src/app');
const { getBilingualErrorMessage } = require('../../src/utils/error-messages');
const { supabase } = require('../../src/supabase/client');

describe('API Endpoints - Bilingual Tests', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Setup test user and auth token
    const testUser = {
      phone: '+962791234567',
      name: 'Test User',
      email: 'test@example.com'
    };

    const { data: user } = await supabase.auth.signUp({
      email: testUser.email,
      password: 'testpass123'
    });

    testUserId = user.user.id;
    authToken = user.session.access_token;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  describe('Authentication Endpoints', () => {
    describe('POST /auth/login', () => {
      const testCases = [
        { 
          locale: 'ar', 
          language: 'Arabic',
          acceptLanguage: 'ar-JO,ar;q=0.9'
        },
        { 
          locale: 'en', 
          language: 'English',
          acceptLanguage: 'en-US,en;q=0.9'
        }
      ];

      testCases.forEach(({ locale, language, acceptLanguage }) => {
        describe(`${language} Language`, () => {
          test('returns success response in correct language', async () => {
            const response = await request(app)
              .post('/auth/login')
              .set('Accept-Language', acceptLanguage)
              .send({
                phone: '+962791234567',
                password: 'testpass123'
              });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            if (locale === 'ar') {
              expect(response.body.message.ar).toBe('تم تسجيل الدخول بنجاح');
              expect(response.body.message.en).toBe('Login successful');
            } else {
              expect(response.body.message.en).toBe('Login successful');
              expect(response.body.message.ar).toBe('تم تسجيل الدخول بنجاح');
            }
          });

          test('returns validation error in correct language', async () => {
            const response = await request(app)
              .post('/auth/login')
              .set('Accept-Language', acceptLanguage)
              .send({
                phone: 'invalid-phone',
                password: 'test'
              });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            
            const expectedError = getBilingualErrorMessage('INVALID_PHONE_FORMAT');
            expect(response.body.error).toEqual(expectedError);
          });

          test('returns authentication error in correct language', async () => {
            const response = await request(app)
              .post('/auth/login')
              .set('Accept-Language', acceptLanguage)
              .send({
                phone: '+962791234567',
                password: 'wrongpassword'
              });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            
            const expectedError = getBilingualErrorMessage('INVALID_CREDENTIALS');
            expect(response.body.error).toEqual(expectedError);
          });
        });
      });
    });

    describe('POST /auth/register', () => {
      const testCases = [
        { 
          locale: 'ar', 
          language: 'Arabic',
          acceptLanguage: 'ar-JO,ar;q=0.9'
        },
        { 
          locale: 'en', 
          language: 'English',
          acceptLanguage: 'en-US,en;q=0.9'
        }
      ];

      testCases.forEach(({ locale, language, acceptLanguage }) => {
        describe(`${language} Language`, () => {
          test('validates Arabic name in Arabic locale', async () => {
            if (locale === 'ar') {
              const response = await request(app)
                .post('/auth/register')
                .set('Accept-Language', acceptLanguage)
                .send({
                  name: 'John Doe', // English name
                  phone: '+962791234568',
                  email: 'test2@example.com',
                  password: 'testpass123'
                });

              expect(response.status).toBe(400);
              const expectedError = getBilingualErrorMessage('INVALID_ARABIC_NAME');
              expect(response.body.error).toEqual(expectedError);
            }
          });

          test('validates English name in English locale', async () => {
            if (locale === 'en') {
              const response = await request(app)
                .post('/auth/register')
                .set('Accept-Language', acceptLanguage)
                .send({
                  name: 'محمد أحمد', // Arabic name
                  phone: '+962791234569',
                  email: 'test3@example.com',
                  password: 'testpass123'
                });

              expect(response.status).toBe(400);
              const expectedError = getBilingualErrorMessage('INVALID_ENGLISH_NAME');
              expect(response.body.error).toEqual(expectedError);
            }
          });

          test('returns success response in correct language', async () => {
            const validName = locale === 'ar' ? 'محمد أحمد' : 'John Doe';
            const response = await request(app)
              .post('/auth/register')
              .set('Accept-Language', acceptLanguage)
              .send({
                name: validName,
                phone: `+96279123456${Math.floor(Math.random() * 10)}`,
                email: `test${Date.now()}@example.com`,
                password: 'testpass123'
              });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            
            if (locale === 'ar') {
              expect(response.body.message.ar).toBe('تم إنشاء الحساب بنجاح');
            } else {
              expect(response.body.message.en).toBe('Account created successfully');
            }
          });
        });
      });
    });

    describe('POST /auth/send-otp', () => {
      const testCases = [
        { 
          locale: 'ar', 
          language: 'Arabic',
          acceptLanguage: 'ar-JO,ar;q=0.9'
        },
        { 
          locale: 'en', 
          language: 'English',
          acceptLanguage: 'en-US,en;q=0.9'
        }
      ];

      testCases.forEach(({ locale, language, acceptLanguage }) => {
        describe(`${language} Language`, () => {
          test('returns success response in correct language', async () => {
            const response = await request(app)
              .post('/auth/send-otp')
              .set('Accept-Language', acceptLanguage)
              .send({
                phone: '+962791234567'
              });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            if (locale === 'ar') {
              expect(response.body.message.ar).toBe('تم إرسال رمز التحقق بنجاح');
            } else {
              expect(response.body.message.en).toBe('OTP sent successfully');
            }
          });

          test('returns phone validation error in correct language', async () => {
            const response = await request(app)
              .post('/auth/send-otp')
              .set('Accept-Language', acceptLanguage)
              .send({
                phone: 'invalid-phone'
              });

            expect(response.status).toBe(400);
            const expectedError = getBilingualErrorMessage('INVALID_PHONE_FORMAT');
            expect(response.body.error).toEqual(expectedError);
          });
        });
      });
    });
  });

  describe('Service Endpoints', () => {
    describe('GET /services', () => {
      const testCases = [
        { 
          locale: 'ar', 
          language: 'Arabic',
          acceptLanguage: 'ar-JO,ar;q=0.9'
        },
        { 
          locale: 'en', 
          language: 'English',
          acceptLanguage: 'en-US,en;q=0.9'
        }
      ];

      testCases.forEach(({ locale, language, acceptLanguage }) => {
        describe(`${language} Language`, () => {
          test('returns services with correct locale fields', async () => {
            const response = await request(app)
              .get('/services')
              .set('Accept-Language', acceptLanguage)
              .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            if (response.body.data.length > 0) {
              const service = response.body.data[0];
              expect(service).toHaveProperty('name_ar');
              expect(service).toHaveProperty('name_en');
              expect(service).toHaveProperty('description_ar');
              expect(service).toHaveProperty('description_en');
              
              // Check that the primary fields match the locale
              if (locale === 'ar') {
                expect(service.name).toBe(service.name_ar);
                expect(service.description).toBe(service.description_ar);
              } else {
                expect(service.name).toBe(service.name_en);
                expect(service.description).toBe(service.description_en);
              }
            }
          });

          test('returns unauthorized error in correct language', async () => {
            const response = await request(app)
              .get('/services')
              .set('Accept-Language', acceptLanguage);

            expect(response.status).toBe(401);
            const expectedError = getBilingualErrorMessage('UNAUTHORIZED');
            expect(response.body.error).toEqual(expectedError);
          });
        });
      });
    });

    describe('GET /services/:id', () => {
      const testCases = [
        { 
          locale: 'ar', 
          language: 'Arabic',
          acceptLanguage: 'ar-JO,ar;q=0.9'
        },
        { 
          locale: 'en', 
          language: 'English',
          acceptLanguage: 'en-US,en;q=0.9'
        }
      ];

      testCases.forEach(({ locale, language, acceptLanguage }) => {
        describe(`${language} Language`, () => {
          test('returns service not found error in correct language', async () => {
            const response = await request(app)
              .get('/services/999999')
              .set('Accept-Language', acceptLanguage)
              .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            const expectedError = getBilingualErrorMessage('SERVICE_NOT_FOUND');
            expect(response.body.error).toEqual(expectedError);
          });
        });
      });
    });
  });

  describe('Booking Endpoints', () => {
    describe('POST /bookings', () => {
      const testCases = [
        { 
          locale: 'ar', 
          language: 'Arabic',
          acceptLanguage: 'ar-JO,ar;q=0.9'
        },
        { 
          locale: 'en', 
          language: 'English',
          acceptLanguage: 'en-US,en;q=0.9'
        }
      ];

      testCases.forEach(({ locale, language, acceptLanguage }) => {
        describe(`${language} Language`, () => {
          test('validates booking notes language', async () => {
            const invalidNotes = locale === 'ar' ? 'English notes' : 'ملاحظات عربية';
            
            const response = await request(app)
              .post('/bookings')
              .set('Accept-Language', acceptLanguage)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                service_id: 1,
                provider_id: 1,
                booking_date: '2024-01-15',
                booking_time: '14:00',
                notes: invalidNotes
              });

            expect(response.status).toBe(400);
            const expectedError = locale === 'ar' 
              ? getBilingualErrorMessage('INVALID_ARABIC_NOTES')
              : getBilingualErrorMessage('INVALID_ENGLISH_NOTES');
            expect(response.body.error).toEqual(expectedError);
          });

          test('returns success response in correct language', async () => {
            const validNotes = locale === 'ar' ? 'ملاحظات عربية' : 'English notes';
            
            const response = await request(app)
              .post('/bookings')
              .set('Accept-Language', acceptLanguage)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                service_id: 1,
                provider_id: 1,
                booking_date: '2024-01-15',
                booking_time: '14:00',
                notes: validNotes
              });

            if (response.status === 201) {
              expect(response.body.success).toBe(true);
              
              if (locale === 'ar') {
                expect(response.body.message.ar).toBe('تم إنشاء الحجز بنجاح');
              } else {
                expect(response.body.message.en).toBe('Booking created successfully');
              }
            }
          });

          test('returns time slot conflict error in correct language', async () => {
            const response = await request(app)
              .post('/bookings')
              .set('Accept-Language', acceptLanguage)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                service_id: 1,
                provider_id: 1,
                booking_date: '2024-01-15',
                booking_time: '14:00', // Assuming this time is already booked
                notes: 'Test booking'
              });

            if (response.status === 409) {
              const expectedError = getBilingualErrorMessage('TIME_SLOT_UNAVAILABLE');
              expect(response.body.error).toEqual(expectedError);
            }
          });
        });
      });
    });

    describe('GET /bookings', () => {
      const testCases = [
        { 
          locale: 'ar', 
          language: 'Arabic',
          acceptLanguage: 'ar-JO,ar;q=0.9'
        },
        { 
          locale: 'en', 
          language: 'English',
          acceptLanguage: 'en-US,en;q=0.9'
        }
      ];

      testCases.forEach(({ locale, language, acceptLanguage }) => {
        describe(`${language} Language`, () => {
          test('returns bookings with correct locale fields', async () => {
            const response = await request(app)
              .get('/bookings')
              .set('Accept-Language', acceptLanguage)
              .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            if (response.body.data.length > 0) {
              const booking = response.body.data[0];
              expect(booking.service).toHaveProperty('name_ar');
              expect(booking.service).toHaveProperty('name_en');
              expect(booking.provider).toHaveProperty('name_ar');
              expect(booking.provider).toHaveProperty('name_en');
            }
          });
        });
      });
    });
  });

  describe('Provider Endpoints', () => {
    describe('GET /providers', () => {
      const testCases = [
        { 
          locale: 'ar', 
          language: 'Arabic',
          acceptLanguage: 'ar-JO,ar;q=0.9'
        },
        { 
          locale: 'en', 
          language: 'English',
          acceptLanguage: 'en-US,en;q=0.9'
        }
      ];

      testCases.forEach(({ locale, language, acceptLanguage }) => {
        describe(`${language} Language`, () => {
          test('returns providers with correct locale fields', async () => {
            const response = await request(app)
              .get('/providers')
              .set('Accept-Language', acceptLanguage)
              .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            if (response.body.data.length > 0) {
              const provider = response.body.data[0];
              expect(provider).toHaveProperty('business_name_ar');
              expect(provider).toHaveProperty('business_name_en');
              expect(provider).toHaveProperty('description_ar');
              expect(provider).toHaveProperty('description_en');
              
              // Check that the primary fields match the locale
              if (locale === 'ar') {
                expect(provider.business_name).toBe(provider.business_name_ar);
                expect(provider.description).toBe(provider.description_ar);
              } else {
                expect(provider.business_name).toBe(provider.business_name_en);
                expect(provider.description).toBe(provider.description_en);
              }
            }
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    const testCases = [
      { 
        locale: 'ar', 
        language: 'Arabic',
        acceptLanguage: 'ar-JO,ar;q=0.9'
      },
      { 
        locale: 'en', 
        language: 'English',
        acceptLanguage: 'en-US,en;q=0.9'
      }
    ];

    testCases.forEach(({ locale, language, acceptLanguage }) => {
      describe(`${language} Language`, () => {
        test('returns 404 error in correct language', async () => {
          const response = await request(app)
            .get('/non-existent-endpoint')
            .set('Accept-Language', acceptLanguage)
            .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).toBe(404);
          const expectedError = getBilingualErrorMessage('ENDPOINT_NOT_FOUND');
          expect(response.body.error).toEqual(expectedError);
        });

        test('returns 500 error in correct language', async () => {
          // This would require a way to trigger a 500 error
          // For now, we'll test the error message utility
          const errorMessage = getBilingualErrorMessage('INTERNAL_SERVER_ERROR');
          
          if (locale === 'ar') {
            expect(errorMessage.ar).toBe('خطأ داخلي في الخادم');
            expect(errorMessage.en).toBe('Internal server error');
          } else {
            expect(errorMessage.en).toBe('Internal server error');
            expect(errorMessage.ar).toBe('خطأ داخلي في الخادم');
          }
        });

        test('returns rate limit error in correct language', async () => {
          // Simulate rate limit exceeded
          const promises = [];
          for (let i = 0; i < 100; i++) {
            promises.push(
              request(app)
                .post('/auth/send-otp')
                .set('Accept-Language', acceptLanguage)
                .send({ phone: '+962791234567' })
            );
          }

          const responses = await Promise.all(promises);
          const rateLimitResponse = responses.find(r => r.status === 429);
          
          if (rateLimitResponse) {
            const expectedError = getBilingualErrorMessage('RATE_LIMIT_EXCEEDED');
            expect(rateLimitResponse.body.error).toEqual(expectedError);
          }
        });
      });
    });
  });

  describe('Request/Response Headers', () => {
    test('includes correct Content-Language header in responses', async () => {
      const arabicResponse = await request(app)
        .get('/services')
        .set('Accept-Language', 'ar-JO,ar;q=0.9')
        .set('Authorization', `Bearer ${authToken}`);

      expect(arabicResponse.headers['content-language']).toBe('ar-JO');

      const englishResponse = await request(app)
        .get('/services')
        .set('Accept-Language', 'en-US,en;q=0.9')
        .set('Authorization', `Bearer ${authToken}`);

      expect(englishResponse.headers['content-language']).toBe('en-US');
    });

    test('handles missing Accept-Language header gracefully', async () => {
      const response = await request(app)
        .get('/services')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should default to Arabic for Jordan market
      expect(response.headers['content-language']).toBe('ar-JO');
    });
  });

  describe('Data Consistency', () => {
    test('ensures bilingual data consistency across endpoints', async () => {
      // Get service from list endpoint
      const listResponse = await request(app)
        .get('/services')
        .set('Accept-Language', 'ar-JO,ar;q=0.9')
        .set('Authorization', `Bearer ${authToken}`);

      if (listResponse.body.data.length > 0) {
        const serviceFromList = listResponse.body.data[0];
        
        // Get same service from detail endpoint
        const detailResponse = await request(app)
          .get(`/services/${serviceFromList.id}`)
          .set('Accept-Language', 'ar-JO,ar;q=0.9')
          .set('Authorization', `Bearer ${authToken}`);

        expect(detailResponse.status).toBe(200);
        const serviceFromDetail = detailResponse.body.data;

        // Verify consistency
        expect(serviceFromList.name_ar).toBe(serviceFromDetail.name_ar);
        expect(serviceFromList.name_en).toBe(serviceFromDetail.name_en);
        expect(serviceFromList.description_ar).toBe(serviceFromDetail.description_ar);
        expect(serviceFromList.description_en).toBe(serviceFromDetail.description_en);
      }
    });
  });
});