/**
 * Comprehensive Test Helper Utilities
 * Provides utility functions for all types of testing scenarios
 */

const { faker } = require('@faker-js/faker');
const jwt = require('jsonwebtoken');

/**
 * Test Helper Class
 * Central utility class for all testing operations
 */
class TestHelpers {
  /**
   * Generate JWT token for testing
   */
  static generateJWT(payload, options = {}) {
    const defaultPayload = {
      id: payload.id || faker.string.uuid(),
      type: payload.type || 'customer',
      phone: payload.phone || '+962791234567',
      email: payload.email || faker.internet.email(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (options.expiresIn || 3600) // 1 hour default
    };

    const finalPayload = { ...defaultPayload, ...payload };
    const secret = options.secret || process.env.JWT_SECRET || 'test-secret';

    return jwt.sign(finalPayload, secret);
  }

  /**
   * Generate multiple JWT tokens
   */
  static generateJWTBatch(count, basePayload = {}, options = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.generateJWT({
        ...basePayload,
        id: `test-user-${index}`,
        phone: `+96277${String(index).padStart(7, '0')}`
      }, options)
    );
  }

  /**
   * Create test date utilities
   */
  static createDateHelpers() {
    const now = new Date();
    
    return {
      today: () => now.toISOString().split('T')[0],
      tomorrow: () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 1);
        return date.toISOString().split('T')[0];
      },
      nextWeek: () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
      },
      nextMonth: () => {
        const date = new Date(now);
        date.setMonth(date.getMonth() + 1);
        return date.toISOString().split('T')[0];
      },
      daysFromNow: (days) => {
        const date = new Date(now);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
      },
      businessHourTime: () => {
        const hour = faker.number.int({ min: 8, max: 21 });
        const minute = faker.helpers.arrayElement(['00', '15', '30', '45']);
        return `${hour.toString().padStart(2, '0')}:${minute}`;
      },
      timeSlot: (baseHour, increment = 0) => {
        const hour = baseHour + increment;
        return `${hour.toString().padStart(2, '0')}:00`;
      }
    };
  }

  /**
   * Create Jordan-specific test data
   */
  static createJordanTestData() {
    return {
      phone: () => {
        const prefixes = ['77', '78', '79'];
        const prefix = faker.helpers.arrayElement(prefixes);
        const number = faker.string.numeric(7);
        return `+962${prefix}${number}`;
      },
      
      arabicName: () => {
        const arabicNames = [
          'أحمد محمد', 'فاطمة علي', 'محمد أحمد', 'عائشة محمود',
          'علي حسن', 'مريم عبدالله', 'يوسف إبراهيم', 'زينب أحمد',
          'خالد عمر', 'نور الهدى', 'سعد طارق', 'ليلى حسام'
        ];
        return faker.helpers.arrayElement(arabicNames);
      },

      businessName: () => {
        const arabicBusinessNames = [
          'صالون الجمال', 'مركز التجميل', 'صالون الأناقة',
          'مركز الجمال العربي', 'صالون النجوم', 'مركز العناية بالجمال',
          'صالون الملكة', 'مركز التجميل الراقي'
        ];
        return {
          ar: faker.helpers.arrayElement(arabicBusinessNames),
          en: faker.company.name()
        };
      },

      address: () => {
        const jordanCities = ['عمان', 'إربد', 'الزرقاء', 'السلط'];
        const englishCities = ['Amman', 'Irbid', 'Zarqa', 'Salt'];
        
        const index = Math.floor(Math.random() * jordanCities.length);
        
        return {
          ar: `${jordanCities[index]}، الأردن`,
          en: `${englishCities[index]}, Jordan`
        };
      },

      coordinates: () => {
        // Jordan coordinates bounds
        return {
          latitude: Number(faker.number.float({ min: 29.1857, max: 33.3750, fractionDigits: 6 })),
          longitude: Number(faker.number.float({ min: 34.9226, max: 39.3012, fractionDigits: 6 }))
        };
      },

      ammanCoordinates: () => {
        // Amman specific coordinates
        return {
          latitude: Number(faker.number.float({ min: 31.8000, max: 32.1000, fractionDigits: 6 })),
          longitude: Number(faker.number.float({ min: 35.7000, max: 36.0000, fractionDigits: 6 }))
        };
      }
    };
  }

  /**
   * Create beauty service test data
   */
  static createBeautyServiceData() {
    const services = {
      hair: [
        { ar: 'قص الشعر', en: 'Hair Cut', price: 25, duration: 60 },
        { ar: 'صبغة الشعر', en: 'Hair Coloring', price: 45, duration: 120 },
        { ar: 'تصفيف الشعر', en: 'Hair Styling', price: 30, duration: 45 },
        { ar: 'علاج الشعر', en: 'Hair Treatment', price: 35, duration: 90 }
      ],
      nails: [
        { ar: 'مانيكير', en: 'Manicure', price: 15, duration: 45 },
        { ar: 'باديكير', en: 'Pedicure', price: 20, duration: 60 },
        { ar: 'رسم الأظافر', en: 'Nail Art', price: 25, duration: 75 },
        { ar: 'أظافر الجل', en: 'Gel Nails', price: 30, duration: 90 }
      ],
      facial: [
        { ar: 'تنظيف الوجه', en: 'Facial Cleaning', price: 30, duration: 60 },
        { ar: 'تدليك الوجه', en: 'Facial Massage', price: 35, duration: 90 },
        { ar: 'قناع الوجه', en: 'Face Mask', price: 25, duration: 45 },
        { ar: 'مكافحة الشيخوخة', en: 'Anti-Aging Treatment', price: 50, duration: 120 }
      ],
      premium: [
        { ar: 'باقة العروس الكاملة', en: 'Complete Bridal Package', price: 150, duration: 240 },
        { ar: 'علاج شامل للوجه', en: 'Complete Facial Treatment', price: 80, duration: 180 },
        { ar: 'باقة العناية الكاملة', en: 'Complete Care Package', price: 200, duration: 300 }
      ]
    };

    return {
      getServiceByCategory: (category) => {
        return faker.helpers.arrayElement(services[category] || services.hair);
      },
      
      getRandomService: () => {
        const categories = Object.keys(services);
        const category = faker.helpers.arrayElement(categories);
        return faker.helpers.arrayElement(services[category]);
      },

      getAllServices: () => {
        return Object.values(services).flat();
      }
    };
  }

  /**
   * Request testing utilities
   */
  static createRequestHelpers() {
    return {
      /**
       * Create auth headers
       */
      authHeaders: (token) => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }),

      /**
       * Create pagination query
       */
      paginationQuery: (page = 1, limit = 10) => ({
        page,
        limit
      }),

      /**
       * Create booking filter query
       */
      bookingFilterQuery: (filters = {}) => {
        const query = {};
        
        if (filters.status) query.status = filters.status;
        if (filters.dateFrom) query.dateFrom = filters.dateFrom;
        if (filters.dateTo) query.dateTo = filters.dateTo;
        if (filters.providerId) query.providerId = filters.providerId;
        if (filters.serviceId) query.serviceId = filters.serviceId;
        if (filters.sortBy) query.sortBy = filters.sortBy;
        if (filters.sortOrder) query.sortOrder = filters.sortOrder;
        
        return query;
      },

      /**
       * Create analytics query
       */
      analyticsQuery: (options = {}) => ({
        period: options.period || 'week',
        startDate: options.startDate,
        endDate: options.endDate,
        includeRevenue: options.includeRevenue || true,
        groupBy: options.groupBy || 'day'
      })
    };
  }

  /**
   * Performance testing utilities
   */
  static createPerformanceHelpers() {
    return {
      /**
       * Measure execution time
       */
      measureTime: async (asyncFunction) => {
        const start = performance.now();
        const result = await asyncFunction();
        const end = performance.now();
        
        return {
          result,
          duration: end - start,
          durationMs: Math.round(end - start)
        };
      },

      /**
       * Calculate response time statistics
       */
      calculateStats: (responseTimes) => {
        const sorted = [...responseTimes].sort((a, b) => a - b);
        const count = sorted.length;
        
        return {
          count,
          min: Math.min(...sorted),
          max: Math.max(...sorted),
          mean: sorted.reduce((a, b) => a + b, 0) / count,
          median: sorted[Math.floor(count / 2)],
          p95: sorted[Math.floor(count * 0.95)],
          p99: sorted[Math.floor(count * 0.99)]
        };
      },

      /**
       * Create load test configuration
       */
      createLoadConfig: (type = 'medium') => {
        const configs = {
          light: { users: 10, requestsPerUser: 5, timeout: 30000 },
          medium: { users: 50, requestsPerUser: 10, timeout: 60000 },
          heavy: { users: 100, requestsPerUser: 20, timeout: 120000 },
          stress: { users: 200, requestsPerUser: 50, timeout: 300000 }
        };
        
        return configs[type] || configs.medium;
      },

      /**
       * Monitor memory usage
       */
      getMemoryUsage: () => {
        const usage = process.memoryUsage();
        return {
          rss: usage.rss,
          heapTotal: usage.heapTotal,
          heapUsed: usage.heapUsed,
          external: usage.external,
          arrayBuffers: usage.arrayBuffers
        };
      }
    };
  }

  /**
   * Validation testing utilities
   */
  static createValidationHelpers() {
    return {
      /**
       * Test phone number formats
       */
      phoneNumberTests: () => ({
        valid: [
          '+962791234567',
          '962791234567',
          '0791234567',
          '791234567',
          '+962781234567',
          '+962771234567'
        ],
        invalid: [
          '+962701234567', // Invalid prefix
          '79123456',      // Too short
          '07912345678',   // Too long
          '+96379123456',  // Wrong country code
          'abc123456789'   // Non-numeric
        ]
      }),

      /**
       * Test date formats
       */
      dateTests: () => ({
        valid: [
          '2024-07-25',
          '2024-12-31',
          '2025-01-01'
        ],
        invalid: [
          '2024/07/25',
          '25-07-2024',
          'invalid-date',
          '2024-13-01',
          '2024-07-32'
        ]
      }),

      /**
       * Test time formats
       */
      timeTests: () => ({
        valid: [
          '09:00',
          '14:30',
          '21:45',
          '08:00'
        ],
        invalid: [
          '25:00',
          '14:70',
          '2:30 PM',
          'invalid-time'
        ]
      }),

      /**
       * Test booking status transitions
       */
      statusTransitionTests: () => ({
        valid: {
          pending: ['confirmed', 'cancelled'],
          confirmed: ['completed', 'cancelled', 'no_show'],
          completed: [],
          cancelled: [],
          no_show: []
        },
        invalid: {
          pending: ['completed', 'no_show'],
          confirmed: ['pending'],
          completed: ['pending', 'confirmed', 'cancelled', 'no_show'],
          cancelled: ['pending', 'confirmed', 'completed', 'no_show'],
          no_show: ['pending', 'confirmed', 'completed', 'cancelled']
        }
      })
    };
  }

  /**
   * Mock data generators
   */
  static createMockDataGenerators() {
    return {
      /**
       * Generate mock booking data
       */
      bookingData: (overrides = {}) => ({
        providerId: faker.string.uuid(),
        serviceId: faker.string.uuid(),
        date: this.createDateHelpers().daysFromNow(3),
        time: this.createDateHelpers().businessHourTime(),
        paymentMethod: faker.helpers.arrayElement(['cash', 'card', 'online']),
        notes: faker.lorem.sentence(),
        ...overrides
      }),

      /**
       * Generate mock user data
       */
      userData: (type = 'customer', overrides = {}) => {
        const jordanData = this.createJordanTestData();
        
        return {
          id: faker.string.uuid(),
          phone: jordanData.phone(),
          name: type === 'customer' ? jordanData.arabicName() : faker.person.fullName(),
          email: faker.internet.email(),
          language: faker.helpers.arrayElement(['ar', 'en']),
          type: type,
          ...overrides
        };
      },

      /**
       * Generate mock provider data
       */
      providerData: (overrides = {}) => {
        const jordanData = this.createJordanTestData();
        const businessName = jordanData.businessName();
        const address = jordanData.address();
        const coords = jordanData.ammanCoordinates();
        
        return {
          id: faker.string.uuid(),
          businessNameAr: businessName.ar,
          businessNameEn: businessName.en,
          ownerName: jordanData.arabicName(),
          phone: jordanData.phone(),
          email: faker.internet.email(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: address,
          verified: faker.datatype.boolean(),
          rating: Number(faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 })),
          totalReviews: faker.number.int({ min: 0, max: 500 }),
          ...overrides
        };
      },

      /**
       * Generate mock service data
       */
      serviceData: (providerId, category = null, overrides = {}) => {
        const serviceHelper = this.createBeautyServiceData();
        const service = category ? 
          serviceHelper.getServiceByCategory(category) : 
          serviceHelper.getRandomService();
        
        return {
          id: faker.string.uuid(),
          providerId: providerId,
          nameAr: service.ar,
          nameEn: service.en,
          price: service.price,
          durationMinutes: service.duration,
          active: true,
          ...overrides
        };
      }
    };
  }

  /**
   * Test assertion helpers
   */
  static createAssertionHelpers() {
    return {
      /**
       * Assert response structure
       */
      assertResponseStructure: (response, expectedStructure) => {
        expect(response).toHaveProperty('success');
        
        if (expectedStructure.success !== false) {
          expect(response.success).toBe(true);
          expect(response).toHaveProperty('data');
          
          if (expectedStructure.data) {
            Object.keys(expectedStructure.data).forEach(key => {
              expect(response.data).toHaveProperty(key);
            });
          }
        } else {
          expect(response.success).toBe(false);
          expect(response).toHaveProperty('error');
        }
      },

      /**
       * Assert booking structure
       */
      assertBookingStructure: (booking) => {
        const requiredFields = [
          'id', 'userId', 'providerId', 'serviceId',
          'bookingDate', 'startTime', 'endTime', 'status',
          'amount', 'platformFee', 'providerFee'
        ];
        
        requiredFields.forEach(field => {
          expect(booking).toHaveProperty(field);
        });
        
        expect(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
          .toContain(booking.status);
        expect(booking.amount).toBeGreaterThan(0);
      },

      /**
       * Assert pagination structure
       */
      assertPaginationStructure: (paginatedResponse) => {
        expect(paginatedResponse).toHaveProperty('data');
        expect(paginatedResponse).toHaveProperty('total');
        expect(paginatedResponse).toHaveProperty('page');
        expect(paginatedResponse).toHaveProperty('totalPages');
        expect(paginatedResponse).toHaveProperty('hasNext');
        expect(paginatedResponse).toHaveProperty('hasPrev');
        
        expect(Array.isArray(paginatedResponse.data)).toBe(true);
        expect(typeof paginatedResponse.total).toBe('number');
        expect(typeof paginatedResponse.page).toBe('number');
      },

      /**
       * Assert performance metrics
       */
      assertPerformance: (metrics, thresholds) => {
        if (thresholds.maxResponseTime) {
          expect(metrics.averageResponseTime).toBeLessThan(thresholds.maxResponseTime);
        }
        
        if (thresholds.minSuccessRate) {
          expect(metrics.successRate).toBeGreaterThan(thresholds.minSuccessRate);
        }
        
        if (thresholds.maxErrors) {
          expect(metrics.errors || 0).toBeLessThan(thresholds.maxErrors);
        }
      }
    };
  }

  /**
   * Test cleanup utilities
   */
  static createCleanupHelpers() {
    return {
      /**
       * Clean up test data
       */
      cleanupTestData: async (testDatabase) => {
        const tables = [
          'booking_audit',
          'reviews',
          'bookings',
          'services',
          'providers',
          'users'
        ];

        for (const table of tables) {
          await testDatabase.executeQuery(`DELETE FROM ${table} WHERE created_at >= NOW() - INTERVAL '1 hour'`);
        }
      },

      /**
       * Reset sequences
       */
      resetSequences: async (testDatabase) => {
        // Reset any database sequences if needed
        // Implementation would depend on database type
      },

      /**
       * Clear cache
       */
      clearCache: async () => {
        // Clear any caching if implemented
        // This would call cache clearing utilities
      }
    };
  }

  /**
   * Get all helper utilities
   */
  static getAllHelpers() {
    return {
      jwt: this.generateJWT.bind(this),
      jwtBatch: this.generateJWTBatch.bind(this),
      dates: this.createDateHelpers(),
      jordan: this.createJordanTestData(),
      beauty: this.createBeautyServiceData(),
      requests: this.createRequestHelpers(),
      performance: this.createPerformanceHelpers(),
      validation: this.createValidationHelpers(),
      mockData: this.createMockDataGenerators(),
      assertions: this.createAssertionHelpers(),
      cleanup: this.createCleanupHelpers()
    };
  }
}

module.exports = TestHelpers;