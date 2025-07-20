/**
 * User Test Data Factory
 * Generates test user data for different scenarios
 */

import { faker } from '@faker-js/faker';

export interface TestUser {
  id?: string;
  phone: string;
  name: string;
  email?: string;
  language: 'ar' | 'en';
  created_at?: string;
  updated_at?: string;
}

export class UserFactory {
  /**
   * Create a test user with default values
   */
  static create(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: faker.string.uuid(),
      phone: this.generateJordanianPhone(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      language: faker.helpers.arrayElement(['ar', 'en']),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    };
  }

  /**
   * Create an Arabic user
   */
  static createArabicUser(overrides: Partial<TestUser> = {}): TestUser {
    const arabicNames = [
      'أحمد محمد',
      'فاطمة علي',
      'محمد أحمد',
      'عائشة محمود',
      'علي حسن',
      'مريم عبدالله',
      'يوسف إبراهيم',
      'زينب أحمد'
    ];

    return this.create({
      name: faker.helpers.arrayElement(arabicNames),
      language: 'ar',
      ...overrides
    });
  }

  /**
   * Create an English user
   */
  static createEnglishUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      name: faker.person.fullName(),
      language: 'en',
      ...overrides
    });
  }

  /**
   * Create multiple users
   */
  static createMany(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create a batch of users with different languages
   */
  static createMixedLanguageUsers(count: number): TestUser[] {
    const users: TestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      if (i % 2 === 0) {
        users.push(this.createArabicUser());
      } else {
        users.push(this.createEnglishUser());
      }
    }
    
    return users;
  }

  /**
   * Create user with specific phone number
   */
  static createWithPhone(phone: string, overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      phone,
      ...overrides
    });
  }

  /**
   * Generate a valid Jordanian phone number
   */
  private static generateJordanianPhone(): string {
    const prefixes = ['77', '78', '79'];
    const prefix = faker.helpers.arrayElement(prefixes);
    const number = faker.string.numeric(7);
    
    return `+962${prefix}${number}`;
  }

  /**
   * Create customer user (for booking tests)
   */
  static createCustomer(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      name: 'Test Customer',
      phone: '+962781234567',
      email: 'customer@test.com',
      language: 'ar',
      ...overrides
    });
  }

  /**
   * Create users for concurrent testing
   */
  static createConcurrentUsers(count: number): TestUser[] {
    return Array.from({ length: count }, (_, index) => ({
      id: faker.string.uuid(),
      phone: `+96277${String(index).padStart(7, '0')}`,
      name: `Concurrent User ${index + 1}`,
      email: `concurrent${index + 1}@test.com`,
      language: 'en',
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString()
    }));
  }

  /**
   * Get predefined test users for consistent testing
   */
  static getPredefinedUsers(): { [key: string]: TestUser } {
    return {
      arabicUser: {
        id: '11111111-1111-1111-1111-111111111111',
        phone: '+962781234567',
        name: 'أحمد محمد',
        email: 'ahmed@test.com',
        language: 'ar'
      },
      englishUser: {
        id: '22222222-2222-2222-2222-222222222222',
        phone: '+962791234567',
        name: 'Sarah Johnson',
        email: 'sarah@test.com',
        language: 'en'
      },
      customerWithBookings: {
        id: '33333333-3333-3333-3333-333333333333',
        phone: '+962771234567',
        name: 'فاطمة أحمد',
        email: 'fatima@test.com',
        language: 'ar'
      }
    };
  }
}

export default UserFactory;