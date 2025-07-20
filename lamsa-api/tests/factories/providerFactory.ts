/**
 * Provider Test Data Factory
 * Generates test provider data for different scenarios
 */

import { faker } from '@faker-js/faker';

export interface TestProvider {
  id?: string;
  business_name_ar: string;
  business_name_en: string;
  owner_name: string;
  phone: string;
  email: string;
  password_hash?: string;
  latitude: number;
  longitude: number;
  address: {
    ar: string;
    en: string;
  };
  verified?: boolean;
  license_number?: string;
  license_image_url?: string;
  rating?: number;
  total_reviews?: number;
  created_at?: string;
  updated_at?: string;
}

export class ProviderFactory {
  /**
   * Create a test provider with default values
   */
  static create(overrides: Partial<TestProvider> = {}): TestProvider {
    const businessNameEn = faker.company.name();
    const arabicBusinessNames = [
      'صالون الجمال',
      'مركز التجميل',
      'صالون الأناقة',
      'مركز الجمال العربي',
      'صالون النجوم',
      'مركز العناية بالجمال',
      'صالون الملكة',
      'مركز التجميل الراقي'
    ];

    return {
      id: faker.string.uuid(),
      business_name_ar: faker.helpers.arrayElement(arabicBusinessNames),
      business_name_en: businessNameEn,
      owner_name: faker.person.fullName(),
      phone: this.generateJordanianPhone(),
      email: faker.internet.email(),
      password_hash: '$2b$10$' + faker.string.alphanumeric(53),
      latitude: this.generateAmmanLatitude(),
      longitude: this.generateAmmanLongitude(),
      address: {
        ar: 'عمان، الأردن',
        en: 'Amman, Jordan'
      },
      verified: faker.datatype.boolean(),
      license_number: faker.string.alphanumeric(10).toUpperCase(),
      license_image_url: faker.image.url(),
      rating: Number(faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 })),
      total_reviews: faker.number.int({ min: 0, max: 500 }),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    };
  }

  /**
   * Create a verified provider
   */
  static createVerified(overrides: Partial<TestProvider> = {}): TestProvider {
    return this.create({
      verified: true,
      license_number: 'LIC' + faker.string.numeric(7),
      rating: Number(faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 })),
      total_reviews: faker.number.int({ min: 10, max: 200 }),
      ...overrides
    });
  }

  /**
   * Create an unverified provider
   */
  static createUnverified(overrides: Partial<TestProvider> = {}): TestProvider {
    return this.create({
      verified: false,
      license_number: undefined,
      license_image_url: undefined,
      rating: 0,
      total_reviews: 0,
      ...overrides
    });
  }

  /**
   * Create multiple providers
   */
  static createMany(count: number, overrides: Partial<TestProvider> = {}): TestProvider[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create providers in specific area (Amman districts)
   */
  static createInAmmanDistrict(district: 'downtown' | 'abdoun' | 'sweifieh' | 'jabal_amman', overrides: Partial<TestProvider> = {}): TestProvider {
    const coordinates = this.getDistrictCoordinates(district);
    const addressAr = this.getDistrictNameAr(district);
    const addressEn = this.getDistrictNameEn(district);

    return this.create({
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      address: {
        ar: `${addressAr}، عمان، الأردن`,
        en: `${addressEn}, Amman, Jordan`
      },
      ...overrides
    });
  }

  /**
   * Create high-rated provider
   */
  static createHighRated(overrides: Partial<TestProvider> = {}): TestProvider {
    return this.create({
      verified: true,
      rating: Number(faker.number.float({ min: 4.5, max: 5.0, fractionDigits: 1 })),
      total_reviews: faker.number.int({ min: 50, max: 500 }),
      ...overrides
    });
  }

  /**
   * Create provider with specific phone
   */
  static createWithPhone(phone: string, overrides: Partial<TestProvider> = {}): TestProvider {
    return this.create({
      phone,
      ...overrides
    });
  }

  /**
   * Generate a valid Jordanian phone number for providers
   */
  private static generateJordanianPhone(): string {
    const prefixes = ['77', '78', '79'];
    const prefix = faker.helpers.arrayElement(prefixes);
    const number = faker.string.numeric(7);
    
    return `+962${prefix}${number}`;
  }

  /**
   * Generate latitude within Amman bounds
   */
  private static generateAmmanLatitude(): number {
    return Number(faker.number.float({ min: 31.8000, max: 32.1000, fractionDigits: 6 }));
  }

  /**
   * Generate longitude within Amman bounds
   */
  private static generateAmmanLongitude(): number {
    return Number(faker.number.float({ min: 35.7000, max: 36.0000, fractionDigits: 6 }));
  }

  /**
   * Get coordinates for specific Amman districts
   */
  private static getDistrictCoordinates(district: string): { lat: number; lng: number } {
    const districts = {
      downtown: { lat: 31.9500, lng: 35.9333 },
      abdoun: { lat: 31.9400, lng: 35.9100 },
      sweifieh: { lat: 31.9300, lng: 35.8700 },
      jabal_amman: { lat: 31.9600, lng: 35.9200 }
    };

    return districts[district as keyof typeof districts] || districts.downtown;
  }

  /**
   * Get Arabic district name
   */
  private static getDistrictNameAr(district: string): string {
    const names = {
      downtown: 'وسط البلد',
      abdoun: 'عبدون',
      sweifieh: 'السويفية',
      jabal_amman: 'جبل عمان'
    };

    return names[district as keyof typeof names] || 'عمان';
  }

  /**
   * Get English district name
   */
  private static getDistrictNameEn(district: string): string {
    const names = {
      downtown: 'Downtown',
      abdoun: 'Abdoun',
      sweifieh: 'Sweifieh',
      jabal_amman: 'Jabal Amman'
    };

    return names[district as keyof typeof names] || 'Amman';
  }

  /**
   * Create providers for load testing
   */
  static createForLoadTesting(count: number): TestProvider[] {
    return Array.from({ length: count }, (_, index) => ({
      id: faker.string.uuid(),
      business_name_ar: `صالون اختبار ${index + 1}`,
      business_name_en: `Test Salon ${index + 1}`,
      owner_name: `Test Owner ${index + 1}`,
      phone: `+96277${String(index).padStart(7, '0')}`,
      email: `provider${index + 1}@test.com`,
      password_hash: '$2b$10$testhash',
      latitude: this.generateAmmanLatitude(),
      longitude: this.generateAmmanLongitude(),
      address: {
        ar: 'عمان، الأردن',
        en: 'Amman, Jordan'
      },
      verified: true,
      license_number: `LIC${String(index).padStart(6, '0')}`,
      rating: 4.5,
      total_reviews: 10,
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString()
    }));
  }

  /**
   * Get predefined test providers for consistent testing
   */
  static getPredefinedProviders(): { [key: string]: TestProvider } {
    return {
      verifiedProvider: {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        business_name_ar: 'صالون الجمال',
        business_name_en: 'Beauty Salon',
        owner_name: 'مريم عبدالله',
        phone: '+962781111111',
        email: 'salon@test.com',
        password_hash: '$2b$10$hash',
        latitude: 31.9500,
        longitude: 35.9333,
        address: {
          ar: 'عمان، الأردن',
          en: 'Amman, Jordan'
        },
        verified: true,
        license_number: 'LIC1234567',
        rating: 4.8,
        total_reviews: 120
      },
      unverifiedProvider: {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        business_name_ar: 'مركز التجميل',
        business_name_en: 'Beauty Center',
        owner_name: 'نور الهدى',
        phone: '+962791111111',
        email: 'center@test.com',
        password_hash: '$2b$10$hash',
        latitude: 31.9400,
        longitude: 35.9400,
        address: {
          ar: 'عمان، الأردن',
          en: 'Amman, Jordan'
        },
        verified: false,
        rating: 0,
        total_reviews: 0
      },
      premiumProvider: {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        business_name_ar: 'صالون الملكة',
        business_name_en: 'Queen Salon',
        owner_name: 'ليلى أحمد',
        phone: '+962771111111',
        email: 'queen@test.com',
        password_hash: '$2b$10$hash',
        latitude: 31.9300,
        longitude: 35.8700,
        address: {
          ar: 'السويفية، عمان، الأردن',
          en: 'Sweifieh, Amman, Jordan'
        },
        verified: true,
        license_number: 'PREMIUM123',
        rating: 4.9,
        total_reviews: 250
      }
    };
  }
}

export default ProviderFactory;