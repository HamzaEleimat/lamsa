/**
 * Test Database Utilities
 * Provides database setup, cleanup, and seeding for tests
 */

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TestDatabase {
  private static instance: TestDatabase;
  private supabase: any;
  private isSetup = false;

  private constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://test.supabase.co',
      process.env.SUPABASE_SERVICE_KEY || 'test-service-key'
    );
  }

  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  /**
   * Setup test database with schema and initial data
   */
  async setup(): Promise<void> {
    if (this.isSetup) return;

    console.log('🔧 Setting up test database...');

    try {
      // Create tables
      await this.createTables();
      
      // Seed initial data
      await this.seedData();
      
      this.isSetup = true;
      console.log('✅ Test database setup completed');
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      throw error;
    }
  }

  /**
   * Clean up test database
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test database...');

    try {
      // Clear all tables in reverse dependency order
      await this.clearAllTables();
      
      console.log('✅ Test database cleanup completed');
    } catch (error) {
      console.error('❌ Test database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Reset database to initial state
   */
  async reset(): Promise<void> {
    await this.cleanup();
    await this.setup();
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        language VARCHAR(2) DEFAULT 'ar',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Providers table
      `CREATE TABLE IF NOT EXISTS providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_name_ar VARCHAR(255) NOT NULL,
        business_name_en VARCHAR(255) NOT NULL,
        owner_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        address JSONB,
        verified BOOLEAN DEFAULT FALSE,
        license_number VARCHAR(50),
        license_image_url TEXT,
        rating DECIMAL(3, 2) DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Services table
      `CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        description_ar TEXT,
        description_en TEXT,
        price DECIMAL(10, 2) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Bookings table
      `CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
        payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'online')),
        amount DECIMAL(10, 2) NOT NULL,
        platform_fee DECIMAL(10, 2) NOT NULL,
        provider_fee DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(provider_id, booking_date, start_time)
      )`,

      // Reviews table
      `CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Booking audit table
      `CREATE TABLE IF NOT EXISTS booking_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_role VARCHAR(20) NOT NULL,
        action VARCHAR(50) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];

    for (const table of tables) {
      await this.executeQuery(table);
    }

    // Create indexes
    await this.createIndexes();
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)',
      'CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id)',
      'CREATE INDEX IF NOT EXISTS idx_booking_audit_booking_id ON booking_audit(booking_id)'
    ];

    for (const index of indexes) {
      await this.executeQuery(index);
    }
  }

  /**
   * Seed initial test data
   */
  private async seedData(): Promise<void> {
    // Test users
    await this.insertTestUsers();
    
    // Test providers
    await this.insertTestProviders();
    
    // Test services
    await this.insertTestServices();
    
    // Test bookings
    await this.insertTestBookings();
  }

  /**
   * Insert test users
   */
  private async insertTestUsers(): Promise<void> {
    const users = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        phone: '+962781234567',
        name: 'أحمد محمد',
        email: 'ahmed@test.com',
        language: 'ar'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        phone: '+962791234567',
        name: 'Sarah Johnson',
        email: 'sarah@test.com',
        language: 'en'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        phone: '+962771234567',
        name: 'فاطمة أحمد',
        email: 'fatima@test.com',
        language: 'ar'
      }
    ];

    for (const user of users) {
      await this.executeQuery(
        'INSERT INTO users (id, phone, name, email, language) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (phone) DO NOTHING',
        [user.id, user.phone, user.name, user.email, user.language]
      );
    }
  }

  /**
   * Insert test providers
   */
  private async insertTestProviders(): Promise<void> {
    const providers = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        business_name_ar: 'صالون الجمال',
        business_name_en: 'Beauty Salon',
        owner_name: 'مريم عبدالله',
        phone: '+962781111111',
        email: 'salon@test.com',
        password_hash: '$2b$10$hash',
        latitude: 31.9500,
        longitude: 35.9333,
        address: '{"ar": "عمان، الأردن", "en": "Amman, Jordan"}',
        verified: true
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        business_name_ar: 'مركز التجميل',
        business_name_en: 'Beauty Center',
        owner_name: 'نور الهدى',
        phone: '+962791111111',
        email: 'center@test.com',
        password_hash: '$2b$10$hash',
        latitude: 31.9400,
        longitude: 35.9400,
        address: '{"ar": "عمان، الأردن", "en": "Amman, Jordan"}',
        verified: true
      }
    ];

    for (const provider of providers) {
      await this.executeQuery(
        `INSERT INTO providers (id, business_name_ar, business_name_en, owner_name, phone, email, password_hash, latitude, longitude, address, verified) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (phone) DO NOTHING`,
        [provider.id, provider.business_name_ar, provider.business_name_en, provider.owner_name, 
         provider.phone, provider.email, provider.password_hash, provider.latitude, provider.longitude, 
         provider.address, provider.verified]
      );
    }
  }

  /**
   * Insert test services
   */
  private async insertTestServices(): Promise<void> {
    const services = [
      {
        id: 'service1-1111-1111-1111-111111111111',
        provider_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name_ar: 'قص الشعر',
        name_en: 'Hair Cut',
        description_ar: 'قص وتصفيف الشعر',
        description_en: 'Hair cutting and styling',
        price: 25.00,
        duration_minutes: 60,
        active: true
      },
      {
        id: 'service2-2222-2222-2222-222222222222',
        provider_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name_ar: 'مانيكير',
        name_en: 'Manicure',
        description_ar: 'العناية بالأظافر',
        description_en: 'Nail care and styling',
        price: 15.00,
        duration_minutes: 45,
        active: true
      },
      {
        id: 'service3-3333-3333-3333-333333333333',
        provider_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name_ar: 'تدليك الوجه',
        name_en: 'Facial Massage',
        description_ar: 'تدليك وعناية بالوجه',
        description_en: 'Facial massage and skincare',
        price: 35.00,
        duration_minutes: 90,
        active: true
      }
    ];

    for (const service of services) {
      await this.executeQuery(
        `INSERT INTO services (id, provider_id, name_ar, name_en, description_ar, description_en, price, duration_minutes, active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [service.id, service.provider_id, service.name_ar, service.name_en, service.description_ar, 
         service.description_en, service.price, service.duration_minutes, service.active]
      );
    }
  }

  /**
   * Insert test bookings
   */
  private async insertTestBookings(): Promise<void> {
    const bookings = [
      {
        id: 'booking1-1111-1111-1111-111111111111',
        user_id: '11111111-1111-1111-1111-111111111111',
        provider_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        service_id: 'service1-1111-1111-1111-111111111111',
        booking_date: '2024-03-15',
        start_time: '14:00',
        end_time: '15:00',
        status: 'confirmed',
        payment_method: 'cash',
        amount: 25.00,
        platform_fee: 2.00,
        provider_fee: 23.00,
        notes: 'Test booking'
      }
    ];

    for (const booking of bookings) {
      await this.executeQuery(
        `INSERT INTO bookings (id, user_id, provider_id, service_id, booking_date, start_time, end_time, status, payment_method, amount, platform_fee, provider_fee, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (provider_id, booking_date, start_time) DO NOTHING`,
        [booking.id, booking.user_id, booking.provider_id, booking.service_id, booking.booking_date, 
         booking.start_time, booking.end_time, booking.status, booking.payment_method, booking.amount,
         booking.platform_fee, booking.provider_fee, booking.notes]
      );
    }
  }

  /**
   * Clear all tables
   */
  private async clearAllTables(): Promise<void> {
    const tables = [
      'booking_audit',
      'reviews',
      'bookings',
      'services',
      'providers',
      'users'
    ];

    for (const table of tables) {
      await this.executeQuery(`DELETE FROM ${table}`);
    }
  }

  /**
   * Execute SQL query
   */
  private async executeQuery(query: string, params?: any[]): Promise<any> {
    try {
      return await this.supabase.rpc('exec_sql', { query, params });
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Get test user by phone
   */
  async getTestUser(phone: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Get test provider by phone
   */
  async getTestProvider(phone: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('providers')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Create test booking
   */
  async createTestBooking(bookingData: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Export singleton instance
export const testDatabase = TestDatabase.getInstance();