// User Role enum
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  PROVIDER = 'PROVIDER'
}

// User type
export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  languagePreference?: string;
  createdAt: string;
  updatedAt: string;
}

// Enhanced Provider type
export interface Provider {
  id: string;
  businessName: string;
  businessNameAr?: string;
  ownerName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  bioAr?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  addressAr?: string;
  city: string;
  businessType: BusinessType;
  serviceRadiusKm: number;
  
  // Onboarding and verification
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  profileCompletionPercentage: number;
  verificationStatus: VerificationStatus;
  qualityTier: QualityTier;
  
  // Status
  verified: boolean;
  active: boolean;
  rating: number;
  totalReviews: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Onboarding enums
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

export enum BusinessType {
  SALON = 'salon',
  SPA = 'spa',
  MOBILE = 'mobile',
  HOME_BASED = 'home_based',
  CLINIC = 'clinic'
}

export enum QualityTier {
  BASIC = 1,
  VERIFIED = 2,
  PREMIUM = 3
}

// Service type
export interface Service {
  id: string;
  providerId: string;
  name: {
    ar: string;
    en: string;
  };
  description: string;
  price: number;
  durationInMinutes: number;
  category: ServiceCategory;
}

// Booking type
export interface Booking {
  id: string;
  userId: string;
  providerId: string;
  serviceId: string;
  date: Date;
  time: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
}

// Service Category enum
export enum ServiceCategory {
  HAIR = 'HAIR',
  NAILS = 'NAILS',
  MAKEUP = 'MAKEUP',
  SPA = 'SPA',
  AESTHETIC = 'AESTHETIC'
}

// Booking Status enum
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Payment Method enum
export enum PaymentMethod {
  ONLINE = 'ONLINE',
  ON_SITE = 'ON_SITE'
}

// Provider Onboarding Types
export interface OnboardingStep {
  id: string;
  providerId: string;
  stepNumber: number;
  stepName: string;
  isCompleted: boolean;
  data: Record<string, any>;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceTemplate {
  id: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  typicalDurationMinutes?: number;
  typicalPriceRangeMin?: number;
  typicalPriceRangeMax?: number;
  isPopular: boolean;
}

export interface BusinessHours {
  dayOfWeek: number;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface AlternativeVerification {
  portfolioImages: string[];
  businessReferences: {
    name: string;
    phone: string;
    relationship: string;
  }[];
  socialMediaProfiles: {
    platform: string;
    url: string;
    verified: boolean;
  }[];
  yearsOfExperience?: number;
  previousWorkLocation?: string;
  specializations: string[];
}

// Onboarding step data interfaces
export interface PersonalInformationData {
  ownerName: string;
  email?: string;
  avatarUrl?: string;
  languagePreference: 'ar' | 'en';
}

export interface BusinessDetailsData {
  businessName: string;
  businessNameAr: string;
  businessType: BusinessType;
  bio?: string;
  bioAr?: string;
  selectedCategories: string[];
  coverImageUrl?: string;
}

export interface LocationSetupData {
  address: string;
  addressAr: string;
  city: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm?: number;
  servesAtLocation: boolean;
  comesToCustomer: boolean;
}

export interface ServiceCategoriesData {
  selectedCategories: string[];
  customServices: {
    categoryId: string;
    nameEn: string;
    nameAr: string;
    price: number;
    durationMinutes: number;
    descriptionEn?: string;
    descriptionAr?: string;
  }[];
}

export interface LicenseVerificationData {
  hasLicense: boolean;
  licenseType?: string;
  licenseNumber?: string;
  licenseDocumentUrl?: string;
  alternativeVerification?: AlternativeVerification;
}

export interface WorkingHoursData {
  businessHours: {
    [key: number]: BusinessHours;
  };
  useDefaultHours: boolean;
  businessType: BusinessType;
}

export interface ReviewSubmitData {
  agreedToTerms: boolean;
  marketingConsent: boolean;
  communicationPreferences: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
}
