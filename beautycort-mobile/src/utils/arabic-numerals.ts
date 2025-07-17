/**
 * Arabic-Indic Numeral Conversion Utilities
 * Provides comprehensive support for Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)
 * and proper localization for Jordan market
 */

import { isRTL } from '../i18n';

// Arabic-Indic numerals mapping
const ARABIC_NUMERALS = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩'
};

// Reverse mapping for conversion back to Western numerals
const WESTERN_NUMERALS = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9'
};

// Arabic decimal separator and thousands separator
const ARABIC_DECIMAL_SEPARATOR = '٫';
const ARABIC_THOUSANDS_SEPARATOR = '٬';
const WESTERN_DECIMAL_SEPARATOR = '.';
const WESTERN_THOUSANDS_SEPARATOR = ',';

/**
 * Convert Western numerals to Arabic-Indic numerals
 */
export const toArabicNumerals = (input: string | number): string => {
  if (input === null || input === undefined) return '';
  
  const str = input.toString();
  return str.replace(/[0-9]/g, (digit) => ARABIC_NUMERALS[digit as keyof typeof ARABIC_NUMERALS] || digit);
};

/**
 * Convert Arabic-Indic numerals to Western numerals
 */
export const toWesternNumerals = (input: string): string => {
  if (!input) return '';
  
  return input.replace(/[٠-٩]/g, (digit) => WESTERN_NUMERALS[digit as keyof typeof WESTERN_NUMERALS] || digit);
};

/**
 * Format number with proper numerals based on current language
 */
export const formatNumber = (number: number, useArabicNumerals: boolean = isRTL()): string => {
  if (number === null || number === undefined || isNaN(number)) return '';
  
  const formatted = number.toString();
  return useArabicNumerals ? toArabicNumerals(formatted) : formatted;
};

/**
 * Format number with thousands separators
 */
export const formatNumberWithSeparators = (
  number: number,
  useArabicNumerals: boolean = isRTL(),
  decimalPlaces: number = 0
): string => {
  if (number === null || number === undefined || isNaN(number)) return '';
  
  // Format with decimal places
  const formatted = number.toFixed(decimalPlaces);
  const [integerPart, decimalPart] = formatted.split('.');
  
  // Add thousands separators
  const separator = useArabicNumerals ? ARABIC_THOUSANDS_SEPARATOR : WESTERN_THOUSANDS_SEPARATOR;
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  
  // Combine integer and decimal parts
  let result = formattedInteger;
  if (decimalPart && decimalPlaces > 0) {
    const decimalSep = useArabicNumerals ? ARABIC_DECIMAL_SEPARATOR : WESTERN_DECIMAL_SEPARATOR;
    result += decimalSep + decimalPart;
  }
  
  return useArabicNumerals ? toArabicNumerals(result) : result;
};

/**
 * Format currency with proper JOD formatting
 */
export const formatCurrency = (
  amount: number,
  useArabicNumerals: boolean = isRTL(),
  showSymbol: boolean = true,
  decimalPlaces: number = 3
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '';
  
  const formattedAmount = formatNumberWithSeparators(amount, useArabicNumerals, decimalPlaces);
  
  if (!showSymbol) return formattedAmount;
  
  const symbol = useArabicNumerals ? 'د.أ' : 'JOD';
  
  // In Arabic, currency symbol typically comes after the number
  // In English, it can come before or after (we'll use after for consistency)
  return useArabicNumerals 
    ? `${formattedAmount} ${symbol}`
    : `${symbol} ${formattedAmount}`;
};

/**
 * Format percentage with proper numerals
 */
export const formatPercentage = (
  percentage: number,
  useArabicNumerals: boolean = isRTL(),
  decimalPlaces: number = 1
): string => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) return '';
  
  const formattedPercentage = formatNumberWithSeparators(percentage, useArabicNumerals, decimalPlaces);
  const symbol = '%'; // Percentage symbol is the same in both languages
  
  return `${formattedPercentage}${symbol}`;
};

/**
 * Format phone number with proper numerals
 */
export const formatPhoneNumber = (
  phoneNumber: string,
  useArabicNumerals: boolean = isRTL(),
  includeCountryCode: boolean = true
): string => {
  if (!phoneNumber) return '';
  
  // Remove any non-digit characters and convert to western numerals for processing
  const cleanNumber = toWesternNumerals(phoneNumber).replace(/\D/g, '');
  
  // Jordan phone number format: +962 7X XXX XXXX
  if (cleanNumber.startsWith('962')) {
    const countryCode = '962';
    const localNumber = cleanNumber.substring(3);
    
    if (localNumber.length === 8) {
      const formatted = includeCountryCode 
        ? `+${countryCode} ${localNumber.substring(0, 2)} ${localNumber.substring(2, 5)} ${localNumber.substring(5)}`
        : `${localNumber.substring(0, 2)} ${localNumber.substring(2, 5)} ${localNumber.substring(5)}`;
      
      return useArabicNumerals ? toArabicNumerals(formatted) : formatted;
    }
  }
  
  // Fallback: just convert numerals
  return useArabicNumerals ? toArabicNumerals(phoneNumber) : toWesternNumerals(phoneNumber);
};

/**
 * Format date with Arabic numerals
 */
export const formatDate = (
  date: Date,
  useArabicNumerals: boolean = isRTL(),
  locale: 'ar-JO' | 'en-US' = isRTL() ? 'ar-JO' : 'en-US'
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  const formatted = date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return useArabicNumerals ? toArabicNumerals(formatted) : formatted;
};

/**
 * Format date with short format
 */
export const formatDateShort = (
  date: Date,
  useArabicNumerals: boolean = isRTL(),
  locale: 'ar-JO' | 'en-US' = isRTL() ? 'ar-JO' : 'en-US'
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  const formatted = date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return useArabicNumerals ? toArabicNumerals(formatted) : formatted;
};

/**
 * Format time with Arabic numerals
 */
export const formatTime = (
  date: Date,
  useArabicNumerals: boolean = isRTL(),
  use24Hour: boolean = false,
  locale: 'ar-JO' | 'en-US' = isRTL() ? 'ar-JO' : 'en-US'
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  const formatted = date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24Hour
  });
  
  return useArabicNumerals ? toArabicNumerals(formatted) : formatted;
};

/**
 * Format duration (in minutes) with proper units
 */
export const formatDuration = (
  minutes: number,
  useArabicNumerals: boolean = isRTL(),
  useArabicUnits: boolean = isRTL()
): string => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  let result = '';
  
  if (hours > 0) {
    const formattedHours = useArabicNumerals ? toArabicNumerals(hours.toString()) : hours.toString();
    const hourUnit = useArabicUnits 
      ? (hours === 1 ? 'ساعة' : 'ساعات')
      : (hours === 1 ? 'hour' : 'hours');
    result += `${formattedHours} ${hourUnit}`;
  }
  
  if (remainingMinutes > 0) {
    if (result) result += ' ';
    const formattedMinutes = useArabicNumerals ? toArabicNumerals(remainingMinutes.toString()) : remainingMinutes.toString();
    const minuteUnit = useArabicUnits 
      ? (remainingMinutes === 1 ? 'دقيقة' : 'دقائق')
      : (remainingMinutes === 1 ? 'minute' : 'minutes');
    result += `${formattedMinutes} ${minuteUnit}`;
  }
  
  return result || (useArabicNumerals ? '٠ دقائق' : '0 minutes');
};

/**
 * Format rating with Arabic numerals
 */
export const formatRating = (
  rating: number,
  maxRating: number = 5,
  useArabicNumerals: boolean = isRTL(),
  decimalPlaces: number = 1
): string => {
  if (rating === null || rating === undefined || isNaN(rating)) return '';
  
  const formattedRating = formatNumberWithSeparators(rating, useArabicNumerals, decimalPlaces);
  const formattedMax = useArabicNumerals ? toArabicNumerals(maxRating.toString()) : maxRating.toString();
  
  return `${formattedRating}/${formattedMax}`;
};

/**
 * Format booking ID with Arabic numerals
 */
export const formatBookingId = (
  bookingId: string | number,
  useArabicNumerals: boolean = isRTL(),
  prefix: string = 'B'
): string => {
  if (!bookingId) return '';
  
  const formatted = `${prefix}${bookingId}`;
  return useArabicNumerals ? toArabicNumerals(formatted) : formatted;
};

/**
 * Format order number with Arabic numerals
 */
export const formatOrderNumber = (
  orderNumber: string | number,
  useArabicNumerals: boolean = isRTL(),
  prefix: string = '#'
): string => {
  if (!orderNumber) return '';
  
  const formatted = `${prefix}${orderNumber}`;
  return useArabicNumerals ? toArabicNumerals(formatted) : formatted;
};

/**
 * Parse Arabic numeral input to number
 */
export const parseArabicNumber = (input: string): number => {
  if (!input) return 0;
  
  // Convert Arabic numerals to Western numerals first
  const westernInput = toWesternNumerals(input);
  
  // Remove thousands separators and convert decimal separator
  const cleanInput = westernInput
    .replace(/[٬,]/g, '') // Remove thousands separators
    .replace(/٫/g, '.'); // Convert Arabic decimal separator to Western
  
  const parsed = parseFloat(cleanInput);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validate Arabic numeral input
 */
export const isValidArabicNumber = (input: string): boolean => {
  if (!input) return false;
  
  // Convert to Western numerals and check if it's a valid number
  const westernInput = toWesternNumerals(input)
    .replace(/[٬,]/g, '') // Remove thousands separators
    .replace(/٫/g, '.'); // Convert Arabic decimal separator
  
  return !isNaN(parseFloat(westernInput)) && isFinite(parseFloat(westernInput));
};

/**
 * Format distance with proper units
 */
export const formatDistance = (
  distance: number,
  useArabicNumerals: boolean = isRTL(),
  useArabicUnits: boolean = isRTL(),
  unit: 'km' | 'm' = 'km'
): string => {
  if (distance === null || distance === undefined || isNaN(distance)) return '';
  
  const formattedDistance = formatNumberWithSeparators(distance, useArabicNumerals, 1);
  
  let unitText = unit;
  if (useArabicUnits) {
    unitText = unit === 'km' ? 'كم' : 'م';
  }
  
  return `${formattedDistance} ${unitText}`;
};

/**
 * Format file size with proper units
 */
export const formatFileSize = (
  bytes: number,
  useArabicNumerals: boolean = isRTL(),
  useArabicUnits: boolean = isRTL()
): string => {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '';
  
  const units = useArabicUnits 
    ? ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت']
    : ['B', 'KB', 'MB', 'GB'];
  
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  const formattedSize = formatNumberWithSeparators(size, useArabicNumerals, 1);
  return `${formattedSize} ${units[unitIndex]}`;
};

/**
 * Format count with proper pluralization
 */
export const formatCount = (
  count: number,
  singularAr: string,
  pluralAr: string,
  singularEn: string,
  pluralEn: string,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  if (count === null || count === undefined || isNaN(count)) return '';
  
  const formattedCount = useArabicNumerals ? toArabicNumerals(count.toString()) : count.toString();
  
  let text: string;
  if (useArabicText) {
    // Arabic pluralization rules (simplified)
    if (count === 1) {
      text = singularAr;
    } else if (count === 2) {
      text = singularAr; // Arabic has dual form, but we'll use singular for simplicity
    } else {
      text = pluralAr;
    }
  } else {
    text = count === 1 ? singularEn : pluralEn;
  }
  
  return `${formattedCount} ${text}`;
};

/**
 * Format service count
 */
export const formatServiceCount = (
  count: number,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  return formatCount(
    count,
    'خدمة',
    'خدمات',
    'service',
    'services',
    useArabicNumerals,
    useArabicText
  );
};

/**
 * Format booking count
 */
export const formatBookingCount = (
  count: number,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  return formatCount(
    count,
    'حجز',
    'حجوزات',
    'booking',
    'bookings',
    useArabicNumerals,
    useArabicText
  );
};

/**
 * Format review count
 */
export const formatReviewCount = (
  count: number,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  return formatCount(
    count,
    'تقييم',
    'تقييمات',
    'review',
    'reviews',
    useArabicNumerals,
    useArabicText
  );
};

/**
 * Utility object with all formatting functions
 */
export const ArabicNumerals = {
  // Core conversion functions
  toArabic: toArabicNumerals,
  toWestern: toWesternNumerals,
  
  // Number formatting
  formatNumber,
  formatNumberWithSeparators,
  formatCurrency,
  formatPercentage,
  formatRating,
  
  // Date and time formatting
  formatDate,
  formatDateShort,
  formatTime,
  formatDuration,
  
  // ID and reference formatting
  formatBookingId,
  formatOrderNumber,
  formatPhoneNumber,
  
  // Measurement formatting
  formatDistance,
  formatFileSize,
  
  // Count formatting
  formatCount,
  formatServiceCount,
  formatBookingCount,
  formatReviewCount,
  
  // Parsing and validation
  parseArabicNumber,
  isValidArabicNumber
};

// Export default
export default ArabicNumerals;