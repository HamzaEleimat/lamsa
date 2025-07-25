/**
 * Test Helper Utilities
 * Shared utilities for integration and unit tests
 */

import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Wait for server to be ready with exponential backoff
 * @param url - Server URL to check
 * @param maxRetries - Maximum number of retry attempts
 * @param initialDelay - Initial delay in milliseconds
 * @returns Promise that resolves when server is ready
 */
export async function waitForServer(
  url: string,
  maxRetries: number = 30,
  initialDelay: number = 1000
): Promise<void> {
  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxRetries) {
    try {
      const response = await axios.get(`${url}/api/health`, {
        timeout: 5000,
        validateStatus: (status) => status === 200
      });
      
      if (response.data?.status === 'ok') {
        console.log('✅ Server is ready');
        return;
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // If it's a connection error, server is not ready yet
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        console.log(`⏳ Waiting for server... (attempt ${attempt + 1}/${maxRetries})`);
      } else {
        console.warn(`⚠️  Server check failed:`, axiosError.message);
      }
    }

    attempt++;
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff with max delay of 10 seconds
      delay = Math.min(delay * 1.5, 10000);
    }
  }

  throw new Error(`Server at ${url} failed to start after ${maxRetries} attempts`);
}

/**
 * Generate a valid Jordanian phone number for testing
 * @returns Random valid phone number
 */
export function generateTestPhone(): string {
  const prefixes = ['077', '078', '079'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${suffix}`;
}

/**
 * Generate test user data
 * @param overrides - Override default values
 * @returns Test user object
 */
export function generateTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: uuidv4(),
    phone: generateTestPhone(),
    name: `Test User ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    language: 'ar',
    created_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Generate test provider data
 * @param overrides - Override default values
 * @returns Test provider object
 */
export function generateTestProvider(overrides: Partial<TestProvider> = {}): TestProvider {
  return {
    id: uuidv4(),
    phone: generateTestPhone(),
    email: `provider${Date.now()}@example.com`,
    business_name_en: `Test Salon ${Date.now()}`,
    business_name_ar: `صالون تجريبي ${Date.now()}`,
    location: {
      latitude: 31.9539 + (Math.random() - 0.5) * 0.1, // Random location near Amman
      longitude: 35.9106 + (Math.random() - 0.5) * 0.1
    },
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Generate test booking data
 * @param customerId - Customer ID
 * @param providerId - Provider ID
 * @param overrides - Override default values
 * @returns Test booking object
 */
export function generateTestBooking(
  customerId: string,
  providerId: string,
  overrides: Partial<TestBooking> = {}
): TestBooking {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  return {
    id: uuidv4(),
    customer_id: customerId,
    provider_id: providerId,
    service_id: uuidv4(),
    booking_date: tomorrow.toISOString().split('T')[0],
    start_time: '14:00:00',
    end_time: '15:00:00',
    status: 'pending',
    total_amount: 25,
    created_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Clean up test data from database
 * @param supabase - Supabase client
 * @param testIds - Object containing IDs to clean up
 */
export async function cleanupTestData(
  supabase: any,
  testIds: {
    userIds?: string[];
    providerIds?: string[];
    bookingIds?: string[];
  }
): Promise<void> {
  const cleanupPromises = [];

  if (testIds.bookingIds?.length) {
    cleanupPromises.push(
      supabase.from('bookings').delete().in('id', testIds.bookingIds)
    );
  }

  if (testIds.userIds?.length) {
    cleanupPromises.push(
      supabase.from('users').delete().in('id', testIds.userIds)
    );
  }

  if (testIds.providerIds?.length) {
    cleanupPromises.push(
      supabase.from('providers').delete().in('id', testIds.providerIds)
    );
  }

  await Promise.all(cleanupPromises);
}

/**
 * Retry an async operation with exponential backoff
 * @param operation - Async function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay between retries
 * @returns Result of the operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError!;
}

// Type definitions
export interface TestUser {
  id: string;
  phone: string;
  name: string;
  email?: string;
  language: 'ar' | 'en';
  created_at: string;
}

export interface TestProvider {
  id: string;
  phone: string;
  email: string;
  business_name_en: string;
  business_name_ar: string;
  location: {
    latitude: number;
    longitude: number;
  };
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface TestBooking {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  total_amount: number;
  created_at: string;
}