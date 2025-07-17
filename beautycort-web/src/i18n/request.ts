/**
 * next-intl configuration for server-side internationalization
 * Handles locale detection and message loading
 */

import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

// Define supported locales
export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];

// Default locale (Arabic for Jordan market)
export const defaultLocale: Locale = 'ar';

// Locale configuration
export const localeConfig = {
  ar: {
    name: 'العربية',
    direction: 'rtl',
    flag: '🇯🇴',
    code: 'ar',
    countryCode: 'JO',
    currency: 'JOD',
    currencySymbol: 'د.أ',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: 'ar-JO'
  },
  en: {
    name: 'English',
    direction: 'ltr',
    flag: '🇺🇸',
    code: 'en',
    countryCode: 'US',
    currency: 'JOD',
    currencySymbol: 'JOD',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'h:mm a',
    numberFormat: 'en-US'
  }
} as const;

// Validate locale
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// Get locale from pathname
export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split('/');
  const potentialLocale = segments[1];
  
  if (isValidLocale(potentialLocale)) {
    return potentialLocale;
  }
  
  return defaultLocale;
}

// Get locale from headers
export async function getLocaleFromHeaders(): Promise<Locale> {
  const headersList = await headers();
  const acceptLanguage = headersList.get('Accept-Language');
  
  if (acceptLanguage) {
    // Parse Accept-Language header
    const languages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim())
      .map(lang => lang.split('-')[0]);
    
    // Find first supported locale
    for (const lang of languages) {
      if (isValidLocale(lang)) {
        return lang;
      }
    }
  }
  
  return defaultLocale;
}

// Configure next-intl
export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!isValidLocale(locale)) {
    notFound();
  }

  try {
    // Load messages for the locale
    const messages = await import(`./messages/${locale}.json`);
    
    return {
      messages: messages.default,
      timeZone: 'Asia/Amman', // Jordan timezone
      now: new Date(),
      formats: {
        dateTime: {
          short: {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
          },
          medium: {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          },
          long: {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          }
        },
        number: {
          currency: {
            style: 'currency',
            currency: localeConfig[locale].currency,
            currencyDisplay: 'symbol'
          },
          percent: {
            style: 'percent',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          },
          decimal: {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
          }
        }
      }
    };
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    notFound();
  }
});