import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Provider, 
  OnboardingStep, 
  ServiceTemplate,
  BusinessType,
  PersonalInformationData,
  BusinessDetailsData,
  LocationSetupData,
  ServiceCategoriesData,
  LicenseVerificationData,
  WorkingHoursData,
  ReviewSubmitData,
  BusinessHours
} from '../types';
import { apiClient } from './api/client';

export class ProviderOnboardingService {
  private static readonly ONBOARDING_KEY = 'provider_onboarding_data';
  private static readonly CURRENT_STEP_KEY = 'provider_current_step';

  // Get current onboarding state
  static async getCurrentOnboardingState(): Promise<{
    provider?: Provider;
    steps: OnboardingStep[];
    currentStep: number;
    serviceTemplates: ServiceTemplate[];
  } | null> {
    try {
      const cachedData = await AsyncStorage.getItem(this.ONBOARDING_KEY);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      console.error('Error getting onboarding state:', error);
      return null;
    }
  }

  // Save onboarding state locally
  static async saveOnboardingState(data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ONBOARDING_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  }

  // Initialize provider onboarding
  static async initializeOnboarding(phone: string): Promise<{
    provider: Provider;
    steps: OnboardingStep[];
    serviceTemplates: ServiceTemplate[];
  }> {
    try {
      const response = await apiClient.post('/providers/onboarding/initialize', {
        phone,
        userType: 'provider'
      });

      // Cache the initial state
      await this.saveOnboardingState(response.data);
      await AsyncStorage.setItem(this.CURRENT_STEP_KEY, '1');

      return response.data;
    } catch (error) {
      console.error('Error initializing onboarding:', error);
      throw error;
    }
  }

  // Update onboarding step
  static async updateOnboardingStep(
    stepNumber: number,
    data: Record<string, any>,
    isCompleted: boolean = true
  ): Promise<{
    step: OnboardingStep;
    nextStep?: number;
    isLastStep: boolean;
    profileCompletion: number;
  }> {
    try {
      const response = await apiClient.put('/providers/onboarding/step', {
        stepNumber,
        data,
        isCompleted
      });

      // Update cached data
      const cachedData = await this.getCurrentOnboardingState();
      if (cachedData) {
        const stepIndex = cachedData.steps.findIndex(s => s.stepNumber === stepNumber);
        if (stepIndex >= 0) {
          cachedData.steps[stepIndex] = response.data.step;
        }
        
        await this.saveOnboardingState(cachedData);
        
        if (response.data.nextStep) {
          await AsyncStorage.setItem(this.CURRENT_STEP_KEY, response.data.nextStep.toString());
        }
      }

      return response.data;
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      throw error;
    }
  }

  // Get service templates by category
  static async getServiceTemplates(categoryIds?: string[]): Promise<ServiceTemplate[]> {
    try {
      const params = categoryIds ? { categories: categoryIds.join(',') } : {};
      const response = await apiClient.get('/providers/service-templates', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting service templates:', error);
      throw error;
    }
  }

  // Upload verification document
  static async uploadVerificationDocument(
    documentType: string,
    file: any,
    documentNumber?: string
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);
      if (documentNumber) {
        formData.append('documentNumber', documentNumber);
      }

      const response = await apiClient.post('/providers/onboarding/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  // Complete onboarding
  static async completeOnboarding(): Promise<Provider> {
    try {
      const response = await apiClient.post('/providers/onboarding/complete');
      
      // Clear onboarding cache
      await AsyncStorage.removeItem(this.ONBOARDING_KEY);
      await AsyncStorage.removeItem(this.CURRENT_STEP_KEY);

      return response.data.provider;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  // Step-specific methods
  static async updatePersonalInformation(data: PersonalInformationData): Promise<any> {
    return this.updateOnboardingStep(1, data, true);
  }

  static async updateBusinessDetails(data: BusinessDetailsData): Promise<any> {
    return this.updateOnboardingStep(2, data, true);
  }

  static async updateLocationSetup(data: LocationSetupData): Promise<any> {
    return this.updateOnboardingStep(3, data, true);
  }

  static async updateServiceCategories(data: ServiceCategoriesData): Promise<any> {
    return this.updateOnboardingStep(4, data, true);
  }

  static async updateLicenseVerification(data: LicenseVerificationData): Promise<any> {
    return this.updateOnboardingStep(5, data, true);
  }

  static async updateWorkingHours(data: WorkingHoursData): Promise<any> {
    return this.updateOnboardingStep(6, data, true);
  }

  static async updateReviewSubmit(data: ReviewSubmitData): Promise<any> {
    return this.updateOnboardingStep(7, data, true);
  }

  // Get default business hours based on business type
  static getDefaultBusinessHours(businessType: BusinessType): { [key: number]: BusinessHours } {
    const defaultHours: { [key: number]: BusinessHours } = {};

    // Default hours for different business types
    const salonHours = {
      isWorkingDay: true,
      openingTime: '09:00',
      closingTime: '20:00',
      breakStartTime: '13:00',
      breakEndTime: '14:30',
    };

    const mobileHours = {
      isWorkingDay: true,
      openingTime: '10:00',
      closingTime: '18:00',
    };

    // Configure hours for each day (0 = Sunday, 6 = Saturday)
    for (let day = 0; day <= 6; day++) {
      if (day === 5) { // Friday
        defaultHours[day] = {
          dayOfWeek: day,
          isWorkingDay: true,
          openingTime: businessType === BusinessType.MOBILE ? '15:00' : '14:30',
          closingTime: businessType === BusinessType.MOBILE ? '18:00' : '20:00',
        };
      } else {
        defaultHours[day] = {
          dayOfWeek: day,
          ...(businessType === BusinessType.MOBILE ? mobileHours : salonHours),
        };
      }
    }

    return defaultHours;
  }

  // Validate step data
  static validateStepData(stepNumber: number, data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (stepNumber) {
      case 1: // Personal Information
        if (!data.ownerName || data.ownerName.trim().length < 2) {
          errors.push('Owner name must be at least 2 characters');
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push('Please enter a valid email address');
        }
        break;

      case 2: // Business Details
        if (!data.businessName || data.businessName.trim().length < 2) {
          errors.push('Business name (English) is required');
        }
        if (!data.businessNameAr || data.businessNameAr.trim().length < 2) {
          errors.push('Business name (Arabic) is required');
        }
        if (!data.businessType) {
          errors.push('Business type is required');
        }
        if (!data.selectedCategories || data.selectedCategories.length === 0) {
          errors.push('Please select at least one service category');
        }
        break;

      case 3: // Location Setup
        if (!data.address || data.address.trim().length < 10) {
          errors.push('Please provide a detailed address');
        }
        if (!data.latitude || !data.longitude) {
          errors.push('Please select location on map');
        }
        break;

      case 4: // Service Categories
        if (!data.selectedCategories || data.selectedCategories.length === 0) {
          errors.push('Please select at least one service category');
        }
        break;

      case 5: // License Verification
        if (data.hasLicense) {
          if (!data.licenseType) {
            errors.push('License type is required');
          }
          if (!data.licenseNumber) {
            errors.push('License number is required');
          }
        } else {
          if (!data.alternativeVerification?.portfolioImages?.length) {
            errors.push('Please upload at least 3 portfolio images');
          }
        }
        break;

      case 6: // Working Hours
        if (!data.businessHours) {
          errors.push('Please set your working hours');
        } else {
          const hasWorkingDay = Object.values(data.businessHours).some(
            (hours: any) => hours.isWorkingDay
          );
          if (!hasWorkingDay) {
            errors.push('Please select at least one working day');
          }
        }
        break;

      case 7: // Review & Submit
        if (!data.agreedToTerms) {
          errors.push('Please agree to the terms and conditions');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get step progress
  static async getStepProgress(): Promise<{
    currentStep: number;
    completedSteps: number;
    totalSteps: number;
    percentage: number;
  }> {
    try {
      const cachedData = await this.getCurrentOnboardingState();
      const currentStepStr = await AsyncStorage.getItem(this.CURRENT_STEP_KEY);
      
      const currentStep = currentStepStr ? parseInt(currentStepStr, 10) : 1;
      const completedSteps = cachedData?.steps.filter(s => s.isCompleted).length || 0;
      const totalSteps = 7;
      const percentage = Math.round((completedSteps / totalSteps) * 100);

      return {
        currentStep,
        completedSteps,
        totalSteps,
        percentage
      };
    } catch (error) {
      console.error('Error getting step progress:', error);
      return {
        currentStep: 1,
        completedSteps: 0,
        totalSteps: 7,
        percentage: 0
      };
    }
  }
}
