// Enhanced Provider Types with Jordan Market Specifics
// Comprehensive types for the enhanced provider profile system

export interface JordanWorkingHours {
  timezone: 'Asia/Amman';
  defaultSchedule: {
    [dayOfWeek: number]: {
      dayName: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
      isWorkingDay: boolean;
      shifts: WorkShift[];
      specialNotes?: string;
      specialNotesAr?: string;
    };
  };
  specialSchedules: {
    ramadan?: {
      enabled: boolean;
      schedule: { [dayOfWeek: number]: WorkingDaySchedule };
    };
    holidays: HolidaySchedule[];
    temporary?: TemporarySchedule[];
  };
  flexibleSchedules: {
    mobileProvider: boolean;
    appointmentOnly: boolean;
    walkInsAccepted: boolean;
    extendsForClients: boolean;
  };
}

export interface WorkShift {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  breakStart?: string;
  breakEnd?: string;
  maxClients?: number;
  serviceTypes?: string[]; // Specific services available during this shift
}

export interface WorkingDaySchedule {
  isWorkingDay: boolean;
  shifts: WorkShift[];
  specialNotes?: string;
  specialNotesAr?: string;
}

export interface HolidaySchedule {
  date: string; // YYYY-MM-DD
  name: string;
  nameAr: string;
  isWorkingDay: boolean;
  customHours?: WorkShift[];
}

export interface TemporarySchedule {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  reasonAr: string;
  workingHours: { [dayOfWeek: number]: WorkingDaySchedule };
}

export interface ProviderGalleryImage {
  id: string;
  providerId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: 'portfolio' | 'salon_interior' | 'before_after' | 'certificates' | 'team';
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  sortOrder: number;
  isActive: boolean;
  metadata: {
    originalName: string;
    fileSize: number;
    dimensions?: { width: number; height: number };
    uploadedAt: string;
    mimeType: string;
    altText?: string;
    altTextAr?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProviderServiceCategory {
  id: string;
  providerId: string;
  categoryId: string;
  isPrimary: boolean;
  expertiseLevel: 1 | 2 | 3 | 4 | 5; // 1=Beginner, 5=Expert
  yearsExperience: number;
  certificationUrl?: string;
  portfolioImages: string[];
  createdAt: string;
  updatedAt: string;
  // Populated from service_categories table
  categoryNameEn?: string;
  categoryNameAr?: string;
  categoryIcon?: string;
}

export interface Certification {
  id: string;
  name: string;
  nameAr: string;
  issuingOrganization: string;
  issuingOrganizationAr: string;
  issueDate: string;
  expiryDate?: string;
  certificateUrl?: string;
  verificationUrl?: string;
  isVerified: boolean;
}

export interface Award {
  id: string;
  title: string;
  titleAr: string;
  description?: string;
  descriptionAr?: string;
  issuingOrganization: string;
  dateReceived: string;
  category: string;
  imageUrl?: string;
}

export interface Specialization {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience: number;
}

export interface AccessibilityFeature {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  category: 'mobility' | 'visual' | 'hearing' | 'other';
}

export enum BusinessType {
  SALON = 'salon',
  SPA = 'spa',
  MOBILE = 'mobile',
  HOME_BASED = 'home_based',
  CLINIC = 'clinic'
}

export enum OnboardingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum VerificationStatus {
  PENDING = 'pending',
  DOCUMENTS_SUBMITTED = 'documents_submitted',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  ALTERNATIVE_VERIFIED = 'alternative_verified'
}

export enum QualityTier {
  BASIC = 1,
  VERIFIED = 2,
  PREMIUM = 3
}

export interface EnhancedProvider {
  // Basic Information
  id: string;
  businessName: string;
  businessNameAr?: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  bioAr?: string;
  
  // Location
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  addressAr?: string;
  city: string;
  businessType: BusinessType;
  serviceRadiusKm?: number;
  
  // Professional Information
  yearsOfExperience?: number;
  certifications: Certification[];
  awards: Award[];
  specializations: Specialization[];
  
  // Business Information
  establishedYear?: number;
  teamSize?: number;
  languagesSpoken: string[];
  paymentMethodsAccepted: string[];
  
  // SEO and Marketing
  seoSlug?: string;
  metaDescriptionEn?: string;
  metaDescriptionAr?: string;
  featuredUntil?: string;
  boostScore: number;
  
  // Operational Details
  minimumBookingNoticeHours: number;
  maximumAdvanceBookingDays: number;
  cancellationPolicyEn?: string;
  cancellationPolicyAr?: string;
  depositRequired: boolean;
  depositPercentage: number;
  
  // Contact and Social
  whatsappNumber?: string;
  instagramHandle?: string;
  websiteUrl?: string;
  socialMedia: SocialMediaProfile[];
  
  // Accessibility and Features
  accessibilityFeatures: AccessibilityFeature[];
  parkingAvailable: boolean;
  
  // Status and Verification
  verified: boolean;
  active: boolean;
  onboardingStatus: OnboardingStatus;
  verificationStatus: VerificationStatus;
  qualityTier: QualityTier;
  
  // Performance Metrics
  rating: number;
  totalReviews: number;
  profileCompletionPercentage: number;
  
  // Relationships
  serviceCategories: ProviderServiceCategory[];
  gallery: ProviderGalleryImage[];
  workingHours: JordanWorkingHours;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaProfile {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'youtube' | 'website';
  url: string;
  handle?: string;
  verified: boolean;
  followerCount?: number;
  verifiedAt?: string;
}

// Jordan-specific validation rules
export interface JordanProviderValidation {
  businessName: {
    minLength: 2;
    maxLength: 200;
    pattern: RegExp; // Arabic and English characters allowed
    required: true;
  };
  phone: {
    pattern: RegExp; // Jordan mobile format: +962[7-9]XXXXXXXX
    required: true;
  };
  location: {
    jordanBounds: {
      lat: { min: 29.1; max: 33.4 };
      lng: { min: 34.8; max: 39.3 };
    };
    required: true;
  };
  licenseNumber: {
    pattern: RegExp; // Jordan business license format
    conditionalRequired: boolean; // Required for salons/spas
  };
  workingHours: {
    timezone: 'Asia/Amman';
    maxShiftsPerDay: 3;
    minBreakBetweenShifts: 30; // minutes
    weekendDays: [5, 6]; // Friday, Saturday
    ramadanSupport: boolean;
  };
  languages: {
    required: ['ar']; // Arabic is mandatory
    optional: ['en', 'fr']; // Other supported languages
  };
}

// API Request/Response Types
export interface UpdateProviderProfileRequest {
  basicInfo?: {
    businessName?: string;
    businessNameAr?: string;
    bio?: string;
    bioAr?: string;
    email?: string;
    whatsappNumber?: string;
    websiteUrl?: string;
    instagramHandle?: string;
  };
  professionalInfo?: {
    yearsOfExperience?: number;
    establishedYear?: number;
    teamSize?: number;
    specializations?: Specialization[];
    certifications?: Certification[];
    awards?: Award[];
  };
  businessSettings?: {
    minimumBookingNoticeHours?: number;
    maximumAdvanceBookingDays?: number;
    depositRequired?: boolean;
    depositPercentage?: number;
    cancellationPolicyEn?: string;
    cancellationPolicyAr?: string;
    paymentMethodsAccepted?: string[];
    languagesSpoken?: string[];
  };
  accessibility?: {
    parkingAvailable?: boolean;
    accessibilityFeatures?: AccessibilityFeature[];
  };
}

export interface UpdateWorkingHoursRequest {
  defaultSchedule: {
    [dayOfWeek: number]: WorkingDaySchedule;
  };
  specialSchedules?: {
    ramadan?: {
      enabled: boolean;
      schedule: { [dayOfWeek: number]: WorkingDaySchedule };
    };
  };
  flexibleSchedules?: {
    mobileProvider?: boolean;
    appointmentOnly?: boolean;
    walkInsAccepted?: boolean;
    extendsForClients?: boolean;
  };
}

export interface AddServiceCategoryRequest {
  categoryId: string;
  isPrimary?: boolean;
  expertiseLevel: 1 | 2 | 3 | 4 | 5;
  yearsExperience: number;
  certificationUrl?: string;
  portfolioImages?: string[];
}

export interface UploadGalleryImageRequest {
  category: 'portfolio' | 'salon_interior' | 'before_after' | 'certificates' | 'team';
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  altText?: string;
  altTextAr?: string;
  sortOrder?: number;
}

export interface UpdateSEORequest {
  metaDescriptionEn?: string;
  metaDescriptionAr?: string;
  customSlug?: string; // Admin only
}

export interface ProviderAnalytics {
  profileViews: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    trend: 'up' | 'down' | 'stable';
  };
  bookingConversion: {
    viewsToBookings: number;
    averageBookingValue: number;
    repeatCustomerRate: number;
  };
  searchVisibility: {
    averagePosition: number;
    impressions: number;
    clicks: number;
    ctr: number;
  };
  completionScore: {
    current: number;
    recommendations: string[];
  };
}

// Default configurations for Jordan market
export const JORDAN_DEFAULT_CONFIG = {
  workingHours: {
    timezone: 'Asia/Amman' as const,
    weekendDays: [5, 6], // Friday, Saturday
    defaultShifts: {
      morning: { startTime: '09:00', endTime: '13:00' },
      afternoon: { startTime: '14:00', endTime: '18:00' },
      evening: { startTime: '19:00', endTime: '22:00' },
    },
    ramadanShifts: {
      morning: { startTime: '10:00', endTime: '14:00' },
      evening: { startTime: '20:00', endTime: '23:00' },
    },
  },
  businessTypes: ['salon', 'spa', 'mobile', 'home_based', 'clinic'] as const,
  paymentMethods: ['cash', 'card', 'wallet', 'bank_transfer'] as const,
  languages: ['ar', 'en', 'fr'] as const,
  serviceRadius: {
    min: 1,
    max: 50,
    default: 5,
  },
  holidays: [
    { date: '2025-04-10', name: 'Eid al-Fitr', nameAr: 'عيد الفطر', isWorkingDay: false },
    { date: '2025-06-16', name: 'Eid al-Adha', nameAr: 'عيد الأضحى', isWorkingDay: false },
    { date: '2025-05-25', name: 'Independence Day', nameAr: 'عيد الاستقلال', isWorkingDay: false },
    { date: '2025-01-01', name: 'New Year', nameAr: 'رأس السنة', isWorkingDay: false },
  ],
};

export type JordanBusinessType = typeof JORDAN_DEFAULT_CONFIG.businessTypes[number];
export type JordanPaymentMethod = typeof JORDAN_DEFAULT_CONFIG.paymentMethods[number];
export type JordanLanguage = typeof JORDAN_DEFAULT_CONFIG.languages[number];
