import { Provider, BusinessType, OnboardingStatus, VerificationStatus, QualityTier } from '../../src/types';

// Realistic Zarqa-based test providers
export const testProviders: Provider[] = [
  {
    id: 'provider-1',
    businessName: 'صالون الأميرة',
    businessNameAr: 'صالون الأميرة',
    ownerName: 'فاطمة الخالدي',
    phone: '+962791234567',
    email: 'fatima@princess-salon.jo',
    avatarUrl: 'https://example.com/avatar1.jpg',
    coverImageUrl: 'https://example.com/cover1.jpg',
    bio: 'Leading beauty salon in Zarqa with 15 years of experience',
    bioAr: 'صالون رائد في الزرقاء مع خبرة 15 عاماً',
    location: {
      latitude: 32.0728,
      longitude: 36.0881,
    },
    address: 'شارع الملك حسين، الزرقاء الجديدة',
    addressAr: 'شارع الملك حسين، الزرقاء الجديدة',
    city: 'الزرقاء',
    businessType: BusinessType.SALON,
    serviceRadiusKm: 0,
    onboardingStatus: OnboardingStatus.APPROVED,
    onboardingStep: 7,
    profileCompletionPercentage: 100,
    verificationStatus: VerificationStatus.VERIFIED,
    qualityTier: QualityTier.PREMIUM,
    verified: true,
    active: true,
    rating: 4.8,
    totalReviews: 234,
    ratingDistribution: {
      5: 180,
      4: 40,
      3: 10,
      2: 3,
      1: 1,
    },
    whatsappNumber: '+962791234567',
    yearsExperience: 15,
    totalCustomers: 1500,
    responseTime: 5,
    certificates: [
      {
        id: 'cert-1',
        name: 'Professional Hairdressing Certificate',
        nameAr: 'شهادة تصفيف الشعر المحترف',
        issuer: 'Jordan Beauty Academy',
        issuerAr: 'أكاديمية الجمال الأردنية',
        year: 2019,
        imageUrl: 'https://example.com/cert1.jpg',
        verified: true,
      },
    ],
    licenses: [
      {
        type: 'business',
        number: 'ZRQ-2021-1234',
        verified: true,
      },
    ],
    staffCount: 8,
    femaleStaff: true,
    languages: ['ar', 'en'],
    specializations: ['hair', 'makeup', 'nails'],
    workingHours: {
      0: { dayOfWeek: 0, isWorkingDay: false },
      1: { dayOfWeek: 1, isWorkingDay: true, openingTime: '09:00', closingTime: '21:00' },
      2: { dayOfWeek: 2, isWorkingDay: true, openingTime: '09:00', closingTime: '21:00' },
      3: { dayOfWeek: 3, isWorkingDay: true, openingTime: '09:00', closingTime: '21:00' },
      4: { dayOfWeek: 4, isWorkingDay: true, openingTime: '09:00', closingTime: '21:00' },
      5: { dayOfWeek: 5, isWorkingDay: true, openingTime: '09:00', closingTime: '22:00' },
      6: { dayOfWeek: 6, isWorkingDay: true, openingTime: '10:00', closingTime: '20:00' },
    },
    amenities: ['parking', 'wifi', 'refreshments'],
    parkingAvailable: true,
    accessibleEntrance: true,
    femaleSection: true,
    socialLinks: [
      {
        platform: 'instagram',
        username: 'princess_salon_zarqa',
        url: 'https://instagram.com/princess_salon_zarqa',
        verified: true,
      },
    ],
    createdAt: '2021-01-15T10:00:00Z',
    updatedAt: '2024-01-14T15:30:00Z',
  },
  {
    id: 'provider-2',
    businessName: 'بيوتي هوم',
    businessNameAr: 'بيوتي هوم',
    ownerName: 'سارة المصري',
    phone: '+962785555555',
    email: 'sara@beautyhome.jo',
    bio: 'Mobile beauty services at your doorstep',
    bioAr: 'خدمات الجمال المتنقلة على باب بيتك',
    location: {
      latitude: 32.0600,
      longitude: 36.0900,
    },
    address: 'الزرقاء، حي الرشيد',
    addressAr: 'الزرقاء، حي الرشيد',
    city: 'الزرقاء',
    businessType: BusinessType.MOBILE,
    serviceRadiusKm: 15,
    onboardingStatus: OnboardingStatus.APPROVED,
    onboardingStep: 7,
    profileCompletionPercentage: 95,
    verificationStatus: VerificationStatus.ALTERNATIVE_VERIFIED,
    qualityTier: QualityTier.VERIFIED,
    verified: true,
    active: true,
    rating: 4.6,
    totalReviews: 89,
    whatsappNumber: '+962785555555',
    yearsExperience: 8,
    totalCustomers: 400,
    responseTime: 10,
    staffCount: 1,
    femaleStaff: true,
    languages: ['ar'],
    specializations: ['makeup', 'hair'],
    workingHours: {
      0: { dayOfWeek: 0, isWorkingDay: true, openingTime: '10:00', closingTime: '18:00' },
      1: { dayOfWeek: 1, isWorkingDay: true, openingTime: '09:00', closingTime: '19:00' },
      2: { dayOfWeek: 2, isWorkingDay: true, openingTime: '09:00', closingTime: '19:00' },
      3: { dayOfWeek: 3, isWorkingDay: true, openingTime: '09:00', closingTime: '19:00' },
      4: { dayOfWeek: 4, isWorkingDay: true, openingTime: '09:00', closingTime: '19:00' },
      5: { dayOfWeek: 5, isWorkingDay: false },
      6: { dayOfWeek: 6, isWorkingDay: true, openingTime: '10:00', closingTime: '18:00' },
    },
    createdAt: '2023-03-20T08:00:00Z',
    updatedAt: '2024-01-14T12:00:00Z',
  },
  {
    id: 'provider-3',
    businessName: 'Glamour Spa',
    businessNameAr: 'جلامور سبا',
    ownerName: 'ليلى أبو زيد',
    phone: '+962777777777',
    location: {
      latitude: 32.0850,
      longitude: 36.0750,
    },
    address: 'مجمع السعادة، الزرقاء',
    addressAr: 'مجمع السعادة، الزرقاء',
    city: 'الزرقاء',
    businessType: BusinessType.SPA,
    serviceRadiusKm: 0,
    onboardingStatus: OnboardingStatus.IN_PROGRESS,
    onboardingStep: 4,
    profileCompletionPercentage: 60,
    verificationStatus: VerificationStatus.PENDING,
    qualityTier: QualityTier.BASIC,
    verified: false,
    active: false,
    rating: 0,
    totalReviews: 0,
    createdAt: '2024-01-10T14:00:00Z',
    updatedAt: '2024-01-14T10:00:00Z',
  },
];

// Test provider for onboarding flow
export const newProviderData = {
  phone: '+962798888888',
  ownerName: 'نور الحسن',
  businessName: 'صالون نور',
  businessNameAr: 'صالون نور',
  businessType: BusinessType.SALON,
  address: 'شارع الجيش، مقابل البنك العربي',
  addressAr: 'شارع الجيش، مقابل البنك العربي',
  city: 'الزرقاء',
  location: {
    latitude: 32.0650,
    longitude: 36.0820,
  },
};

// Edge case providers
export const edgeCaseProviders = {
  // Provider with minimal data
  minimalProvider: {
    id: 'minimal-1',
    businessName: 'Test Salon',
    businessNameAr: 'صالون تجريبي',
    ownerName: 'Test Owner',
    phone: '+962799999999',
    location: {
      latitude: 32.0700,
      longitude: 36.0800,
    },
    address: 'Test Address',
    addressAr: 'عنوان تجريبي',
    city: 'الزرقاء',
    businessType: BusinessType.SALON,
    serviceRadiusKm: 0,
    onboardingStatus: OnboardingStatus.PENDING,
    onboardingStep: 1,
    profileCompletionPercentage: 10,
    verificationStatus: VerificationStatus.PENDING,
    qualityTier: QualityTier.BASIC,
    verified: false,
    active: false,
    rating: 0,
    totalReviews: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Provider with conflicting working hours
  conflictingHoursProvider: {
    ...testProviders[0],
    id: 'conflict-1',
    workingHours: {
      1: { 
        dayOfWeek: 1, 
        isWorkingDay: true, 
        openingTime: '22:00', // Late night start
        closingTime: '02:00', // Next day end
      },
    },
  },

  // Provider with all amenities
  fullAmenitiesProvider: {
    ...testProviders[0],
    id: 'amenities-1',
    amenities: ['parking', 'wifi', 'refreshments', 'prayer_room', 'kids_area', 'vip_section'],
    parkingAvailable: true,
    accessibleEntrance: true,
    femaleSection: true,
  },

  // Provider with special characters in name
  specialCharsProvider: {
    ...testProviders[0],
    id: 'special-1',
    businessName: 'Beauty & Glamour (2024)',
    businessNameAr: 'الجمال والأناقة (٢٠٢٤)',
  },

  // Provider with maximum service radius
  maxRadiusProvider: {
    ...testProviders[1],
    id: 'radius-1',
    serviceRadiusKm: 50,
    businessType: BusinessType.MOBILE,
  },
};

// Test services for providers
export const testServices = [
  {
    id: 'service-1',
    providerId: 'provider-1',
    name: {
      ar: 'قص شعر نسائي',
      en: 'Women\'s Haircut',
    },
    description: 'Professional haircut with styling',
    price: 15,
    durationInMinutes: 45,
    category: 'HAIR',
  },
  {
    id: 'service-2',
    providerId: 'provider-1',
    name: {
      ar: 'صبغة شعر',
      en: 'Hair Coloring',
    },
    description: 'Full hair coloring service',
    price: 45,
    durationInMinutes: 120,
    category: 'HAIR',
  },
  {
    id: 'service-3',
    providerId: 'provider-1',
    name: {
      ar: 'مكياج سهرة',
      en: 'Evening Makeup',
    },
    description: 'Professional evening makeup',
    price: 35,
    durationInMinutes: 60,
    category: 'MAKEUP',
  },
  {
    id: 'service-4',
    providerId: 'provider-2',
    name: {
      ar: 'مكياج عروس',
      en: 'Bridal Makeup',
    },
    description: 'Complete bridal makeup package',
    price: 120,
    durationInMinutes: 180,
    category: 'MAKEUP',
  },
];

// Test bookings
export const testBookings = [
  {
    id: 'booking-1',
    customerId: 'customer-1',
    providerId: 'provider-1',
    serviceId: 'service-1',
    date: new Date('2024-01-15T10:00:00'),
    status: 'confirmed',
    totalAmount: 15,
  },
  {
    id: 'booking-2',
    customerId: 'customer-2',
    providerId: 'provider-1',
    serviceId: 'service-2',
    date: new Date('2024-01-15T14:00:00'),
    status: 'confirmed',
    totalAmount: 45,
  },
  {
    id: 'booking-3',
    customerId: 'customer-3',
    providerId: 'provider-1',
    serviceId: 'service-3',
    date: new Date('2024-01-16T18:00:00'),
    status: 'pending',
    totalAmount: 35,
  },
];

// Test reviews
export const testReviews = [
  {
    id: 'review-1',
    providerId: 'provider-1',
    customerId: 'customer-1',
    customerName: 'سمر أحمد',
    rating: 5,
    comment: 'خدمة ممتازة والموظفات محترمات جداً',
    date: new Date('2024-01-10'),
  },
  {
    id: 'review-2',
    providerId: 'provider-1',
    customerId: 'customer-2',
    customerName: 'منى الزعبي',
    rating: 4,
    comment: 'صالون جيد لكن الأسعار مرتفعة قليلاً',
    date: new Date('2024-01-08'),
  },
  {
    id: 'review-3',
    providerId: 'provider-2',
    customerId: 'customer-3',
    customerName: 'هند الخطيب',
    rating: 5,
    comment: 'أفضل خدمة متنقلة في الزرقاء',
    date: new Date('2024-01-05'),
  },
];

// Helper functions for test data generation
export const generateRandomProvider = (overrides?: Partial<Provider>): Provider => {
  const id = `provider-${Date.now()}`;
  const randomRating = Math.floor(Math.random() * 20 + 30) / 10; // 3.0 - 5.0
  const randomReviews = Math.floor(Math.random() * 200);
  
  return {
    id,
    businessName: `Test Salon ${id}`,
    businessNameAr: `صالون تجريبي ${id}`,
    ownerName: `Test Owner ${id}`,
    phone: `+96279${Math.floor(Math.random() * 10000000)}`,
    location: {
      latitude: 32.0728 + (Math.random() - 0.5) * 0.1,
      longitude: 36.0881 + (Math.random() - 0.5) * 0.1,
    },
    address: 'Test Address',
    addressAr: 'عنوان تجريبي',
    city: 'الزرقاء',
    businessType: BusinessType.SALON,
    serviceRadiusKm: 0,
    onboardingStatus: OnboardingStatus.APPROVED,
    onboardingStep: 7,
    profileCompletionPercentage: 100,
    verificationStatus: VerificationStatus.VERIFIED,
    qualityTier: QualityTier.VERIFIED,
    verified: true,
    active: true,
    rating: randomRating,
    totalReviews: randomReviews,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
};

export const generateBulkProviders = (count: number): Provider[] => {
  return Array.from({ length: count }, (_, i) => 
    generateRandomProvider({
      businessName: `صالون ${i + 1}`,
      businessNameAr: `صالون ${i + 1}`,
      rating: 3 + Math.random() * 2,
      totalReviews: Math.floor(Math.random() * 500),
    })
  );
};