/**
 * Internationalization utilities for the Lamsa web dashboard
 * Provides helper functions for locale handling, formatting, and RTL support
 */

import { locales, localeConfig, type Locale } from '@/i18n/request';

// Format currency with proper locale
export function formatCurrency(amount: number, locale: Locale = 'ar'): string {
  const config = localeConfig[locale];
  
  try {
    return new Intl.NumberFormat(config.numberFormat, {
      style: 'currency',
      currency: config.currency,
      currencyDisplay: 'symbol'
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${config.currencySymbol} ${amount.toFixed(2)}`;
  }
}

// Format date with proper locale
export function formatDate(date: Date, locale: Locale = 'ar'): string {
  const config = localeConfig[locale];
  
  try {
    return new Intl.DateTimeFormat(config.numberFormat, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    // Fallback formatting
    return date.toLocaleDateString();
  }
}

// Format time with proper locale
export function formatTime(date: Date, locale: Locale = 'ar'): string {
  const config = localeConfig[locale];
  
  try {
    return new Intl.DateTimeFormat(config.numberFormat, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: config.timeFormat.includes('a')
    }).format(date);
  } catch (error) {
    // Fallback formatting
    return date.toLocaleTimeString();
  }
}

// Format phone number for Jordan
export function formatPhoneNumber(phone: string, locale: Locale = 'ar'): string {
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a Jordanian number
  if (cleanPhone.startsWith('962')) {
    // International format
    const number = cleanPhone.slice(3);
    return locale === 'ar' ? `+٩٦٢ ${formatArabicNumbers(number)}` : `+962 ${number}`;
  } else if (cleanPhone.startsWith('07')) {
    // Local format
    return locale === 'ar' ? formatArabicNumbers(cleanPhone) : cleanPhone;
  }
  
  return phone;
}

// Convert Western numerals to Arabic-Indic numerals
export function formatArabicNumbers(text: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return text.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
}

// Convert Arabic-Indic numerals to Western numerals
export function formatWesternNumbers(text: string): string {
  const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return text.replace(/[٠-٩]/g, (digit) => {
    const index = arabicNumerals.indexOf(digit);
    return index !== -1 ? westernNumerals[index] : digit;
  });
}

// Get text direction for locale
export function getTextDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeConfig[locale].direction;
}

// Check if locale is RTL
export function isRTL(locale: Locale): boolean {
  return getTextDirection(locale) === 'rtl';
}

// Get opposite locale
export function getOppositeLocale(locale: Locale): Locale {
  return locale === 'ar' ? 'en' : 'ar';
}

// Get locale from pathname
export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split('/');
  const potentialLocale = segments[1];
  
  if (locales.includes(potentialLocale as Locale)) {
    return potentialLocale as Locale;
  }
  
  return 'ar'; // Default to Arabic
}

// Create localized pathname
export function createLocalizedPathname(pathname: string, locale: Locale): string {
  const segments = pathname.split('/');
  
  // Remove current locale if present
  if (locales.includes(segments[1] as Locale)) {
    segments.splice(1, 1);
  }
  
  // Add new locale
  segments.splice(1, 0, locale);
  
  return segments.join('/');
}

// Format relative time
export function formatRelativeTime(date: Date, locale: Locale = 'ar'): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  const rtf = new Intl.RelativeTimeFormat(localeConfig[locale].numberFormat, {
    numeric: 'auto'
  });
  
  if (diff < minute) {
    return rtf.format(0, 'second');
  } else if (diff < hour) {
    return rtf.format(-Math.floor(diff / minute), 'minute');
  } else if (diff < day) {
    return rtf.format(-Math.floor(diff / hour), 'hour');
  } else if (diff < week) {
    return rtf.format(-Math.floor(diff / day), 'day');
  } else if (diff < month) {
    return rtf.format(-Math.floor(diff / week), 'week');
  } else if (diff < year) {
    return rtf.format(-Math.floor(diff / month), 'month');
  } else {
    return rtf.format(-Math.floor(diff / year), 'year');
  }
}

// Format number with locale
export function formatNumber(number: number, locale: Locale = 'ar'): string {
  const config = localeConfig[locale];
  
  try {
    return new Intl.NumberFormat(config.numberFormat).format(number);
  } catch (error) {
    return number.toString();
  }
}

// Format percentage
export function formatPercentage(value: number, locale: Locale = 'ar'): string {
  const config = localeConfig[locale];
  
  try {
    return new Intl.NumberFormat(config.numberFormat, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value / 100);
  } catch (error) {
    return `${value}%`;
  }
}

// Get localized country name
export function getCountryName(locale: Locale): string {
  const config = localeConfig[locale];
  
  try {
    return new Intl.DisplayNames([config.numberFormat], { type: 'region' })
      .of(config.countryCode) || 'Jordan';
  } catch (error) {
    return locale === 'ar' ? 'الأردن' : 'Jordan';
  }
}

// Validate Arabic text input
export function isArabicText(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

// Validate English text input
export function isEnglishText(text: string): boolean {
  const englishRegex = /^[a-zA-Z\s.,!?;:'"()-]*$/;
  return englishRegex.test(text);
}

// Get appropriate input validation for locale
export function getInputValidation(locale: Locale) {
  return {
    isValidText: locale === 'ar' ? isArabicText : isEnglishText,
    placeholder: locale === 'ar' ? 'اكتب بالعربية' : 'Type in English',
    direction: getTextDirection(locale)
  };
}

// Create RTL-aware CSS classes
export function createRTLClasses(locale: Locale, baseClasses: string): string {
  const direction = getTextDirection(locale);
  
  if (direction === 'rtl') {
    return baseClasses
      .replace(/\bleft-/g, 'right-')
      .replace(/\bright-/g, 'left-')
      .replace(/\bml-/g, 'mr-')
      .replace(/\bmr-/g, 'ml-')
      .replace(/\bpl-/g, 'pr-')
      .replace(/\bpr-/g, 'pl-')
      .replace(/\brounded-l/g, 'rounded-r')
      .replace(/\brounded-r/g, 'rounded-l');
  }
  
  return baseClasses;
}

// Export all utilities
export default {
  formatCurrency,
  formatDate,
  formatTime,
  formatPhoneNumber,
  formatArabicNumbers,
  formatWesternNumbers,
  getTextDirection,
  isRTL,
  getOppositeLocale,
  getLocaleFromPathname,
  createLocalizedPathname,
  formatRelativeTime,
  formatNumber,
  formatPercentage,
  getCountryName,
  isArabicText,
  isEnglishText,
  getInputValidation,
  createRTLClasses
};