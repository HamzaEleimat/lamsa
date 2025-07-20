/**
 * Automated bilingual testing for booking flows
 * Tests critical booking user journeys in both Arabic and English
 */

import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { I18nProvider } from '../src/contexts/I18nContext';
import ServiceListScreen from '../src/screens/booking/ServiceListScreen';
import BookingScreen from '../src/screens/booking/BookingScreen';
import BookingConfirmationScreen from '../src/screens/booking/BookingConfirmationScreen';
import PaymentScreen from '../src/screens/payment/PaymentScreen';
import i18n from '../src/i18n';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  replace: jest.fn(),
};

// Mock data
const mockServices = [
  {
    id: 1,
    name_ar: 'قص الشعر',
    name_en: 'Haircut',
    description_ar: 'قص وتصفيف الشعر',
    description_en: 'Hair cutting and styling',
    price: 25.0,
    duration: 60,
    provider: {
      name_ar: 'صالون الجمال',
      name_en: 'Beauty Salon',
      rating: 4.5
    }
  },
  {
    id: 2,
    name_ar: 'تنظيف البشرة',
    name_en: 'Facial Treatment',
    description_ar: 'تنظيف وترطيب البشرة',
    description_en: 'Skin cleansing and moisturizing',
    price: 35.0,
    duration: 90,
    provider: {
      name_ar: 'مركز العناية',
      name_en: 'Care Center',
      rating: 4.8
    }
  }
];

// Test wrapper
const TestWrapper = ({ children, locale = 'ar' }) => (
  <I18nProvider initialLocale={locale}>
    {children}
  </I18nProvider>
);

describe('Booking Flow - Bilingual Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service List Screen', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic' },
      { locale: 'en', language: 'English' }
    ];

    testCases.forEach(({ locale, language }) => {
      describe(`${language} Language`, () => {
        beforeEach(() => {
          i18n.locale = locale;
        });

        test('renders service list with correct translations', async () => {
          render(
            <TestWrapper locale={locale}>
              <ServiceListScreen 
                navigation={mockNavigation} 
                route={{ params: { services: mockServices } }}
              />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check service names
            mockServices.forEach(service => {
              const expectedName = locale === 'ar' ? service.name_ar : service.name_en;
              expect(screen.getByText(expectedName)).toBeTruthy();
              
              const expectedDescription = locale === 'ar' ? service.description_ar : service.description_en;
              expect(screen.getByText(expectedDescription)).toBeTruthy();
              
              const expectedProvider = locale === 'ar' ? service.provider.name_ar : service.provider.name_en;
              expect(screen.getByText(expectedProvider)).toBeTruthy();
            });
          });
        });

        test('displays price in correct currency format', async () => {
          render(
            <TestWrapper locale={locale}>
              <ServiceListScreen 
                navigation={mockNavigation} 
                route={{ params: { services: mockServices } }}
              />
            </TestWrapper>
          );

          await waitFor(() => {
            mockServices.forEach(service => {
              if (locale === 'ar') {
                // Arabic: د.أ 25.00 (Arabic numerals)
                expect(screen.getByText('د.أ ٢٥.٠٠')).toBeTruthy();
              } else {
                // English: JOD 25.00
                expect(screen.getByText('JOD 25.00')).toBeTruthy();
              }
            });
          });
        });

        test('displays duration in correct format', async () => {
          render(
            <TestWrapper locale={locale}>
              <ServiceListScreen 
                navigation={mockNavigation} 
                route={{ params: { services: mockServices } }}
              />
            </TestWrapper>
          );

          await waitFor(() => {
            if (locale === 'ar') {
              expect(screen.getByText('٦٠ دقيقة')).toBeTruthy();
              expect(screen.getByText('٩٠ دقيقة')).toBeTruthy();
            } else {
              expect(screen.getByText('60 minutes')).toBeTruthy();
              expect(screen.getByText('90 minutes')).toBeTruthy();
            }
          });
        });

        test('handles service selection with correct navigation', async () => {
          render(
            <TestWrapper locale={locale}>
              <ServiceListScreen 
                navigation={mockNavigation} 
                route={{ params: { services: mockServices } }}
              />
            </TestWrapper>
          );

          const serviceName = locale === 'ar' ? 'قص الشعر' : 'Haircut';
          const serviceCard = screen.getByText(serviceName);
          fireEvent.press(serviceCard);

          expect(mockNavigate).toHaveBeenCalledWith('BookingScreen', {
            service: mockServices[0]
          });
        });
      });
    });
  });

  describe('Booking Screen', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic' },
      { locale: 'en', language: 'English' }
    ];

    testCases.forEach(({ locale, language }) => {
      describe(`${language} Language`, () => {
        beforeEach(() => {
          i18n.locale = locale;
        });

        test('renders booking form with correct translations', async () => {
          render(
            <TestWrapper locale={locale}>
              <BookingScreen 
                navigation={mockNavigation} 
                route={{ params: { service: mockServices[0] } }}
              />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check form labels
            const expectedDateLabel = locale === 'ar' ? 'اختر التاريخ' : 'Select Date';
            expect(screen.getByText(expectedDateLabel)).toBeTruthy();

            const expectedTimeLabel = locale === 'ar' ? 'اختر الوقت' : 'Select Time';
            expect(screen.getByText(expectedTimeLabel)).toBeTruthy();

            const expectedNotesLabel = locale === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes';
            expect(screen.getByText(expectedNotesLabel)).toBeTruthy();
          });
        });

        test('displays date picker with correct locale', async () => {
          render(
            <TestWrapper locale={locale}>
              <BookingScreen 
                navigation={mockNavigation} 
                route={{ params: { service: mockServices[0] } }}
              />
            </TestWrapper>
          );

          const dateButton = screen.getByText(locale === 'ar' ? 'اختر التاريخ' : 'Select Date');
          fireEvent.press(dateButton);

          await waitFor(() => {
            // Check if date picker displays in correct locale
            const today = new Date();
            if (locale === 'ar') {
              // Arabic date format: ٢٠٢٤/٠١/١٥
              const arabicDate = today.toLocaleDateString('ar-JO');
              expect(screen.getByText(arabicDate)).toBeTruthy();
            } else {
              // English date format: 01/15/2024
              const englishDate = today.toLocaleDateString('en-US');
              expect(screen.getByText(englishDate)).toBeTruthy();
            }
          });
        });

        test('displays time slots with correct format', async () => {
          render(
            <TestWrapper locale={locale}>
              <BookingScreen 
                navigation={mockNavigation} 
                route={{ params: { service: mockServices[0] } }}
              />
            </TestWrapper>
          );

          await waitFor(() => {
            if (locale === 'ar') {
              // Arabic time format: ٢:٠٠ مساءً
              expect(screen.getByText('٢:٠٠ مساءً')).toBeTruthy();
              expect(screen.getByText('٣:٠٠ مساءً')).toBeTruthy();
            } else {
              // English time format: 2:00 PM
              expect(screen.getByText('2:00 PM')).toBeTruthy();
              expect(screen.getByText('3:00 PM')).toBeTruthy();
            }
          });
        });

        test('validates notes input for correct language', async () => {
          render(
            <TestWrapper locale={locale}>
              <BookingScreen 
                navigation={mockNavigation} 
                route={{ params: { service: mockServices[0] } }}
              />
            </TestWrapper>
          );

          const notesInput = screen.getByPlaceholderText(
            locale === 'ar' ? 'أضف ملاحظاتك هنا' : 'Add your notes here'
          );

          if (locale === 'ar') {
            // Test English notes in Arabic mode
            fireEvent.changeText(notesInput, 'English notes');
            
            await waitFor(() => {
              expect(screen.getByText('يجب كتابة الملاحظات باللغة العربية')).toBeTruthy();
            });

            // Test valid Arabic notes
            fireEvent.changeText(notesInput, 'ملاحظات عربية');
            
            await waitFor(() => {
              expect(screen.queryByText('يجب كتابة الملاحظات باللغة العربية')).toBeNull();
            });
          } else {
            // Test Arabic notes in English mode
            fireEvent.changeText(notesInput, 'ملاحظات عربية');
            
            await waitFor(() => {
              expect(screen.getByText('Please write notes in English')).toBeTruthy();
            });

            // Test valid English notes
            fireEvent.changeText(notesInput, 'English notes');
            
            await waitFor(() => {
              expect(screen.queryByText('Please write notes in English')).toBeNull();
            });
          }
        });

        test('handles booking confirmation with correct navigation', async () => {
          render(
            <TestWrapper locale={locale}>
              <BookingScreen 
                navigation={mockNavigation} 
                route={{ params: { service: mockServices[0] } }}
              />
            </TestWrapper>
          );

          const confirmButton = screen.getByText(locale === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking');
          fireEvent.press(confirmButton);

          await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('BookingConfirmation', expect.any(Object));
          });
        });
      });
    });
  });

  describe('Booking Confirmation Screen', () => {
    const mockBooking = {
      id: 'BK001',
      service: mockServices[0],
      date: '2024-01-15',
      time: '14:00',
      notes: 'Test booking',
      total: 25.0
    };

    const testCases = [
      { locale: 'ar', language: 'Arabic' },
      { locale: 'en', language: 'English' }
    ];

    testCases.forEach(({ locale, language }) => {
      describe(`${language} Language`, () => {
        beforeEach(() => {
          i18n.locale = locale;
        });

        test('renders confirmation with correct translations', async () => {
          render(
            <TestWrapper locale={locale}>
              <BookingConfirmationScreen 
                navigation={mockNavigation} 
                route={{ params: { booking: mockBooking } }}
              />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check confirmation message
            const expectedMessage = locale === 'ar' 
              ? 'تم تأكيد حجزك بنجاح' 
              : 'Your booking has been confirmed successfully';
            expect(screen.getByText(expectedMessage)).toBeTruthy();

            // Check booking ID
            const expectedIdLabel = locale === 'ar' ? 'رقم الحجز' : 'Booking ID';
            expect(screen.getByText(expectedIdLabel)).toBeTruthy();
            
            if (locale === 'ar') {
              expect(screen.getByText('BK٠٠١')).toBeTruthy(); // Arabic numerals
            } else {
              expect(screen.getByText('BK001')).toBeTruthy(); // Western numerals
            }
          });
        });

        test('displays booking details with correct formatting', async () => {
          render(
            <TestWrapper locale={locale}>
              <BookingConfirmationScreen 
                navigation={mockNavigation} 
                route={{ params: { booking: mockBooking } }}
              />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check service name
            const expectedServiceName = locale === 'ar' ? 'قص الشعر' : 'Haircut';
            expect(screen.getByText(expectedServiceName)).toBeTruthy();

            // Check date format
            if (locale === 'ar') {
              expect(screen.getByText('١٥/٠١/٢٠٢٤')).toBeTruthy();
            } else {
              expect(screen.getByText('01/15/2024')).toBeTruthy();
            }

            // Check time format
            if (locale === 'ar') {
              expect(screen.getByText('٢:٠٠ مساءً')).toBeTruthy();
            } else {
              expect(screen.getByText('2:00 PM')).toBeTruthy();
            }

            // Check total price
            if (locale === 'ar') {
              expect(screen.getByText('د.أ ٢٥.٠٠')).toBeTruthy();
            } else {
              expect(screen.getByText('JOD 25.00')).toBeTruthy();
            }
          });
        });

        test('handles payment navigation', async () => {
          render(
            <TestWrapper locale={locale}>
              <BookingConfirmationScreen 
                navigation={mockNavigation} 
                route={{ params: { booking: mockBooking } }}
              />
            </TestWrapper>
          );

          const paymentButton = screen.getByText(locale === 'ar' ? 'ادفع الآن' : 'Pay Now');
          fireEvent.press(paymentButton);

          expect(mockNavigate).toHaveBeenCalledWith('Payment', {
            booking: mockBooking
          });
        });
      });
    });
  });

  describe('Payment Screen', () => {
    const mockBooking = {
      id: 'BK001',
      total: 25.0,
      service: mockServices[0]
    };

    const testCases = [
      { locale: 'ar', language: 'Arabic' },
      { locale: 'en', language: 'English' }
    ];

    testCases.forEach(({ locale, language }) => {
      describe(`${language} Language`, () => {
        beforeEach(() => {
          i18n.locale = locale;
        });

        test('renders payment form with correct translations', async () => {
          render(
            <TestWrapper locale={locale}>
              <PaymentScreen 
                navigation={mockNavigation} 
                route={{ params: { booking: mockBooking } }}
              />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check payment methods
            const expectedCashLabel = locale === 'ar' ? 'الدفع نقداً' : 'Cash Payment';
            expect(screen.getByText(expectedCashLabel)).toBeTruthy();

            const expectedCardLabel = locale === 'ar' ? 'البطاقة الائتمانية' : 'Credit Card';
            expect(screen.getByText(expectedCardLabel)).toBeTruthy();

            // Check total amount
            const expectedTotalLabel = locale === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount';
            expect(screen.getByText(expectedTotalLabel)).toBeTruthy();
          });
        });

        test('displays amount in correct currency format', async () => {
          render(
            <TestWrapper locale={locale}>
              <PaymentScreen 
                navigation={mockNavigation} 
                route={{ params: { booking: mockBooking } }}
              />
            </TestWrapper>
          );

          await waitFor(() => {
            if (locale === 'ar') {
              expect(screen.getByText('د.أ ٢٥.٠٠')).toBeTruthy();
            } else {
              expect(screen.getByText('JOD 25.00')).toBeTruthy();
            }
          });
        });

        test('handles payment completion', async () => {
          render(
            <TestWrapper locale={locale}>
              <PaymentScreen 
                navigation={mockNavigation} 
                route={{ params: { booking: mockBooking } }}
              />
            </TestWrapper>
          );

          const payButton = screen.getByText(locale === 'ar' ? 'ادفع الآن' : 'Pay Now');
          fireEvent.press(payButton);

          await waitFor(() => {
            const expectedSuccessMessage = locale === 'ar' 
              ? 'تم الدفع بنجاح' 
              : 'Payment completed successfully';
            expect(screen.getByText(expectedSuccessMessage)).toBeTruthy();
          });
        });
      });
    });
  });

  describe('Cross-Flow Integration Tests', () => {
    test('maintains language consistency across booking flow', async () => {
      const testCompleteFlow = async (locale) => {
        i18n.locale = locale;
        
        // Start with service list
        const { rerender } = render(
          <TestWrapper locale={locale}>
            <ServiceListScreen 
              navigation={mockNavigation} 
              route={{ params: { services: mockServices } }}
            />
          </TestWrapper>
        );

        // Select service
        const serviceName = locale === 'ar' ? 'قص الشعر' : 'Haircut';
        fireEvent.press(screen.getByText(serviceName));

        // Move to booking screen
        rerender(
          <TestWrapper locale={locale}>
            <BookingScreen 
              navigation={mockNavigation} 
              route={{ params: { service: mockServices[0] } }}
            />
          </TestWrapper>
        );

        // Confirm booking
        const confirmButton = screen.getByText(locale === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking');
        fireEvent.press(confirmButton);

        // Check navigation consistency
        expect(mockNavigate).toHaveBeenCalledWith('BookingConfirmation', expect.any(Object));
      };

      await testCompleteFlow('ar');
      mockNavigate.mockClear();
      await testCompleteFlow('en');
    });

    test('handles language switch during booking flow', async () => {
      // Start in Arabic
      i18n.locale = 'ar';
      const { rerender } = render(
        <TestWrapper locale="ar">
          <BookingScreen 
            navigation={mockNavigation} 
            route={{ params: { service: mockServices[0] } }}
          />
        </TestWrapper>
      );

      // Verify Arabic content
      expect(screen.getByText('اختر التاريخ')).toBeTruthy();

      // Switch to English
      i18n.locale = 'en';
      rerender(
        <TestWrapper locale="en">
          <BookingScreen 
            navigation={mockNavigation} 
            route={{ params: { service: mockServices[0] } }}
          />
        </TestWrapper>
      );

      // Verify English content
      expect(screen.getByText('Select Date')).toBeTruthy();
    });
  });
});