/**
 * Automated bilingual testing for authentication flows
 * Tests critical user authentication journeys in both Arabic and English
 */

import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { I18nProvider } from '../src/contexts/I18nContext';
import LoginScreen from '../src/screens/auth/LoginScreen';
import RegisterScreen from '../src/screens/auth/RegisterScreen';
import OTPScreen from '../src/screens/auth/OTPScreen';
import i18n from '../src/i18n';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  replace: jest.fn(),
};

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Test wrapper with i18n context
const TestWrapper = ({ children, locale = 'ar' }) => (
  <I18nProvider initialLocale={locale}>
    {children}
  </I18nProvider>
);

describe('Authentication Flow - Bilingual Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Login Screen', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic' },
      { locale: 'en', language: 'English' }
    ];

    testCases.forEach(({ locale, language }) => {
      describe(`${language} Language`, () => {
        beforeEach(() => {
          i18n.locale = locale;
        });

        test('renders login form with correct translations', async () => {
          render(
            <TestWrapper locale={locale}>
              <LoginScreen navigation={mockNavigation} />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check title translation
            const expectedTitle = locale === 'ar' ? 'تسجيل الدخول' : 'Login';
            expect(screen.getByText(expectedTitle)).toBeTruthy();

            // Check phone input placeholder
            const expectedPhonePlaceholder = locale === 'ar' ? 'رقم الهاتف' : 'Phone Number';
            expect(screen.getByPlaceholderText(expectedPhonePlaceholder)).toBeTruthy();

            // Check login button text
            const expectedButtonText = locale === 'ar' ? 'تسجيل الدخول' : 'Login';
            expect(screen.getByText(expectedButtonText)).toBeTruthy();
          });
        });

        test('validates phone number with locale-specific format', async () => {
          render(
            <TestWrapper locale={locale}>
              <LoginScreen navigation={mockNavigation} />
            </TestWrapper>
          );

          const phoneInput = screen.getByPlaceholderText(
            locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'
          );

          // Test invalid phone number
          fireEvent.changeText(phoneInput, '123456');
          fireEvent.press(screen.getByText(locale === 'ar' ? 'تسجيل الدخول' : 'Login'));

          await waitFor(() => {
            const expectedError = locale === 'ar' 
              ? 'يجب إدخال رقم هاتف صحيح' 
              : 'Please enter a valid phone number';
            expect(screen.getByText(expectedError)).toBeTruthy();
          });
        });

        test('handles Arabic numerals in phone input', async () => {
          if (locale === 'ar') {
            render(
              <TestWrapper locale={locale}>
                <LoginScreen navigation={mockNavigation} />
              </TestWrapper>
            );

            const phoneInput = screen.getByPlaceholderText('رقم الهاتف');
            
            // Enter Arabic numerals
            fireEvent.changeText(phoneInput, '٠٧٩١٢٣٤٥٦٧');
            
            // Should convert to Western numerals internally
            expect(phoneInput.props.value).toBe('0791234567');
          }
        });

        test('displays error messages in correct language', async () => {
          render(
            <TestWrapper locale={locale}>
              <LoginScreen navigation={mockNavigation} />
            </TestWrapper>
          );

          // Simulate network error
          const loginButton = screen.getByText(locale === 'ar' ? 'تسجيل الدخول' : 'Login');
          fireEvent.press(loginButton);

          await waitFor(() => {
            const expectedError = locale === 'ar' 
              ? 'حدث خطأ في الاتصال' 
              : 'Connection error occurred';
            expect(screen.getByText(expectedError)).toBeTruthy();
          });
        });

        test('navigates to register screen with correct text', async () => {
          render(
            <TestWrapper locale={locale}>
              <LoginScreen navigation={mockNavigation} />
            </TestWrapper>
          );

          const registerLink = screen.getByText(
            locale === 'ar' ? 'ليس لديك حساب؟ سجل الآن' : "Don't have an account? Register"
          );
          fireEvent.press(registerLink);

          expect(mockNavigate).toHaveBeenCalledWith('Register');
        });
      });
    });
  });

  describe('Registration Screen', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic' },
      { locale: 'en', language: 'English' }
    ];

    testCases.forEach(({ locale, language }) => {
      describe(`${language} Language`, () => {
        beforeEach(() => {
          i18n.locale = locale;
        });

        test('renders registration form with correct translations', async () => {
          render(
            <TestWrapper locale={locale}>
              <RegisterScreen navigation={mockNavigation} />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check title
            const expectedTitle = locale === 'ar' ? 'إنشاء حساب جديد' : 'Create Account';
            expect(screen.getByText(expectedTitle)).toBeTruthy();

            // Check name input
            const expectedNamePlaceholder = locale === 'ar' ? 'الاسم الكامل' : 'Full Name';
            expect(screen.getByPlaceholderText(expectedNamePlaceholder)).toBeTruthy();

            // Check register button
            const expectedButtonText = locale === 'ar' ? 'إنشاء حساب' : 'Create Account';
            expect(screen.getByText(expectedButtonText)).toBeTruthy();
          });
        });

        test('validates Arabic name input', async () => {
          if (locale === 'ar') {
            render(
              <TestWrapper locale={locale}>
                <RegisterScreen navigation={mockNavigation} />
              </TestWrapper>
            );

            const nameInput = screen.getByPlaceholderText('الاسم الكامل');
            
            // Test English name in Arabic mode
            fireEvent.changeText(nameInput, 'John Doe');
            fireEvent.press(screen.getByText('إنشاء حساب'));

            await waitFor(() => {
              expect(screen.getByText('يجب إدخال الاسم باللغة العربية')).toBeTruthy();
            });

            // Test valid Arabic name
            fireEvent.changeText(nameInput, 'محمد أحمد');
            fireEvent.press(screen.getByText('إنشاء حساب'));

            await waitFor(() => {
              expect(screen.queryByText('يجب إدخال الاسم باللغة العربية')).toBeNull();
            });
          }
        });

        test('validates English name input', async () => {
          if (locale === 'en') {
            render(
              <TestWrapper locale={locale}>
                <RegisterScreen navigation={mockNavigation} />
              </TestWrapper>
            );

            const nameInput = screen.getByPlaceholderText('Full Name');
            
            // Test Arabic name in English mode
            fireEvent.changeText(nameInput, 'محمد أحمد');
            fireEvent.press(screen.getByText('Create Account'));

            await waitFor(() => {
              expect(screen.getByText('Please enter name in English')).toBeTruthy();
            });

            // Test valid English name
            fireEvent.changeText(nameInput, 'John Doe');
            fireEvent.press(screen.getByText('Create Account'));

            await waitFor(() => {
              expect(screen.queryByText('Please enter name in English')).toBeNull();
            });
          }
        });

        test('handles form submission with correct validation messages', async () => {
          render(
            <TestWrapper locale={locale}>
              <RegisterScreen navigation={mockNavigation} />
            </TestWrapper>
          );

          const submitButton = screen.getByText(locale === 'ar' ? 'إنشاء حساب' : 'Create Account');
          fireEvent.press(submitButton);

          await waitFor(() => {
            // Check required field messages
            const expectedRequiredMessage = locale === 'ar' ? 'هذا الحقل مطلوب' : 'This field is required';
            expect(screen.getAllByText(expectedRequiredMessage).length).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe('OTP Verification Screen', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic' },
      { locale: 'en', language: 'English' }
    ];

    testCases.forEach(({ locale, language }) => {
      describe(`${language} Language`, () => {
        beforeEach(() => {
          i18n.locale = locale;
        });

        test('renders OTP screen with correct translations', async () => {
          const route = {
            params: { phone: '0791234567' }
          };

          render(
            <TestWrapper locale={locale}>
              <OTPScreen navigation={mockNavigation} route={route} />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check title
            const expectedTitle = locale === 'ar' ? 'تحقق من رقم الهاتف' : 'Verify Phone Number';
            expect(screen.getByText(expectedTitle)).toBeTruthy();

            // Check instruction text
            const expectedInstruction = locale === 'ar' 
              ? 'أدخل رمز التحقق المرسل إلى' 
              : 'Enter the verification code sent to';
            expect(screen.getByText(expectedInstruction)).toBeTruthy();
          });
        });

        test('displays phone number in correct format', async () => {
          const route = {
            params: { phone: '0791234567' }
          };

          render(
            <TestWrapper locale={locale}>
              <OTPScreen navigation={mockNavigation} route={route} />
            </TestWrapper>
          );

          await waitFor(() => {
            if (locale === 'ar') {
              // Should display Arabic numerals
              expect(screen.getByText('٠٧٩١٢٣٤٥٦٧')).toBeTruthy();
            } else {
              // Should display Western numerals
              expect(screen.getByText('0791234567')).toBeTruthy();
            }
          });
        });

        test('handles OTP input with correct numeral format', async () => {
          const route = {
            params: { phone: '0791234567' }
          };

          render(
            <TestWrapper locale={locale}>
              <OTPScreen navigation={mockNavigation} route={route} />
            </TestWrapper>
          );

          const otpInputs = screen.getAllByPlaceholderText('0');
          
          if (locale === 'ar') {
            // Test Arabic numeral input
            fireEvent.changeText(otpInputs[0], '١');
            fireEvent.changeText(otpInputs[1], '٢');
            fireEvent.changeText(otpInputs[2], '٣');
            fireEvent.changeText(otpInputs[3], '٤');
            fireEvent.changeText(otpInputs[4], '٥');
            fireEvent.changeText(otpInputs[5], '٦');
            
            // Should convert to Western numerals for processing
            expect(otpInputs[0].props.value).toBe('1');
            expect(otpInputs[1].props.value).toBe('2');
          }
        });

        test('shows resend code option with correct text', async () => {
          const route = {
            params: { phone: '0791234567' }
          };

          render(
            <TestWrapper locale={locale}>
              <OTPScreen navigation={mockNavigation} route={route} />
            </TestWrapper>
          );

          await waitFor(() => {
            const expectedResendText = locale === 'ar' 
              ? 'إعادة إرسال الرمز' 
              : 'Resend Code';
            expect(screen.getByText(expectedResendText)).toBeTruthy();
          });
        });
      });
    });
  });

  describe('Cross-Language Consistency', () => {
    test('maintains consistent navigation flow across languages', async () => {
      const testFlow = async (locale) => {
        i18n.locale = locale;
        
        // Test login -> register navigation
        const { rerender } = render(
          <TestWrapper locale={locale}>
            <LoginScreen navigation={mockNavigation} />
          </TestWrapper>
        );

        const registerLink = screen.getByText(
          locale === 'ar' ? 'ليس لديك حساب؟ سجل الآن' : "Don't have an account? Register"
        );
        fireEvent.press(registerLink);
        
        expect(mockNavigate).toHaveBeenCalledWith('Register');
        
        // Test register -> login navigation
        rerender(
          <TestWrapper locale={locale}>
            <RegisterScreen navigation={mockNavigation} />
          </TestWrapper>
        );

        const loginLink = screen.getByText(
          locale === 'ar' ? 'لديك حساب؟ سجل الدخول' : 'Have an account? Login'
        );
        fireEvent.press(loginLink);
        
        expect(mockNavigate).toHaveBeenCalledWith('Login');
      };

      await testFlow('ar');
      mockNavigate.mockClear();
      await testFlow('en');
    });

    test('maintains consistent error handling across languages', async () => {
      const testErrorHandling = async (locale) => {
        i18n.locale = locale;
        
        render(
          <TestWrapper locale={locale}>
            <LoginScreen navigation={mockNavigation} />
          </TestWrapper>
        );

        // Test validation error
        const phoneInput = screen.getByPlaceholderText(
          locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'
        );
        fireEvent.changeText(phoneInput, 'invalid');
        fireEvent.press(screen.getByText(locale === 'ar' ? 'تسجيل الدخول' : 'Login'));

        await waitFor(() => {
          const errorMessage = screen.getByText(
            locale === 'ar' ? 'يجب إدخال رقم هاتف صحيح' : 'Please enter a valid phone number'
          );
          expect(errorMessage).toBeTruthy();
        });
      };

      await testErrorHandling('ar');
      await testErrorHandling('en');
    });
  });

  describe('Performance Tests', () => {
    test('language switching performance', async () => {
      const { rerender } = render(
        <TestWrapper locale="ar">
          <LoginScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const startTime = Date.now();
      
      rerender(
        <TestWrapper locale="en">
          <LoginScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const endTime = Date.now();
      const switchTime = endTime - startTime;
      
      // Language switch should be fast (< 100ms)
      expect(switchTime).toBeLessThan(100);
    });
  });
});