// Provider Onboarding Types
// Enhanced types for the multi-step provider registration and onboarding flow

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

export interface VerificationDocument {
  id: string;
  providerId: string;
  documentType: string;
  documentUrl: string;
  documentNumber?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  id: string;
  providerId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  is24Hours: boolean;
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
  createdAt: string;
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

export interface EnhancedProvider {
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
  
  // Onboarding related
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  profileCompletionPercentage: number;
  
  // Verification related
  verificationStatus: VerificationStatus;
  licenseType?: string;
  licenseDocumentUrl?: string;
  licenseDocumentNumber?: string;
  alternativeVerification?: AlternativeVerification;
  
  // Quality and status
  qualityTier: QualityTier;
  verified: boolean;
  active: boolean;
  rating: number;
  totalReviews: number;
  
  // Business info
  portfolioImages: string[];
  businessReferences: any[];
  socialMediaVerified: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Onboarding Step Data Interfaces
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
    [key: number]: { // day of week
      isWorkingDay: boolean;
      openingTime?: string;
      closingTime?: string;
      breakStartTime?: string;
      breakEndTime?: string;
    };
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

// API Request/Response Types
export interface StartOnboardingRequest {
  phone: string;
  userType: 'provider';
}

export interface UpdateOnboardingStepRequest {
  stepNumber: number;
  data: Record<string, any>;
  isCompleted?: boolean;
}

export interface OnboardingStepResponse {
  step: OnboardingStep;
  nextStep?: number;
  isLastStep: boolean;
  profileCompletion: number;
}

export interface ProviderOnboardingResponse {
  provider: EnhancedProvider;
  steps: OnboardingStep[];
  currentStep: number;
  profileCompletion: number;
  availableServiceTemplates: ServiceTemplate[];
}

export interface UploadDocumentRequest {
  documentType: string;
  documentNumber?: string;
  file: File | Buffer;
}

export interface UploadDocumentResponse {
  document: VerificationDocument;
  message: string;
}

export type DefaultBusinessHoursConfig = {
  [key in BusinessType]: {
    [dayOfWeek: number]: {
      isWorkingDay: boolean;
      openingTime?: string;
      closingTime?: string;
      breakStartTime?: string;
      breakEndTime?: string;
    };
  };
};

// Validation schemas
export interface OnboardingValidationRules {
  personalInformation: {
    ownerName: { required: true; minLength: 2; maxLength: 100 };
    email: { required: false; format: 'email' };
  };
  businessDetails: {
    businessName: { required: true; minLength: 2; maxLength: 200 };
    businessNameAr: { required: true; minLength: 2; maxLength: 200 };
    businessType: { required: true; enum: BusinessType };
    selectedCategories: { required: true; minItems: 1; maxItems: 5 };
  };
  locationSetup: {
    address: { required: true; minLength: 10; maxLength: 500 };
    latitude: { required: true; min: -90; max: 90 };
    longitude: { required: true; min: -180; max: 180 };
  };
  // ... additional validation rules for other steps
}
