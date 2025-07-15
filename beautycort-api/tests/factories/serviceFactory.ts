/**
 * Service Test Data Factory
 * Generates test service data for different scenarios
 */

import { faker } from '@faker-js/faker';

export interface TestService {
  id?: string;
  provider_id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  price: number;
  duration_minutes: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export class ServiceFactory {
  /**
   * Create a test service with default values
   */
  static create(providerId: string, overrides: Partial<TestService> = {}): TestService {
    const serviceType = faker.helpers.arrayElement(this.getServiceTypes());

    return {
      id: faker.string.uuid(),
      provider_id: providerId,
      name_ar: serviceType.name_ar,
      name_en: serviceType.name_en,
      description_ar: serviceType.description_ar,
      description_en: serviceType.description_en,
      price: Number(faker.number.float({ min: 10, max: 100, fractionDigits: 2 })),
      duration_minutes: faker.helpers.arrayElement([30, 45, 60, 90, 120]),
      active: true,
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    };
  }

  /**
   * Create multiple services for a provider
   */
  static createMany(providerId: string, count: number, overrides: Partial<TestService> = {}): TestService[] {
    return Array.from({ length: count }, () => this.create(providerId, overrides));
  }

  /**
   * Create a specific service type
   */
  static createByType(providerId: string, type: string, overrides: Partial<TestService> = {}): TestService {
    const serviceTypes = this.getServiceTypes();
    const serviceType = serviceTypes.find(s => s.type === type) || serviceTypes[0];

    return this.create(providerId, {
      name_ar: serviceType.name_ar,
      name_en: serviceType.name_en,
      description_ar: serviceType.description_ar,
      description_en: serviceType.description_en,
      price: serviceType.price,
      duration_minutes: serviceType.duration_minutes,
      ...overrides
    });
  }

  /**
   * Create hair services
   */
  static createHairServices(providerId: string): TestService[] {
    const hairServices = [
      { type: 'haircut', name_ar: 'قص الشعر', name_en: 'Hair Cut', price: 25, duration: 60 },
      { type: 'hair_color', name_ar: 'صبغة الشعر', name_en: 'Hair Coloring', price: 45, duration: 120 },
      { type: 'hair_styling', name_ar: 'تصفيف الشعر', name_en: 'Hair Styling', price: 30, duration: 45 },
      { type: 'hair_treatment', name_ar: 'علاج الشعر', name_en: 'Hair Treatment', price: 35, duration: 90 }
    ];

    return hairServices.map(service => this.create(providerId, {
      name_ar: service.name_ar,
      name_en: service.name_en,
      price: service.price,
      duration_minutes: service.duration
    }));
  }

  /**
   * Create nail services
   */
  static createNailServices(providerId: string): TestService[] {
    const nailServices = [
      { type: 'manicure', name_ar: 'مانيكير', name_en: 'Manicure', price: 15, duration: 45 },
      { type: 'pedicure', name_ar: 'باديكير', name_en: 'Pedicure', price: 20, duration: 60 },
      { type: 'nail_art', name_ar: 'رسم الأظافر', name_en: 'Nail Art', price: 25, duration: 75 },
      { type: 'gel_nails', name_ar: 'أظافر الجل', name_en: 'Gel Nails', price: 30, duration: 90 }
    ];

    return nailServices.map(service => this.create(providerId, {
      name_ar: service.name_ar,
      name_en: service.name_en,
      price: service.price,
      duration_minutes: service.duration
    }));
  }

  /**
   * Create facial services
   */
  static createFacialServices(providerId: string): TestService[] {
    const facialServices = [
      { type: 'facial_cleaning', name_ar: 'تنظيف الوجه', name_en: 'Facial Cleaning', price: 30, duration: 60 },
      { type: 'facial_massage', name_ar: 'تدليك الوجه', name_en: 'Facial Massage', price: 35, duration: 90 },
      { type: 'face_mask', name_ar: 'قناع الوجه', name_en: 'Face Mask', price: 25, duration: 45 },
      { type: 'anti_aging', name_ar: 'مكافحة الشيخوخة', name_en: 'Anti-Aging Treatment', price: 50, duration: 120 }
    ];

    return facialServices.map(service => this.create(providerId, {
      name_ar: service.name_ar,
      name_en: service.name_en,
      price: service.price,
      duration_minutes: service.duration
    }));
  }

  /**
   * Create comprehensive service package for a provider
   */
  static createComprehensiveServices(providerId: string): TestService[] {
    return [
      ...this.createHairServices(providerId).slice(0, 2),
      ...this.createNailServices(providerId).slice(0, 2),
      ...this.createFacialServices(providerId).slice(0, 2)
    ];
  }

  /**
   * Create quick services (short duration)
   */
  static createQuickServices(providerId: string, count: number): TestService[] {
    const quickServices = [
      { name_ar: 'تلميع الأظافر', name_en: 'Nail Polish', duration: 15, price: 8 },
      { name_ar: 'تصفيف سريع', name_en: 'Quick Styling', duration: 20, price: 12 },
      { name_ar: 'تنظيف الحواجب', name_en: 'Eyebrow Cleaning', duration: 15, price: 10 },
      { name_ar: 'تطبيق المكياج', name_en: 'Makeup Application', duration: 30, price: 20 }
    ];

    return Array.from({ length: count }, (_, index) => {
      const service = quickServices[index % quickServices.length];
      return this.create(providerId, {
        name_ar: service.name_ar,
        name_en: service.name_en,
        duration_minutes: service.duration,
        price: service.price
      });
    });
  }

  /**
   * Create premium services (high price, long duration)
   */
  static createPremiumServices(providerId: string, count: number): TestService[] {
    const premiumServices = [
      { name_ar: 'باقة العروس الكاملة', name_en: 'Complete Bridal Package', duration: 240, price: 150 },
      { name_ar: 'علاج شامل للوجه', name_en: 'Complete Facial Treatment', duration: 180, price: 80 },
      { name_ar: 'تصفيف وصبغة متقدمة', name_en: 'Advanced Hair Styling & Color', duration: 210, price: 120 },
      { name_ar: 'باقة العناية الكاملة', name_en: 'Complete Care Package', duration: 300, price: 200 }
    ];

    return Array.from({ length: count }, (_, index) => {
      const service = premiumServices[index % premiumServices.length];
      return this.create(providerId, {
        name_ar: service.name_ar,
        name_en: service.name_en,
        duration_minutes: service.duration,
        price: service.price
      });
    });
  }

  /**
   * Create inactive services
   */
  static createInactiveServices(providerId: string, count: number): TestService[] {
    return Array.from({ length: count }, () => this.create(providerId, {
      active: false
    }));
  }

  /**
   * Create services with specific price range
   */
  static createInPriceRange(providerId: string, minPrice: number, maxPrice: number, count: number): TestService[] {
    return Array.from({ length: count }, () => this.create(providerId, {
      price: Number(faker.number.float({ min: minPrice, max: maxPrice, fractionDigits: 2 }))
    }));
  }

  /**
   * Create services for load testing
   */
  static createForLoadTesting(providerId: string, count: number): TestService[] {
    return Array.from({ length: count }, (_, index) => ({
      id: faker.string.uuid(),
      provider_id: providerId,
      name_ar: `خدمة اختبار ${index + 1}`,
      name_en: `Test Service ${index + 1}`,
      description_ar: `وصف خدمة الاختبار ${index + 1}`,
      description_en: `Test service description ${index + 1}`,
      price: 25.00,
      duration_minutes: 60,
      active: true,
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString()
    }));
  }

  /**
   * Get service types with predefined data
   */
  private static getServiceTypes() {
    return [
      {
        type: 'haircut',
        name_ar: 'قص الشعر',
        name_en: 'Hair Cut',
        description_ar: 'قص وتصفيف الشعر حسب الطلب',
        description_en: 'Hair cutting and styling as requested',
        price: 25,
        duration_minutes: 60
      },
      {
        type: 'manicure',
        name_ar: 'مانيكير',
        name_en: 'Manicure',
        description_ar: 'العناية بالأظافر وتلميعها',
        description_en: 'Nail care and polishing',
        price: 15,
        duration_minutes: 45
      },
      {
        type: 'facial',
        name_ar: 'تدليك الوجه',
        name_en: 'Facial Massage',
        description_ar: 'تدليك وعناية شاملة بالوجه',
        description_en: 'Complete facial massage and care',
        price: 35,
        duration_minutes: 90
      },
      {
        type: 'hair_color',
        name_ar: 'صبغة الشعر',
        name_en: 'Hair Coloring',
        description_ar: 'صبغ الشعر بألوان متنوعة',
        description_en: 'Hair coloring in various shades',
        price: 45,
        duration_minutes: 120
      },
      {
        type: 'pedicure',
        name_ar: 'باديكير',
        name_en: 'Pedicure',
        description_ar: 'العناية بالقدمين والأظافر',
        description_en: 'Foot and nail care',
        price: 20,
        duration_minutes: 60
      },
      {
        type: 'makeup',
        name_ar: 'تطبيق المكياج',
        name_en: 'Makeup Application',
        description_ar: 'تطبيق مكياج احترافي',
        description_en: 'Professional makeup application',
        price: 30,
        duration_minutes: 45
      },
      {
        type: 'eyebrows',
        name_ar: 'تشذيب الحواجب',
        name_en: 'Eyebrow Shaping',
        description_ar: 'تشذيب وتنسيق الحواجب',
        description_en: 'Eyebrow shaping and styling',
        price: 12,
        duration_minutes: 30
      },
      {
        type: 'massage',
        name_ar: 'مساج استرخاء',
        name_en: 'Relaxation Massage',
        description_ar: 'مساج للاسترخاء وتخفيف التوتر',
        description_en: 'Relaxation massage for stress relief',
        price: 40,
        duration_minutes: 75
      }
    ];
  }

  /**
   * Get predefined test services for consistent testing
   */
  static getPredefinedServices(): { [key: string]: TestService } {
    return {
      haircut: {
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
      manicure: {
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
      facial: {
        id: 'service3-3333-3333-3333-333333333333',
        provider_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name_ar: 'تدليك الوجه',
        name_en: 'Facial Massage',
        description_ar: 'تدليك وعناية بالوجه',
        description_en: 'Facial massage and skincare',
        price: 35.00,
        duration_minutes: 90,
        active: true
      },
      premiumPackage: {
        id: 'service4-4444-4444-4444-444444444444',
        provider_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name_ar: 'باقة العروس',
        name_en: 'Bridal Package',
        description_ar: 'باقة شاملة للعروس',
        description_en: 'Complete bridal package',
        price: 150.00,
        duration_minutes: 240,
        active: true
      },
      inactiveService: {
        id: 'service5-5555-5555-5555-555555555555',
        provider_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name_ar: 'خدمة متوقفة',
        name_en: 'Inactive Service',
        description_ar: 'خدمة غير متاحة حالياً',
        description_en: 'Service currently unavailable',
        price: 20.00,
        duration_minutes: 30,
        active: false
      }
    };
  }
}

export default ServiceFactory;