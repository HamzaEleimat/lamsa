/**
 * Phone validation utilities for Jordan phone numbers
 * Supports multiple input formats and normalizes to international format
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedPhone?: string;
  error?: string;
  isTestNumber?: boolean;
}

/**
 * Validate and normalize Jordan phone numbers
 * Accepts formats: +962XXXXXXXXX, 962XXXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
 * Returns normalized format: +962XXXXXXXXX
 */
export function validateJordanPhoneNumber(phone: string): PhoneValidationResult {
  if (!phone) {
    return {
      isValid: false,
      error: 'Phone number is required'
    };
  }

  // Remove all non-digit characters except the leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove any + that's not at the beginning
  if (cleaned.indexOf('+') > 0) {
    cleaned = cleaned.replace(/\+/g, '');
    cleaned = '+' + cleaned;
  }
  
  // Now remove all non-digits for processing
  let digitsOnly = cleaned.replace(/\D/g, '');
  
  // Handle different input formats
  let normalized: string;
  
  if (digitsOnly.startsWith('962')) {
    // Already has country code
    normalized = '+' + digitsOnly;
  } else if (digitsOnly.startsWith('07') && digitsOnly.length === 10) {
    // Local format with leading 0 (e.g., 0791234567)
    normalized = '+962' + digitsOnly.substring(1);
  } else if (digitsOnly.startsWith('7') && digitsOnly.length === 9) {
    // Local format without leading 0 (e.g., 791234567)
    normalized = '+962' + digitsOnly;
  } else {
    return {
      isValid: false,
      error: 'Invalid phone number format. Expected formats: +962XXXXXXXXX, 962XXXXXXXXX, 07XXXXXXXX, or 7XXXXXXXX'
    };
  }
  
  // Validate the normalized format
  // Jordan mobile numbers: +962 followed by 7[7-9] and 7 more digits
  const jordanMobileRegex = /^\+9627[789]\d{7}$/;
  
  if (!jordanMobileRegex.test(normalized)) {
    // Check if it's a valid format but wrong prefix
    if (/^\+9627\d{8}$/.test(normalized)) {
      const prefix = normalized.substring(5, 7);
      return {
        isValid: false,
        error: `Invalid mobile prefix '${prefix}'. Jordan mobile numbers must start with 77, 78, or 79`
      };
    }
    
    return {
      isValid: false,
      error: 'Invalid Jordan mobile number format'
    };
  }
  
  return {
    isValid: true,
    normalizedPhone: normalized
  };
}

/**
 * Format phone number for display
 * Input: +962791234567
 * Output: 079 123 4567 (local) or +962 79 123 4567 (international)
 */
export function formatPhoneForDisplay(
  phone: string, 
  format: 'local' | 'international' = 'local'
): string {
  const validation = validateJordanPhoneNumber(phone);
  
  if (!validation.isValid || !validation.normalizedPhone) {
    return phone; // Return as-is if invalid
  }
  
  const normalized = validation.normalizedPhone;
  const withoutCountryCode = normalized.substring(4); // Remove +962
  
  if (format === 'local') {
    // Format: 079 123 4567
    const localNumber = '0' + withoutCountryCode;
    return localNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  } else {
    // Format: +962 79 123 4567
    return normalized.replace(/(\+962)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  }
}

/**
 * Check if a phone number is in international format
 */
export function isInternationalFormat(phone: string): boolean {
  return phone.startsWith('+') || phone.startsWith('00');
}

/**
 * Extract country code from phone number
 */
export function extractCountryCode(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('962')) {
    return '962';
  }
  
  // For other countries in the future
  const match = cleaned.match(/^(\d{1,3})/);
  return match ? match[1] : null;
}

/**
 * Validate phone numbers for testing purposes
 * Accepts Jordan, US, and Spain test numbers
 */
export function validateTestPhoneNumber(phone: string): PhoneValidationResult {
  // First try Jordan validation
  const jordanResult = validateJordanPhoneNumber(phone);
  if (jordanResult.isValid) {
    return jordanResult;
  }
  
  // Security: Only Jordan phone numbers allowed (removed test number bypass)
  
  // Return original Jordan validation error
  return jordanResult;
}

/**
 * Security: Constant-time comparison for phone numbers
 * Prevents timing attacks when checking if phone numbers match
 */
export function securePhoneCompare(phone1: string, phone2: string): boolean {
  const norm1 = validateJordanPhoneNumber(phone1).normalizedPhone || '';
  const norm2 = validateJordanPhoneNumber(phone2).normalizedPhone || '';
  
  if (norm1.length !== norm2.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < norm1.length; i++) {
    result |= norm1.charCodeAt(i) ^ norm2.charCodeAt(i);
  }
  
  return result === 0;
}
