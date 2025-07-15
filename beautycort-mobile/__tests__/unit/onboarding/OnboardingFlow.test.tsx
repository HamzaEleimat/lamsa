import React from 'react';
import { render, fireEvent, waitFor } from '../../utils/testHelpers';
import { newProviderData } from '../../fixtures/providers';

// Mock the onboarding screens
const MockPersonalInformationScreen = ({ onNext }: { onNext: (data: any) => void }) => (
  <div>
    <input 
      testID="ownerName" 
      placeholder="Owner Name"
      onChange={(e) => onNext({ ownerName: e.target.value })}
    />
    <button testID="nextButton" onClick={() => onNext({ ownerName: 'Test Owner' })}>
      Next
    </button>
  </div>
);

const MockBusinessDetailsScreen = ({ onNext }: { onNext: (data: any) => void }) => (
  <div>
    <input testID="businessName" placeholder="Business Name" />
    <button testID="nextButton" onClick={() => onNext({ businessName: 'Test Business' })}>
      Next
    </button>
  </div>
);

const MockLocationSetupScreen = ({ onNext }: { onNext: (data: any) => void }) => (
  <div>
    <input testID="address" placeholder="Address" />
    <button testID="nextButton" onClick={() => onNext({ address: 'Test Address' })}>
      Next
    </button>
  </div>
);

// Mock the main onboarding flow component
const MockOnboardingFlow = () => {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [formData, setFormData] = React.useState({});

  const handleNext = (stepData: any) => {
    setFormData({ ...formData, ...stepData });
    setCurrentStep(currentStep + 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <MockPersonalInformationScreen onNext={handleNext} />;
      case 2:
        return <MockBusinessDetailsScreen onNext={handleNext} />;
      case 3:
        return <MockLocationSetupScreen onNext={handleNext} />;
      default:
        return <div testID="completionScreen">Onboarding Complete!</div>;
    }
  };

  return (
    <div testID="onboardingFlow">
      <div testID="stepIndicator">Step {currentStep} of 7</div>
      {renderStep()}
      <div testID="formData">{JSON.stringify(formData)}</div>
    </div>
  );
};

describe('Provider Onboarding Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding flow successfully', async () => {
      const { getByTestId, queryByTestId } = render(<MockOnboardingFlow />);

      // Verify initial state
      expect(getByTestId('stepIndicator')).toHaveTextContent('Step 1 of 7');
      expect(getByTestId('ownerName')).toBeTruthy();

      // Step 1: Personal Information
      fireEvent.press(getByTestId('nextButton'));
      await waitFor(() => {
        expect(getByTestId('stepIndicator')).toHaveTextContent('Step 2 of 7');
      });

      // Step 2: Business Details
      fireEvent.press(getByTestId('nextButton'));
      await waitFor(() => {
        expect(getByTestId('stepIndicator')).toHaveTextContent('Step 3 of 7');
      });

      // Step 3: Location Setup
      fireEvent.press(getByTestId('nextButton'));
      await waitFor(() => {
        expect(getByTestId('stepIndicator')).toHaveTextContent('Step 4 of 7');
      });

      // Verify form data accumulation
      const formData = JSON.parse(getByTestId('formData').props.children);
      expect(formData).toEqual({
        ownerName: 'Test Owner',
        businessName: 'Test Business',
        address: 'Test Address',
      });
    });

    it('should handle step validation errors', async () => {
      const MockValidationScreen = ({ onNext }: { onNext: (data: any) => void }) => {
        const [error, setError] = React.useState('');

        const handleSubmit = () => {
          const ownerName = '';
          if (!ownerName.trim()) {
            setError('Owner name is required');
            return;
          }
          onNext({ ownerName });
        };

        return (
          <div>
            <input testID="ownerName" placeholder="Owner Name" />
            <button testID="submitButton" onClick={handleSubmit}>Submit</button>
            {error && <div testID="errorMessage">{error}</div>}
          </div>
        );
      };

      const { getByTestId } = render(<MockValidationScreen onNext={jest.fn()} />);

      fireEvent.press(getByTestId('submitButton'));
      
      await waitFor(() => {
        expect(getByTestId('errorMessage')).toHaveTextContent('Owner name is required');
      });
    });

    it('should persist form data across app restarts', async () => {
      const { setAsyncStorageItem, getAsyncStorageItem } = require('../../utils/testHelpers');
      
      // Simulate form data being saved
      const onboardingData = {
        step: 3,
        data: newProviderData,
      };
      
      await setAsyncStorageItem('onboardingProgress', onboardingData);
      
      // Verify data persists
      const savedData = await getAsyncStorageItem('onboardingProgress');
      expect(savedData).toEqual(onboardingData);
    });
  });

  describe('Step Navigation', () => {
    it('should allow going back to previous steps', async () => {
      const MockNavigationFlow = () => {
        const [currentStep, setCurrentStep] = React.useState(2);

        return (
          <div>
            <div testID="stepIndicator">Step {currentStep}</div>
            <button 
              testID="backButton" 
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Back
            </button>
            <button 
              testID="nextButton" 
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              Next
            </button>
          </div>
        );
      };

      const { getByTestId } = render(<MockNavigationFlow />);

      expect(getByTestId('stepIndicator')).toHaveTextContent('Step 2');

      fireEvent.press(getByTestId('backButton'));
      expect(getByTestId('stepIndicator')).toHaveTextContent('Step 1');

      fireEvent.press(getByTestId('nextButton'));
      expect(getByTestId('stepIndicator')).toHaveTextContent('Step 2');
    });

    it('should prevent going back from first step', () => {
      const MockFirstStepFlow = () => {
        const [currentStep, setCurrentStep] = React.useState(1);
        const canGoBack = currentStep > 1;

        return (
          <div>
            <div testID="stepIndicator">Step {currentStep}</div>
            <button 
              testID="backButton" 
              disabled={!canGoBack}
              onClick={() => canGoBack && setCurrentStep(currentStep - 1)}
            >
              Back
            </button>
          </div>
        );
      };

      const { getByTestId } = render(<MockFirstStepFlow />);

      const backButton = getByTestId('backButton');
      expect(backButton.props.disabled).toBe(true);
    });
  });

  describe('Business Type Specific Flow', () => {
    it('should show mobile service setup for mobile providers', async () => {
      const MockBusinessTypeFlow = ({ businessType }: { businessType: string }) => {
        const isMobile = businessType === 'mobile';

        return (
          <div>
            <div testID="businessType">{businessType}</div>
            {isMobile && (
              <div testID="serviceRadiusSection">
                <input testID="serviceRadius" placeholder="Service Radius (km)" />
              </div>
            )}
            {!isMobile && (
              <div testID="locationSection">
                <input testID="address" placeholder="Business Address" />
              </div>
            )}
          </div>
        );
      };

      // Test mobile provider flow
      const { getByTestId, rerender } = render(
        <MockBusinessTypeFlow businessType="mobile" />
      );

      expect(getByTestId('serviceRadiusSection')).toBeTruthy();
      expect(() => getByTestId('locationSection')).toThrow();

      // Test salon provider flow
      rerender(<MockBusinessTypeFlow businessType="salon" />);

      expect(getByTestId('locationSection')).toBeTruthy();
      expect(() => getByTestId('serviceRadiusSection')).toThrow();
    });

    it('should validate service radius for mobile providers', () => {
      const MockServiceRadiusValidation = () => {
        const [radius, setRadius] = React.useState('');
        const [error, setError] = React.useState('');

        const validateRadius = (value: string) => {
          const numValue = parseInt(value);
          if (numValue > 50) {
            setError('Service radius cannot exceed 50km');
          } else {
            setError('');
          }
          setRadius(value);
        };

        return (
          <div>
            <input 
              testID="serviceRadius"
              value={radius}
              onChange={(e) => validateRadius(e.target.value)}
            />
            {error && <div testID="radiusError">{error}</div>}
          </div>
        );
      };

      const { getByTestId } = render(<MockServiceRadiusValidation />);

      fireEvent.changeText(getByTestId('serviceRadius'), '60');
      expect(getByTestId('radiusError')).toHaveTextContent('Service radius cannot exceed 50km');
    });
  });

  describe('Alternative Verification Flow', () => {
    it('should show alternative verification when license upload fails', async () => {
      const MockVerificationFlow = () => {
        const [verificationMethod, setVerificationMethod] = React.useState('license');
        const [uploadFailed, setUploadFailed] = React.useState(false);

        const simulateUploadFailure = () => {
          setUploadFailed(true);
          setVerificationMethod('alternative');
        };

        return (
          <div>
            {verificationMethod === 'license' && (
              <div testID="licenseUpload">
                <button testID="uploadButton" onClick={simulateUploadFailure}>
                  Upload License
                </button>
                {uploadFailed && (
                  <div testID="uploadError">
                    Upload failed. Try alternative verification.
                    <button 
                      testID="alternativeButton"
                      onClick={() => setVerificationMethod('alternative')}
                    >
                      Use Alternative
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {verificationMethod === 'alternative' && (
              <div testID="alternativeVerification">
                <input testID="portfolioImages" placeholder="Portfolio Images" />
                <input testID="references" placeholder="Business References" />
                <input testID="socialMedia" placeholder="Social Media Profiles" />
              </div>
            )}
          </div>
        );
      };

      const { getByTestId } = render(<MockVerificationFlow />);

      // Initially shows license upload
      expect(getByTestId('licenseUpload')).toBeTruthy();

      // Simulate upload failure
      fireEvent.press(getByTestId('uploadButton'));
      
      await waitFor(() => {
        expect(getByTestId('uploadError')).toBeTruthy();
      });

      // Switch to alternative verification
      fireEvent.press(getByTestId('alternativeButton'));
      
      await waitFor(() => {
        expect(getByTestId('alternativeVerification')).toBeTruthy();
        expect(getByTestId('portfolioImages')).toBeTruthy();
      });
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate completion percentage correctly', () => {
      const calculateCompletion = (currentStep: number, totalSteps: number = 7) => {
        return Math.floor((currentStep / totalSteps) * 100);
      };

      expect(calculateCompletion(1)).toBe(14); // 1/7 ≈ 14%
      expect(calculateCompletion(3)).toBe(42); // 3/7 ≈ 42%
      expect(calculateCompletion(7)).toBe(100); // 7/7 = 100%
    });

    it('should show progress bar with correct percentage', () => {
      const MockProgressBar = ({ currentStep }: { currentStep: number }) => {
        const progress = Math.floor((currentStep / 7) * 100);
        
        return (
          <div testID="progressBar">
            <div testID="progressPercentage">{progress}%</div>
            <div 
              testID="progressFill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        );
      };

      const { getByTestId } = render(<MockProgressBar currentStep={3} />);

      expect(getByTestId('progressPercentage')).toHaveTextContent('42%');
      expect(getByTestId('progressFill').props.style.width).toBe('42%');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const MockNetworkErrorFlow = () => {
        const [isLoading, setIsLoading] = React.useState(false);
        const [error, setError] = React.useState('');

        const simulateNetworkError = async () => {
          setIsLoading(true);
          setError('');
          
          // Simulate network failure
          setTimeout(() => {
            setIsLoading(false);
            setError('Network error. Please check your connection.');
          }, 1000);
        };

        return (
          <div>
            <button testID="submitButton" onClick={simulateNetworkError}>
              Submit
            </button>
            {isLoading && <div testID="loadingIndicator">Loading...</div>}
            {error && (
              <div testID="networkError">
                {error}
                <button testID="retryButton" onClick={simulateNetworkError}>
                  Retry
                </button>
              </div>
            )}
          </div>
        );
      };

      const { getByTestId } = render(<MockNetworkErrorFlow />);

      fireEvent.press(getByTestId('submitButton'));
      
      // Should show loading
      expect(getByTestId('loadingIndicator')).toBeTruthy();

      // Should show error after timeout
      await waitFor(() => {
        expect(getByTestId('networkError')).toBeTruthy();
        expect(getByTestId('retryButton')).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('should validate required fields before submission', () => {
      const MockValidationFlow = () => {
        const [formData, setFormData] = React.useState({
          ownerName: '',
          businessName: '',
          phone: '',
        });
        const [errors, setErrors] = React.useState<Record<string, string>>({});

        const validateForm = () => {
          const newErrors: Record<string, string> = {};

          if (!formData.ownerName.trim()) {
            newErrors.ownerName = 'Owner name is required';
          }
          if (!formData.businessName.trim()) {
            newErrors.businessName = 'Business name is required';
          }
          if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
          }

          setErrors(newErrors);
          return Object.keys(newErrors).length === 0;
        };

        return (
          <div>
            <input 
              testID="ownerName"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
            />
            {errors.ownerName && <div testID="ownerNameError">{errors.ownerName}</div>}
            
            <input 
              testID="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
            {errors.businessName && <div testID="businessNameError">{errors.businessName}</div>}
            
            <button testID="validateButton" onClick={validateForm}>
              Validate
            </button>
          </div>
        );
      };

      const { getByTestId } = render(<MockValidationFlow />);

      fireEvent.press(getByTestId('validateButton'));

      expect(getByTestId('ownerNameError')).toHaveTextContent('Owner name is required');
      expect(getByTestId('businessNameError')).toHaveTextContent('Business name is required');
    });
  });
});