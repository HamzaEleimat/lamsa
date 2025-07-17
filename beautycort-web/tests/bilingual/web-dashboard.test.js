/**
 * Automated bilingual testing for web dashboard
 * Tests web dashboard components and flows in both Arabic and English
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useRouter } from 'next/navigation';
import Dashboard from '../src/app/[locale]/dashboard/page';
import BookingsPage from '../src/app/[locale]/bookings/page';
import ServicesPage from '../src/app/[locale]/services/page';
import { LanguageSwitcher } from '../src/components/ui/language-switcher';
import { RTLWrapper, RTLText, RTLInput } from '../src/components/ui/rtl-wrapper';
import arMessages from '../src/i18n/messages/ar.json';
import enMessages from '../src/i18n/messages/en.json';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useParams: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

// Mock useRouter hook
useRouter.mockReturnValue(mockRouter);

// Test wrapper with i18n provider
const TestWrapper = ({ children, locale = 'ar', messages = arMessages }) => (
  <NextIntlClientProvider locale={locale} messages={messages}>
    {children}
  </NextIntlClientProvider>
);

describe('Web Dashboard - Bilingual Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Page', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic', messages: arMessages },
      { locale: 'en', language: 'English', messages: enMessages }
    ];

    testCases.forEach(({ locale, language, messages }) => {
      describe(`${language} Language`, () => {
        test('renders dashboard with correct translations', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <Dashboard />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check page title
            const expectedTitle = messages.dashboard.welcome;
            expect(screen.getByText(expectedTitle)).toBeInTheDocument();

            // Check navigation items
            expect(screen.getByText(messages.nav.dashboard)).toBeInTheDocument();
            expect(screen.getByText(messages.nav.bookings)).toBeInTheDocument();
            expect(screen.getByText(messages.nav.services)).toBeInTheDocument();
            expect(screen.getByText(messages.nav.customers)).toBeInTheDocument();
            expect(screen.getByText(messages.nav.providers)).toBeInTheDocument();
          });
        });

        test('displays statistics with correct formatting', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <Dashboard />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check statistics labels
            expect(screen.getByText(messages.dashboard.stats.totalBookings)).toBeInTheDocument();
            expect(screen.getByText(messages.dashboard.stats.totalRevenue)).toBeInTheDocument();
            expect(screen.getByText(messages.dashboard.stats.activeProviders)).toBeInTheDocument();
            expect(screen.getByText(messages.dashboard.stats.totalCustomers)).toBeInTheDocument();

            // Check if numbers are displayed in correct format
            if (locale === 'ar') {
              // Should display Arabic-Indic numerals
              expect(screen.getByText(/[٠-٩]/)).toBeInTheDocument();
            } else {
              // Should display Western numerals
              expect(screen.getByText(/[0-9]/)).toBeInTheDocument();
            }
          });
        });

        test('displays currency amounts in correct format', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <Dashboard />
            </TestWrapper>
          );

          await waitFor(() => {
            if (locale === 'ar') {
              // Should display Arabic currency format: د.أ ١٢٣.٤٥
              expect(screen.getByText(/د\.أ/)).toBeInTheDocument();
            } else {
              // Should display English currency format: JOD 123.45
              expect(screen.getByText(/JOD/)).toBeInTheDocument();
            }
          });
        });

        test('handles date formatting correctly', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <Dashboard />
            </TestWrapper>
          );

          await waitFor(() => {
            const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
            expect(dateElements.length).toBeGreaterThan(0);

            if (locale === 'ar') {
              // Arabic date format: DD/MM/YYYY with Arabic numerals
              expect(screen.getByText(/[٠-٩]{1,2}\/[٠-٩]{1,2}\/[٠-٩]{4}/)).toBeInTheDocument();
            } else {
              // English date format: MM/DD/YYYY with Western numerals
              expect(screen.getByText(/[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}/)).toBeInTheDocument();
            }
          });
        });

        test('applies correct text direction', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <Dashboard />
            </TestWrapper>
          );

          const container = screen.getByRole('main');
          
          if (locale === 'ar') {
            expect(container).toHaveAttribute('dir', 'rtl');
          } else {
            expect(container).toHaveAttribute('dir', 'ltr');
          }
        });
      });
    });
  });

  describe('Bookings Page', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic', messages: arMessages },
      { locale: 'en', language: 'English', messages: enMessages }
    ];

    testCases.forEach(({ locale, language, messages }) => {
      describe(`${language} Language`, () => {
        test('renders bookings table with correct translations', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <BookingsPage />
            </TestWrapper>
          );

          await waitFor(() => {
            // Check table headers
            expect(screen.getByText(messages.bookings.table.id)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.table.customer)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.table.service)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.table.provider)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.table.date)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.table.time)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.table.status)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.table.amount)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.table.actions)).toBeInTheDocument();
          });
        });

        test('displays booking status filters with correct translations', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <BookingsPage />
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText(messages.bookings.all)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.pending)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.confirmed)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.completed)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.cancelled)).toBeInTheDocument();
          });
        });

        test('displays booking actions with correct translations', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <BookingsPage />
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText(messages.bookings.actions.view)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.actions.edit)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.actions.cancel)).toBeInTheDocument();
            expect(screen.getByText(messages.bookings.actions.confirm)).toBeInTheDocument();
          });
        });

        test('handles booking ID display with correct numerals', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <BookingsPage />
            </TestWrapper>
          );

          await waitFor(() => {
            // Mock booking ID: BK001
            if (locale === 'ar') {
              expect(screen.getByText('BK٠٠١')).toBeInTheDocument();
            } else {
              expect(screen.getByText('BK001')).toBeInTheDocument();
            }
          });
        });
      });
    });
  });

  describe('Services Page', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic', messages: arMessages },
      { locale: 'en', language: 'English', messages: enMessages }
    ];

    testCases.forEach(({ locale, language, messages }) => {
      describe(`${language} Language`, () => {
        test('renders service categories with correct translations', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <ServicesPage />
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText(messages.services.categories.hairCare)).toBeInTheDocument();
            expect(screen.getByText(messages.services.categories.skinCare)).toBeInTheDocument();
            expect(screen.getByText(messages.services.categories.nailCare)).toBeInTheDocument();
            expect(screen.getByText(messages.services.categories.massage)).toBeInTheDocument();
            expect(screen.getByText(messages.services.categories.makeup)).toBeInTheDocument();
            expect(screen.getByText(messages.services.categories.waxing)).toBeInTheDocument();
            expect(screen.getByText(messages.services.categories.facials)).toBeInTheDocument();
            expect(screen.getByText(messages.services.categories.other)).toBeInTheDocument();
          });
        });

        test('displays service form with correct translations', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <ServicesPage />
            </TestWrapper>
          );

          // Click new service button
          const newServiceButton = screen.getByText(messages.services.new);
          fireEvent.click(newServiceButton);

          await waitFor(() => {
            // Check form labels
            expect(screen.getByText(messages.services.form.nameLabel)).toBeInTheDocument();
            expect(screen.getByText(messages.services.form.nameArLabel)).toBeInTheDocument();
            expect(screen.getByText(messages.services.form.descriptionLabel)).toBeInTheDocument();
            expect(screen.getByText(messages.services.form.descriptionArLabel)).toBeInTheDocument();
            expect(screen.getByText(messages.services.form.categoryLabel)).toBeInTheDocument();
            expect(screen.getByText(messages.services.form.priceLabel)).toBeInTheDocument();
            expect(screen.getByText(messages.services.form.durationLabel)).toBeInTheDocument();
          });
        });

        test('validates service form input based on locale', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <ServicesPage />
            </TestWrapper>
          );

          // Open service form
          const newServiceButton = screen.getByText(messages.services.new);
          fireEvent.click(newServiceButton);

          await waitFor(() => {
            const nameInput = screen.getByPlaceholderText(messages.services.form.namePlaceholder);
            
            if (locale === 'ar') {
              // Test English input in Arabic form
              fireEvent.change(nameInput, { target: { value: 'Hair Cut' } });
              expect(screen.getByText('يجب إدخال اسم الخدمة بالعربية')).toBeInTheDocument();
            } else {
              // Test Arabic input in English form
              fireEvent.change(nameInput, { target: { value: 'قص الشعر' } });
              expect(screen.getByText('Please enter service name in English')).toBeInTheDocument();
            }
          });
        });
      });
    });
  });

  describe('RTL Components', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic', messages: arMessages },
      { locale: 'en', language: 'English', messages: enMessages }
    ];

    testCases.forEach(({ locale, language, messages }) => {
      describe(`${language} Language`, () => {
        test('RTLWrapper applies correct direction', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <RTLWrapper className="test-wrapper">
                <div>Test content</div>
              </RTLWrapper>
            </TestWrapper>
          );

          const wrapper = screen.getByText('Test content').parentElement;
          
          if (locale === 'ar') {
            expect(wrapper).toHaveAttribute('dir', 'rtl');
          } else {
            expect(wrapper).toHaveAttribute('dir', 'ltr');
          }
        });

        test('RTLText applies correct text alignment', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <RTLText className="test-text">Test text</RTLText>
            </TestWrapper>
          );

          const textElement = screen.getByText('Test text');
          
          if (locale === 'ar') {
            expect(textElement).toHaveClass('text-right');
          } else {
            expect(textElement).toHaveClass('text-left');
          }
        });

        test('RTLInput applies correct direction', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <RTLInput placeholder="Test input" />
            </TestWrapper>
          );

          const inputElement = screen.getByPlaceholderText('Test input');
          
          if (locale === 'ar') {
            expect(inputElement).toHaveAttribute('dir', 'rtl');
          } else {
            expect(inputElement).toHaveAttribute('dir', 'ltr');
          }
        });
      });
    });
  });

  describe('Language Switcher', () => {
    test('displays current language correctly', async () => {
      // Test Arabic
      render(
        <TestWrapper locale="ar" messages={arMessages}>
          <LanguageSwitcher />
        </TestWrapper>
      );

      expect(screen.getByText('العربية')).toBeInTheDocument();

      // Test English
      render(
        <TestWrapper locale="en" messages={enMessages}>
          <LanguageSwitcher />
        </TestWrapper>
      );

      expect(screen.getByText('English')).toBeInTheDocument();
    });

    test('switches language correctly', async () => {
      const { rerender } = render(
        <TestWrapper locale="ar" messages={arMessages}>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const switchButton = screen.getByRole('button');
      fireEvent.click(switchButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/en');

      // Simulate language switch
      rerender(
        <TestWrapper locale="en" messages={enMessages}>
          <LanguageSwitcher />
        </TestWrapper>
      );

      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    const testCases = [
      { locale: 'ar', language: 'Arabic', messages: arMessages },
      { locale: 'en', language: 'English', messages: enMessages }
    ];

    testCases.forEach(({ locale, language, messages }) => {
      describe(`${language} Language`, () => {
        test('displays validation messages in correct language', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <form>
                <RTLInput required />
                <button type="submit">Submit</button>
              </form>
            </TestWrapper>
          );

          const submitButton = screen.getByText('Submit');
          fireEvent.click(submitButton);

          await waitFor(() => {
            expect(screen.getByText(messages.validation.required)).toBeInTheDocument();
          });
        });

        test('validates email format with correct message', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <form>
                <RTLInput type="email" value="invalid-email" />
                <button type="submit">Submit</button>
              </form>
            </TestWrapper>
          );

          const submitButton = screen.getByText('Submit');
          fireEvent.click(submitButton);

          await waitFor(() => {
            expect(screen.getByText(messages.validation.email)).toBeInTheDocument();
          });
        });

        test('validates phone number format with correct message', async () => {
          render(
            <TestWrapper locale={locale} messages={messages}>
              <form>
                <RTLInput type="tel" value="invalid-phone" />
                <button type="submit">Submit</button>
              </form>
            </TestWrapper>
          );

          const submitButton = screen.getByText('Submit');
          fireEvent.click(submitButton);

          await waitFor(() => {
            expect(screen.getByText(messages.validation.phone)).toBeInTheDocument();
          });
        });
      });
    });
  });

  describe('Performance and Accessibility', () => {
    test('language switching performance', async () => {
      const { rerender } = render(
        <TestWrapper locale="ar" messages={arMessages}>
          <Dashboard />
        </TestWrapper>
      );

      const startTime = performance.now();
      
      rerender(
        <TestWrapper locale="en" messages={enMessages}>
          <Dashboard />
        </TestWrapper>
      );

      const endTime = performance.now();
      const switchTime = endTime - startTime;
      
      // Language switch should be fast (< 100ms)
      expect(switchTime).toBeLessThan(100);
    });

    test('maintains accessibility attributes across languages', async () => {
      const { rerender } = render(
        <TestWrapper locale="ar" messages={arMessages}>
          <Dashboard />
        </TestWrapper>
      );

      // Check Arabic accessibility
      const arabicMain = screen.getByRole('main');
      expect(arabicMain).toHaveAttribute('lang', 'ar');
      expect(arabicMain).toHaveAttribute('dir', 'rtl');

      // Switch to English
      rerender(
        <TestWrapper locale="en" messages={enMessages}>
          <Dashboard />
        </TestWrapper>
      );

      // Check English accessibility
      const englishMain = screen.getByRole('main');
      expect(englishMain).toHaveAttribute('lang', 'en');
      expect(englishMain).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('Cross-Component Integration', () => {
    test('maintains language consistency across components', async () => {
      render(
        <TestWrapper locale="ar" messages={arMessages}>
          <div>
            <Dashboard />
            <LanguageSwitcher />
          </div>
        </TestWrapper>
      );

      // Check that all components use the same language
      expect(screen.getByText('العربية')).toBeInTheDocument(); // Language switcher
      expect(screen.getByText(arMessages.dashboard.welcome)).toBeInTheDocument(); // Dashboard
      expect(screen.getByText(arMessages.nav.bookings)).toBeInTheDocument(); // Navigation
    });

    test('handles component state during language switch', async () => {
      const { rerender } = render(
        <TestWrapper locale="ar" messages={arMessages}>
          <ServicesPage />
        </TestWrapper>
      );

      // Open service form
      const newServiceButton = screen.getByText(arMessages.services.new);
      fireEvent.click(newServiceButton);

      // Switch language
      rerender(
        <TestWrapper locale="en" messages={enMessages}>
          <ServicesPage />
        </TestWrapper>
      );

      // Form should still be open but in English
      expect(screen.getByText(enMessages.services.form.nameLabel)).toBeInTheDocument();
    });
  });
});