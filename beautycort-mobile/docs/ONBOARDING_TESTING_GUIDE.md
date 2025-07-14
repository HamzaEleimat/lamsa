# Provider Onboarding Testing Guide

## Overview

This document provides comprehensive testing strategies, test cases, and automation guidelines for the BeautyCort mobile provider onboarding flow.

## Testing Strategy

### Testing Pyramid

```
                    E2E Tests (10%)
                 ┌─────────────────────┐
                 │  Full User Journeys │
                 │  Cross-Platform     │
                 │  Real Device Testing│
                 └─────────────────────┘
                Integration Tests (20%)
            ┌─────────────────────────────────┐
            │  Component Integration          │
            │  Service Layer Testing          │
            │  Navigation Flow Testing        │
            └─────────────────────────────────┘
           Unit Tests (70%)
    ┌─────────────────────────────────────────────┐
    │  Component Unit Tests                       │
    │  Service Method Testing                     │
    │  Utility Function Testing                   │
    │  Validation Logic Testing                   │
    └─────────────────────────────────────────────┘
```

### Test Categories

1. **Unit Tests**: Individual component and function testing
2. **Integration Tests**: Component and service integration
3. **E2E Tests**: Complete user journey testing
4. **Visual Tests**: UI consistency and RTL layout
5. **Performance Tests**: Load time and memory usage
6. **Accessibility Tests**: Screen reader and keyboard navigation
7. **Device Tests**: Multiple devices and screen sizes

## Test Setup

### Dependencies

```json
{
  "devDependencies": {
    "@testing-library/react-native": "^12.4.0",
    "@testing-library/jest-native": "^5.4.3",
    "jest": "^29.7.0",
    "detox": "^20.19.0",
    "react-test-renderer": "^19.0.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Test Setup File

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useRoute: () => ({
    params: { phoneNumber: '+962791234567' },
  }),
}));

// Mock Expo modules
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => ({ status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(() => ({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => ({
    coords: { latitude: 31.9515, longitude: 35.9239 },
  })),
}));

// Mock i18n
jest.mock('../i18n', () => ({
  t: (key: string) => key,
  isRTL: () => false,
}));

// Global test utilities
global.mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
};

global.mockRoute = {
  params: { phoneNumber: '+962791234567' },
};
```

## Unit Tests

### Component Testing

#### BusinessInformationScreen Tests

```typescript
// src/screens/auth/onboarding/__tests__/BusinessInformationScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import BusinessInformationScreen from '../BusinessInformationScreen';
import { ProviderOnboardingService } from '../../../../services/ProviderOnboardingService';

// Mock the service
jest.mock('../../../../services/ProviderOnboardingService');

const mockProviderOnboardingService = ProviderOnboardingService as jest.Mocked<typeof ProviderOnboardingService>;

const renderScreen = () => {
  return render(
    <PaperProvider>
      <BusinessInformationScreen 
        navigation={global.mockNavigation as any}
        route={global.mockRoute as any}
      />
    </PaperProvider>
  );
};

describe('BusinessInformationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProviderOnboardingService.getCurrentOnboardingState.mockResolvedValue(null);
    mockProviderOnboardingService.updatePersonalInformation.mockResolvedValue({});
    mockProviderOnboardingService.validateStepData.mockReturnValue({ isValid: true, errors: [] });
  });

  describe('Form Validation', () => {
    it('should show error when owner name is empty', async () => {
      const { getByText, getByTestId } = renderScreen();
      
      fireEvent.press(getByTestId('continue-button'));
      
      await waitFor(() => {
        expect(getByText('providerOnboarding.validation.ownerNameRequired')).toBeTruthy();
      });
    });

    it('should validate email format', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      fireEvent.changeText(getByTestId('owner-name-input'), 'Test Owner');
      fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
      fireEvent.press(getByTestId('continue-button'));
      
      await waitFor(() => {
        expect(getByText('providerOnboarding.validation.emailInvalid')).toBeTruthy();
      });
    });

    it('should require business names in both languages', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      fireEvent.changeText(getByTestId('owner-name-input'), 'Test Owner');
      fireEvent.press(getByTestId('continue-button'));
      
      await waitFor(() => {
        expect(getByText('providerOnboarding.validation.businessNameRequired')).toBeTruthy();
        expect(getByText('providerOnboarding.validation.businessNameArRequired')).toBeTruthy();
      });
    });
  });

  describe('Business Type Selection', () => {
    it('should allow business type selection', async () => {
      const { getByTestId } = renderScreen();
      
      fireEvent.press(getByTestId('business-type-mobile'));
      
      expect(getByTestId('business-type-mobile')).toHaveProp('selected', true);
    });

    it('should show appropriate description for selected business type', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      fireEvent.press(getByTestId('business-type-mobile'));
      
      expect(getByText('providerOnboarding.businessType.mobileDescription')).toBeTruthy();
    });
  });

  describe('Draft Saving', () => {
    it('should save draft data on input change', async () => {
      const { getByTestId } = renderScreen();
      
      fireEvent.changeText(getByTestId('owner-name-input'), 'Test Owner');
      
      await waitFor(() => {
        expect(mockProviderOnboardingService.updatePersonalInformation).toHaveBeenCalledWith({
          ownerName: 'Test Owner',
          isCompleted: false,
        });
      });
    });

    it('should load existing draft data', async () => {
      const mockDraftData = {
        provider: {},
        steps: [{
          stepNumber: 1,
          data: {
            ownerName: 'Existing Owner',
            businessName: 'Existing Business',
          },
        }],
        serviceTemplates: [],
      };
      
      mockProviderOnboardingService.getCurrentOnboardingState.mockResolvedValue(mockDraftData);
      
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('owner-name-input')).toHaveProp('value', 'Existing Owner');
        expect(getByTestId('business-name-input')).toHaveProp('value', 'Existing Business');
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit valid form and navigate to next step', async () => {
      const { getByTestId } = renderScreen();
      
      fireEvent.changeText(getByTestId('owner-name-input'), 'Test Owner');
      fireEvent.changeText(getByTestId('business-name-input'), 'Test Business');
      fireEvent.changeText(getByTestId('business-name-ar-input'), 'اختبار العمل');
      fireEvent.press(getByTestId('business-type-salon'));
      fireEvent.press(getByTestId('continue-button'));
      
      await waitFor(() => {
        expect(mockProviderOnboardingService.updatePersonalInformation).toHaveBeenCalledWith({
          ownerName: 'Test Owner',
          businessName: 'Test Business',
          businessNameAr: 'اختبار العمل',
          businessType: 'salon',
          isCompleted: true,
        });
        expect(global.mockNavigation.navigate).toHaveBeenCalledWith('LocationSetup', {
          phoneNumber: '+962791234567',
        });
      });
    });

    it('should handle submission errors', async () => {
      const mockError = new Error('Network error');
      mockProviderOnboardingService.updatePersonalInformation.mockRejectedValue(mockError);
      
      const { getByTestId } = renderScreen();
      
      fireEvent.changeText(getByTestId('owner-name-input'), 'Test Owner');
      fireEvent.changeText(getByTestId('business-name-input'), 'Test Business');
      fireEvent.changeText(getByTestId('business-name-ar-input'), 'اختبار العمل');
      fireEvent.press(getByTestId('continue-button'));
      
      await waitFor(() => {
        expect(mockProviderOnboardingService.updatePersonalInformation).toHaveBeenCalled();
        // Error should be logged but not crash the app
      });
    });
  });

  describe('RTL Support', () => {
    it('should apply RTL styles when in Arabic mode', async () => {
      // Mock RTL mode
      jest.doMock('../../../../i18n', () => ({
        t: (key: string) => key,
        isRTL: () => true,
      }));
      
      const { getByTestId } = renderScreen();
      
      expect(getByTestId('business-name-ar-input')).toHaveStyle({
        textAlign: 'right',
        writingDirection: 'rtl',
      });
    });
  });
});
```

#### ProgressIndicator Tests

```typescript
// src/components/onboarding/__tests__/ProgressIndicator.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import ProgressIndicator from '../ProgressIndicator';

const mockStepTitles = [
  'Business Info',
  'Location',
  'Categories',
  'Working Hours',
  'License',
  'Tutorial',
  'Completion',
];

const renderComponent = (props = {}) => {
  const defaultProps = {
    currentStep: 3,
    totalSteps: 7,
    stepTitles: mockStepTitles,
    ...props,
  };

  return render(
    <PaperProvider>
      <ProgressIndicator {...defaultProps} />
    </PaperProvider>
  );
};

describe('ProgressIndicator', () => {
  it('should render correctly with given props', () => {
    const { getByText } = renderComponent();
    
    expect(getByText('providerOnboarding.progress.title')).toBeTruthy();
    expect(getByText('providerOnboarding.progress.step')).toBeTruthy();
  });

  it('should display correct progress percentage', () => {
    const { getByText } = renderComponent({ currentStep: 3, totalSteps: 7 });
    
    const expectedPercentage = Math.round((3 / 7) * 100);
    expect(getByText(`${expectedPercentage}%`)).toBeTruthy();
  });

  it('should highlight current step', () => {
    const { getByTestId } = renderComponent({ currentStep: 3 });
    
    expect(getByTestId('step-indicator-2')).toHaveStyle({
      backgroundColor: expect.any(String), // Should have active background
    });
  });

  it('should show completed steps with check icons', () => {
    const { getByTestId } = renderComponent({ currentStep: 4 });
    
    // Steps 1-3 should be completed
    expect(getByTestId('step-icon-0')).toHaveProp('name', 'check-circle');
    expect(getByTestId('step-icon-1')).toHaveProp('name', 'check-circle');
    expect(getByTestId('step-icon-2')).toHaveProp('name', 'check-circle');
  });

  it('should handle edge cases', () => {
    // Test with step 1
    const { getByText: getByTextStep1 } = renderComponent({ currentStep: 1, totalSteps: 7 });
    expect(getByTextStep1('14%')).toBeTruthy(); // 1/7 ≈ 14%

    // Test with final step
    const { getByText: getByTextFinal } = renderComponent({ currentStep: 7, totalSteps: 7 });
    expect(getByTextFinal('100%')).toBeTruthy();
  });
});
```

### Service Testing

#### ProviderOnboardingService Tests

```typescript
// src/services/__tests__/ProviderOnboardingService.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProviderOnboardingService } from '../ProviderOnboardingService';
import { apiClient } from '../api/client';
import { BusinessType } from '../../types';

jest.mock('../api/client');
jest.mock('@react-native-async-storage/async-storage');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('ProviderOnboardingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentOnboardingState', () => {
    it('should return cached onboarding state', async () => {
      const mockState = {
        provider: { id: 'test-id' },
        steps: [],
        serviceTemplates: [],
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockState));
      
      const result = await ProviderOnboardingService.getCurrentOnboardingState();
      
      expect(result).toEqual(mockState);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('provider_onboarding_data');
    });

    it('should return null when no cached state exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await ProviderOnboardingService.getCurrentOnboardingState();
      
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
      
      const result = await ProviderOnboardingService.getCurrentOnboardingState();
      
      expect(result).toBeNull();
    });
  });

  describe('initializeOnboarding', () => {
    it('should initialize onboarding and cache the result', async () => {
      const mockResponse = {
        data: {
          provider: { id: 'test-id', status: 'onboarding' },
          steps: [],
          serviceTemplates: [],
        },
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);
      
      const result = await ProviderOnboardingService.initializeOnboarding('+962791234567');
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/providers/onboarding/initialize', {
        phone: '+962791234567',
        userType: 'provider',
      });
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'provider_onboarding_data',
        JSON.stringify(mockResponse.data)
      );
      
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      mockApiClient.post.mockRejectedValue(mockError);
      
      await expect(
        ProviderOnboardingService.initializeOnboarding('+962791234567')
      ).rejects.toThrow('Network error');
    });
  });

  describe('updateOnboardingStep', () => {
    it('should update step data and cache the result', async () => {
      const mockCachedState = {
        provider: { id: 'test-id' },
        steps: [
          { stepNumber: 1, isCompleted: false, data: {} },
          { stepNumber: 2, isCompleted: false, data: {} },
        ],
        serviceTemplates: [],
      };
      
      const mockResponse = {
        data: {
          step: { stepNumber: 1, isCompleted: true, data: { test: 'data' } },
          nextStep: 2,
          isLastStep: false,
          profileCompletion: 20,
        },
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCachedState));
      mockApiClient.put.mockResolvedValue(mockResponse);
      
      const result = await ProviderOnboardingService.updateOnboardingStep(
        1,
        { test: 'data' },
        true
      );
      
      expect(mockApiClient.put).toHaveBeenCalledWith('/providers/onboarding/step', {
        stepNumber: 1,
        data: { test: 'data' },
        isCompleted: true,
      });
      
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('validateStepData', () => {
    describe('Step 1 - Personal Information', () => {
      it('should validate required owner name', () => {
        const result = ProviderOnboardingService.validateStepData(1, {});
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Owner name must be at least 2 characters');
      });

      it('should validate email format', () => {
        const result = ProviderOnboardingService.validateStepData(1, {
          ownerName: 'Test Owner',
          email: 'invalid-email',
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please enter a valid email address');
      });

      it('should pass validation with valid data', () => {
        const result = ProviderOnboardingService.validateStepData(1, {
          ownerName: 'Test Owner',
          email: 'test@example.com',
          businessName: 'Test Business',
          businessNameAr: 'اختبار العمل',
          businessType: BusinessType.SALON,
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Step 3 - Location Setup', () => {
      it('should validate required address', () => {
        const result = ProviderOnboardingService.validateStepData(3, {
          latitude: 31.9515,
          longitude: 35.9239,
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please provide a detailed address');
      });

      it('should validate coordinates', () => {
        const result = ProviderOnboardingService.validateStepData(3, {
          address: 'Test Address, Amman, Jordan',
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please select location on map');
      });
    });
  });

  describe('getDefaultBusinessHours', () => {
    it('should return salon hours for salon business type', () => {
      const hours = ProviderOnboardingService.getDefaultBusinessHours(BusinessType.SALON);
      
      expect(hours[0]).toEqual({
        dayOfWeek: 0,
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '20:00',
        breakStartTime: '13:00',
        breakEndTime: '14:30',
      });
    });

    it('should return mobile hours for mobile business type', () => {
      const hours = ProviderOnboardingService.getDefaultBusinessHours(BusinessType.MOBILE);
      
      expect(hours[0]).toEqual({
        dayOfWeek: 0,
        isWorkingDay: true,
        openingTime: '10:00',
        closingTime: '18:00',
      });
    });

    it('should handle Friday differently', () => {
      const hours = ProviderOnboardingService.getDefaultBusinessHours(BusinessType.SALON);
      
      expect(hours[5]).toEqual({
        dayOfWeek: 5,
        isWorkingDay: true,
        openingTime: '14:30',
        closingTime: '20:00',
      });
    });
  });
});
```

## Integration Tests

### Navigation Flow Tests

```typescript
// src/__tests__/integration/OnboardingFlow.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import AuthNavigator from '../../navigation/AuthNavigator';
import { ProviderOnboardingService } from '../../services/ProviderOnboardingService';

jest.mock('../../services/ProviderOnboardingService');

const mockProviderOnboardingService = ProviderOnboardingService as jest.Mocked<typeof ProviderOnboardingService>;

const renderNavigation = () => {
  return render(
    <NavigationContainer>
      <PaperProvider>
        <AuthNavigator />
      </PaperProvider>
    </NavigationContainer>
  );
};

describe('Onboarding Navigation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProviderOnboardingService.getCurrentOnboardingState.mockResolvedValue(null);
    mockProviderOnboardingService.validateStepData.mockReturnValue({ isValid: true, errors: [] });
  });

  it('should navigate through complete onboarding flow', async () => {
    mockProviderOnboardingService.updatePersonalInformation.mockResolvedValue({});
    mockProviderOnboardingService.updateLocationSetup.mockResolvedValue({});
    mockProviderOnboardingService.updateServiceCategories.mockResolvedValue({});
    
    const { getByText, getByTestId } = renderNavigation();
    
    // Start with user type selection
    fireEvent.press(getByTestId('provider-type-card'));
    fireEvent.press(getByText('Continue'));
    
    // Business Information Step
    await waitFor(() => {
      expect(getByText('providerOnboarding.businessInfo.title')).toBeTruthy();
    });
    
    fireEvent.changeText(getByTestId('owner-name-input'), 'Test Owner');
    fireEvent.changeText(getByTestId('business-name-input'), 'Test Business');
    fireEvent.changeText(getByTestId('business-name-ar-input'), 'اختبار العمل');
    fireEvent.press(getByTestId('continue-button'));
    
    // Location Setup Step
    await waitFor(() => {
      expect(getByText('providerOnboarding.location.title')).toBeTruthy();
    });
    
    fireEvent.changeText(getByTestId('address-input'), 'Test Address, Amman, Jordan');
    fireEvent.press(getByTestId('continue-button'));
    
    // Continue through remaining steps...
    
    expect(mockProviderOnboardingService.updatePersonalInformation).toHaveBeenCalled();
    expect(mockProviderOnboardingService.updateLocationSetup).toHaveBeenCalled();
  });

  it('should handle navigation back functionality', async () => {
    const { getByTestId } = renderNavigation();
    
    // Navigate to business information
    fireEvent.press(getByTestId('provider-type-card'));
    fireEvent.press(getByText('Continue'));
    
    // Fill form and continue to location setup
    fireEvent.changeText(getByTestId('owner-name-input'), 'Test Owner');
    fireEvent.press(getByTestId('continue-button'));
    
    // Go back to business information
    fireEvent.press(getByTestId('back-button'));
    
    await waitFor(() => {
      expect(getByText('providerOnboarding.businessInfo.title')).toBeTruthy();
    });
  });

  it('should preserve form data when navigating back and forth', async () => {
    const mockDraftData = {
      provider: { id: 'test-id' },
      steps: [{
        stepNumber: 1,
        data: { ownerName: 'Preserved Owner' },
      }],
      serviceTemplates: [],
    };
    
    mockProviderOnboardingService.getCurrentOnboardingState.mockResolvedValue(mockDraftData);
    
    const { getByTestId } = renderNavigation();
    
    // Navigate to business information
    fireEvent.press(getByTestId('provider-type-card'));
    fireEvent.press(getByTestId('continue-button'));
    
    await waitFor(() => {
      expect(getByTestId('owner-name-input')).toHaveProp('value', 'Preserved Owner');
    });
  });
});
```

### Service Integration Tests

```typescript
// src/__tests__/integration/ServiceIntegration.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProviderOnboardingService } from '../../services/ProviderOnboardingService';
import { apiClient } from '../../services/api/client';

jest.mock('../../services/api/client');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  it('should handle complete onboarding flow with proper data persistence', async () => {
    // Mock API responses
    const initResponse = {
      data: {
        provider: { id: 'test-id', status: 'onboarding' },
        steps: Array.from({ length: 7 }, (_, i) => ({
          stepNumber: i + 1,
          isCompleted: false,
          data: {},
        })),
        serviceTemplates: [],
      },
    };
    
    mockApiClient.post.mockImplementation((url) => {
      if (url === '/providers/onboarding/initialize') {
        return Promise.resolve(initResponse);
      }
      if (url === '/providers/onboarding/complete') {
        return Promise.resolve({
          data: { provider: { ...initResponse.data.provider, status: 'active' } },
        });
      }
      return Promise.resolve({});
    });
    
    mockApiClient.put.mockResolvedValue({
      data: {
        step: { stepNumber: 1, isCompleted: true, data: {} },
        nextStep: 2,
        isLastStep: false,
        profileCompletion: 14,
      },
    });
    
    // Initialize onboarding
    const initResult = await ProviderOnboardingService.initializeOnboarding('+962791234567');
    expect(initResult.provider.status).toBe('onboarding');
    
    // Complete all steps
    for (let step = 1; step <= 7; step++) {
      await ProviderOnboardingService.updateOnboardingStep(step, { test: `step${step}` }, true);
    }
    
    // Complete onboarding
    const finalResult = await ProviderOnboardingService.completeOnboarding();
    expect(finalResult.status).toBe('active');
    
    // Verify data was cleared from AsyncStorage
    const clearedData = await AsyncStorage.getItem('provider_onboarding_data');
    expect(clearedData).toBeNull();
  });

  it('should handle network errors gracefully', async () => {
    mockApiClient.post.mockRejectedValue(new Error('Network error'));
    
    await expect(
      ProviderOnboardingService.initializeOnboarding('+962791234567')
    ).rejects.toThrow('Network error');
    
    // Verify no corrupted data was stored
    const storedData = await AsyncStorage.getItem('provider_onboarding_data');
    expect(storedData).toBeNull();
  });

  it('should handle partial completion and recovery', async () => {
    // Simulate partial completion
    const partialState = {
      provider: { id: 'test-id' },
      steps: [
        { stepNumber: 1, isCompleted: true, data: { ownerName: 'Test' } },
        { stepNumber: 2, isCompleted: false, data: {} },
      ],
    };
    
    await AsyncStorage.setItem('provider_onboarding_data', JSON.stringify(partialState));
    
    const recoveredState = await ProviderOnboardingService.getCurrentOnboardingState();
    expect(recoveredState?.steps[0].isCompleted).toBe(true);
    expect(recoveredState?.steps[0].data.ownerName).toBe('Test');
  });
});
```

## End-to-End Tests

### Detox Configuration

```javascript
// .detoxrc.js
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  configurations: {
    ios: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
      },
    },
    android: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30',
      },
    },
  },
  apps: {
    ios: {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/BeautyCort.app',
    },
    android: {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
    },
  },
};
```

### E2E Test Scenarios

```typescript
// e2e/onboarding.e2e.js
describe('Provider Onboarding E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete full provider onboarding flow', async () => {
    // Start from welcome screen
    await expect(element(by.id('welcome-screen'))).toBeVisible();
    await element(by.id('get-started-button')).tap();
    
    // Phone authentication
    await expect(element(by.id('phone-auth-screen'))).toBeVisible();
    await element(by.id('phone-input')).typeText('791234567');
    await element(by.id('send-otp-button')).tap();
    
    // OTP verification (mock)
    await expect(element(by.id('otp-screen'))).toBeVisible();
    await element(by.id('otp-input')).typeText('123456');
    await element(by.id('verify-button')).tap();
    
    // User type selection
    await expect(element(by.id('user-type-screen'))).toBeVisible();
    await element(by.id('provider-type-card')).tap();
    await element(by.id('continue-button')).tap();
    
    // Business Information
    await expect(element(by.id('business-info-screen'))).toBeVisible();
    await element(by.id('owner-name-input')).typeText('Fatima Al-Zahra');
    await element(by.id('business-name-input')).typeText('Elegant Beauty Salon');
    await element(by.id('business-name-ar-input')).typeText('صالون الأناقة للجمال');
    await element(by.id('business-type-salon')).tap();
    await element(by.id('continue-button')).tap();
    
    // Location Setup
    await expect(element(by.id('location-screen'))).toBeVisible();
    await element(by.id('address-input')).typeText('Abdoun, Amman, Jordan');
    await element(by.id('map-view')).tap({ x: 200, y: 200 }); // Tap on map
    await element(by.id('continue-button')).tap();
    
    // Service Categories
    await expect(element(by.id('categories-screen'))).toBeVisible();
    await element(by.id('category-hair-care')).tap();
    await element(by.id('category-nail-care')).tap();
    await element(by.id('continue-button')).tap();
    
    // Working Hours
    await expect(element(by.id('working-hours-screen'))).toBeVisible();
    await element(by.id('preset-salon-standard')).tap();
    await element(by.id('continue-button')).tap();
    
    // License Verification
    await expect(element(by.id('license-screen'))).toBeVisible();
    await element(by.id('has-license-yes')).tap();
    await element(by.id('license-type-beauty')).tap();
    await element(by.id('license-number-input')).typeText('BL123456');
    await element(by.id('continue-button')).tap();
    
    // Tutorial
    await expect(element(by.id('tutorial-screen'))).toBeVisible();
    await element(by.id('continue-button')).tap();
    
    // Completion
    await expect(element(by.id('completion-screen'))).toBeVisible();
    await expect(element(by.text('مبروك!'))).toBeVisible();
    await element(by.id('start-journey-button')).tap();
    
    // Should navigate to main app
    await expect(element(by.id('main-screen'))).toBeVisible();
  });

  it('should handle form validation errors', async () => {
    // Navigate to business information
    // ... navigation steps ...
    
    // Try to continue without filling required fields
    await element(by.id('continue-button')).tap();
    
    // Should show validation errors
    await expect(element(by.text('providerOnboarding.validation.ownerNameRequired'))).toBeVisible();
    await expect(element(by.text('providerOnboarding.validation.businessNameRequired'))).toBeVisible();
  });

  it('should preserve data when app is backgrounded', async () => {
    // Navigate to business information and fill some data
    // ... navigation and data entry ...
    
    // Background the app
    await device.sendToHome();
    await device.launchApp({ newInstance: false });
    
    // Should preserve entered data
    await expect(element(by.id('owner-name-input'))).toHaveText('Fatima Al-Zahra');
  });

  it('should support RTL layout in Arabic mode', async () => {
    // Set device to Arabic
    await device.setLanguage('ar');
    await device.reloadReactNative();
    
    // Navigate to onboarding
    // ... navigation steps ...
    
    // Check RTL layout
    await expect(element(by.id('business-name-ar-input'))).toBeVisible();
    // Arabic input should be right-aligned
  });
});
```

## Visual Testing

### Screenshot Testing

```typescript
// src/__tests__/visual/Onboarding.visual.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import BusinessInformationScreen from '../../screens/auth/onboarding/BusinessInformationScreen';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((options) => options.ios),
}));

describe('Visual Tests', () => {
  it('should match BusinessInformationScreen snapshot', () => {
    const { toJSON } = render(
      <PaperProvider>
        <BusinessInformationScreen 
          navigation={global.mockNavigation as any}
          route={global.mockRoute as any}
        />
      </PaperProvider>
    );
    
    expect(toJSON()).toMatchSnapshot();
  });

  it('should match BusinessInformationScreen snapshot in RTL mode', () => {
    jest.doMock('../../i18n', () => ({
      t: (key: string) => key,
      isRTL: () => true,
    }));
    
    const { toJSON } = render(
      <PaperProvider>
        <BusinessInformationScreen 
          navigation={global.mockNavigation as any}
          route={global.mockRoute as any}
        />
      </PaperProvider>
    );
    
    expect(toJSON()).toMatchSnapshot('BusinessInformationScreen-RTL');
  });
});
```

## Performance Testing

### Load Time Testing

```typescript
// src/__tests__/performance/LoadTime.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import BusinessInformationScreen from '../../screens/auth/onboarding/BusinessInformationScreen';

describe('Performance Tests', () => {
  it('should render BusinessInformationScreen within acceptable time', async () => {
    const startTime = Date.now();
    
    render(
      <PaperProvider>
        <BusinessInformationScreen 
          navigation={global.mockNavigation as any}
          route={global.mockRoute as any}
        />
      </PaperProvider>
    );
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Screen should render within 1 second
    expect(renderTime).toBeLessThan(1000);
  });

  it('should handle large form data efficiently', async () => {
    const largeMockData = {
      provider: { id: 'test-id' },
      steps: Array.from({ length: 7 }, (_, i) => ({
        stepNumber: i + 1,
        data: Object.fromEntries(
          Array.from({ length: 100 }, (_, j) => [`field${j}`, `value${j}`])
        ),
      })),
      serviceTemplates: Array.from({ length: 100 }, (_, i) => ({
        id: `template-${i}`,
        name: `Template ${i}`,
      })),
    };
    
    jest.doMock('../../services/ProviderOnboardingService', () => ({
      ProviderOnboardingService: {
        getCurrentOnboardingState: jest.fn().mockResolvedValue(largeMockData),
      },
    }));
    
    const startTime = Date.now();
    
    render(
      <PaperProvider>
        <BusinessInformationScreen 
          navigation={global.mockNavigation as any}
          route={global.mockRoute as any}
        />
      </PaperProvider>
    );
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Should still render efficiently with large data
    expect(renderTime).toBeLessThan(2000);
  });
});
```

## Accessibility Testing

### Screen Reader Testing

```typescript
// src/__tests__/accessibility/Accessibility.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import BusinessInformationScreen from '../../screens/auth/onboarding/BusinessInformationScreen';

describe('Accessibility Tests', () => {
  it('should have proper accessibility labels', () => {
    const { getByTestId } = render(
      <PaperProvider>
        <BusinessInformationScreen 
          navigation={global.mockNavigation as any}
          route={global.mockRoute as any}
        />
      </PaperProvider>
    );
    
    expect(getByTestId('owner-name-input')).toHaveProp('accessibilityLabel', 'Owner name input field');
    expect(getByTestId('continue-button')).toHaveProp('accessibilityLabel', 'Continue to next step');
  });

  it('should support keyboard navigation', () => {
    const { getByTestId } = render(
      <PaperProvider>
        <BusinessInformationScreen 
          navigation={global.mockNavigation as any}
          route={global.mockRoute as any}
        />
      </PaperProvider>
    );
    
    // All interactive elements should be focusable
    expect(getByTestId('owner-name-input')).toHaveProp('accessible', true);
    expect(getByTestId('continue-button')).toHaveProp('accessible', true);
  });

  it('should announce errors to screen readers', async () => {
    const { getByTestId, getByText } = render(
      <PaperProvider>
        <BusinessInformationScreen 
          navigation={global.mockNavigation as any}
          route={global.mockRoute as any}
        />
      </PaperProvider>
    );
    
    // Trigger validation error
    fireEvent.press(getByTestId('continue-button'));
    
    const errorElement = getByText('providerOnboarding.validation.ownerNameRequired');
    expect(errorElement).toHaveProp('accessibilityLiveRegion', 'polite');
  });
});
```

## Test Automation

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install iOS dependencies
        run: cd ios && pod install
      
      - name: Build for testing
        run: npm run build:e2e:ios
      
      - name: Run E2E tests
        run: npm run test:e2e:ios
```

### Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=__tests__/.*\\.test\\.(ts|tsx)$",
    "test:integration": "jest --testPathPattern=__tests__/integration/",
    "test:e2e": "detox test",
    "test:e2e:ios": "detox test --configuration ios",
    "test:e2e:android": "detox test --configuration android",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:visual": "jest --testPathPattern=visual",
    "test:accessibility": "jest --testPathPattern=accessibility",
    "build:e2e:ios": "detox build --configuration ios",
    "build:e2e:android": "detox build --configuration android"
  }
}
```

## Quality Assurance Checklist

### Pre-Release Testing

- [ ] **Unit Tests**: All unit tests passing with >80% coverage
- [ ] **Integration Tests**: Component and service integration verified
- [ ] **E2E Tests**: Complete user journeys tested on real devices
- [ ] **Visual Tests**: UI consistency verified across screen sizes
- [ ] **Performance Tests**: Load times within acceptable limits
- [ ] **Accessibility Tests**: Screen reader and keyboard navigation working
- [ ] **RTL Testing**: Arabic layout and text rendering correct
- [ ] **Error Handling**: All error scenarios properly handled
- [ ] **Offline Support**: Draft saving and recovery working
- [ ] **Device Testing**: Multiple devices and OS versions tested

### Manual Testing Scenarios

1. **Happy Path**: Complete onboarding flow without errors
2. **Validation Errors**: Test all form validation scenarios
3. **Network Issues**: Offline/online transitions and error recovery
4. **Interruption**: App backgrounding and data persistence
5. **Navigation**: Back button and deep linking scenarios
6. **Permissions**: Camera, location, and storage permissions
7. **Data Recovery**: Loading existing draft data
8. **Language Switching**: Arabic/English mode switching
9. **Device Rotation**: Portrait/landscape layout handling
10. **Memory Pressure**: App behavior under low memory conditions

---

**Last Updated**: July 2025  
**Version**: 1.0.0  
**Test Coverage Target**: 85%  
**Maintainer**: BeautyCort QA Team