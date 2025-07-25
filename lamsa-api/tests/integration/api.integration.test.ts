/**
 * API Integration Tests
 * Tests API endpoints and server functionality
 */

import axios, { AxiosInstance } from 'axios';
import { 
  waitForServer, 
  generateTestPhone, 
  generateTestUser,
  retryWithBackoff 
} from '../utils/test-helpers';

describe('API Integration', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000';
  let api: AxiosInstance;

  beforeAll(async () => {
    // Wait for server to be ready
    await waitForServer(API_URL);

    // Create axios instance with defaults
    api = axios.create({
      baseURL: `${API_URL}/api`,
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status
    });
  });

  describe('Health Check', () => {
    it('should return OK status', async () => {
      const response = await api.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('environment');
    });

    it('should include database status in health check', async () => {
      const response = await api.get('/health');
      
      expect(response.data).toHaveProperty('database');
      expect(typeof response.data.database).toBe('boolean');
    });
  });

  describe('Service Categories', () => {
    it('should fetch service categories', async () => {
      const response = await api.get('/services/categories');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
      
      if (response.data.data.length > 0) {
        const category = response.data.data[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name_en');
        expect(category).toHaveProperty('name_ar');
        expect(category).toHaveProperty('icon');
      }
    });

    it('should support language parameter', async () => {
      const responseEn = await api.get('/services/categories?lang=en');
      const responseAr = await api.get('/services/categories?lang=ar');
      
      expect(responseEn.status).toBe(200);
      expect(responseAr.status).toBe(200);
      
      // Both should return data
      expect(responseEn.data.data).toBeDefined();
      expect(responseAr.data.data).toBeDefined();
    });
  });

  describe('User Registration', () => {
    it('should validate phone number format', async () => {
      const response = await api.post('/auth/register', {
        phone: '123456', // Invalid format
        name: 'Test User',
        language: 'ar'
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
      expect(response.data).toHaveProperty('error');
    });

    it('should accept valid registration data', async () => {
      const testUser = generateTestUser();
      
      const response = await api.post('/auth/register', {
        phone: testUser.phone,
        name: testUser.name,
        language: testUser.language
      });
      
      // May return 200 (success) or 500 (if SMS not configured)
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('message');
      } else {
        // SMS not configured
        expect(response.data).toHaveProperty('success', false);
        expect(response.data).toHaveProperty('error');
      }
    });

    it('should require all mandatory fields', async () => {
      const response = await api.post('/auth/register', {
        phone: generateTestPhone()
        // Missing name and language
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
    });
  });

  describe('Provider Search', () => {
    it('should search providers with valid coordinates', async () => {
      const response = await api.get('/providers/search', {
        params: {
          lat: 31.9539,
          lng: 35.9106,
          radius: 10
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
      
      if (response.data.data.length > 0) {
        const provider = response.data.data[0];
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('business_name_en');
        expect(provider).toHaveProperty('business_name_ar');
        expect(provider).toHaveProperty('distance_km');
        expect(typeof provider.distance_km).toBe('number');
      }
    });

    it('should validate coordinate parameters', async () => {
      const response = await api.get('/providers/search', {
        params: {
          lat: 'invalid', // Invalid type
          lng: 35.9106,
          radius: 10
        }
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
    });

    it('should validate radius parameter', async () => {
      const response = await api.get('/providers/search', {
        params: {
          lat: 31.9539,
          lng: 35.9106,
          radius: -5 // Invalid negative radius
        }
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
    });

    it('should support optional filters', async () => {
      const response = await api.get('/providers/search', {
        params: {
          lat: 31.9539,
          lng: 35.9106,
          radius: 10,
          category: 'hair',
          rating_min: 4.0
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
    });
  });

  describe('Provider List', () => {
    it('should fetch provider list', async () => {
      const response = await api.get('/providers');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await api.get('/providers', {
        params: {
          page: 1,
          limit: 5
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      
      if (response.data.data.length > 0) {
        expect(response.data.data.length).toBeLessThanOrEqual(5);
      }
    });

    it('should support sorting', async () => {
      const response = await api.get('/providers', {
        params: {
          sort: 'rating',
          order: 'desc'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      
      // If there are multiple providers, check they're sorted
      if (response.data.data.length > 1) {
        for (let i = 1; i < response.data.data.length; i++) {
          const prevRating = response.data.data[i - 1].average_rating || 0;
          const currRating = response.data.data[i].average_rating || 0;
          expect(prevRating).toBeGreaterThanOrEqual(currRating);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await api.get('/non-existent-endpoint');
      
      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await api.post('/auth/register', 'invalid-json', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(400);
    });

    it('should include error details in response', async () => {
      const response = await api.post('/auth/register', {});
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
      expect(response.data).toHaveProperty('error');
      expect(typeof response.data.error).toBe('string');
    });
  });

  describe('API Rate Limiting', () => {
    it('should handle multiple rapid requests', async () => {
      // Make 10 rapid requests
      const requests = Array(10).fill(null).map(() => 
        api.get('/health')
      );
      
      const responses = await Promise.all(requests);
      
      // All should succeed (rate limiting may return 429 if configured)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await api.get('/health');
      
      // Check for CORS headers
      const headers = response.headers;
      expect(headers).toHaveProperty('access-control-allow-origin');
    });
  });
});