/**
 * Phone number utilities for Jordan phone numbers
 */

/**
 * Normalize Jordanian phone numbers to a consistent format
 * Accepts: +962xxxxxxxxx, 962xxxxxxxxx, 07xxxxxxxx, 7xxxxxxxx
 * Returns: +962xxxxxxxxx format
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  // Remove all non-digit characters except the leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + for processing
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle different formats
  if (cleaned.startsWith('962')) {
    // Already has country code
    cleaned = cleaned;
  } else if (cleaned.startsWith('07')) {
    // Local format with 0
    cleaned = '962' + cleaned.substring(1);
  } else if (cleaned.startsWith('7')) {
    // Local format without 0
    cleaned = '962' + cleaned;
  } else {
    throw new Error('Invalid Jordanian phone number format');
  }
  
  // Validate length (962 + 9 digits = 12 total)
  if (cleaned.length !== 12) {
    throw new Error('Invalid Jordanian phone number length');
  }
  
  // Validate mobile prefixes (77, 78, 79)
  const mobilePrefix = cleaned.substring(3, 5);
  if (!['77', '78', '79'].includes(mobilePrefix)) {
    throw new Error('Invalid Jordanian mobile number prefix');
  }
  
  return '+' + cleaned;
}

/**
 * Format phone number for display
 * Input: +962xxxxxxxxx
 * Output: 07x xxxx xxxx (for Jordan) or original for others
 */
export function formatPhoneForDisplay(phone: string, locale: 'ar' | 'en' = 'en'): string {
  if (!phone) return '';
  
  // If it's a Jordanian number, format it nicely
  if (phone.startsWith('+962')) {
    const localNumber = '0' + phone.substring(4);
    // Format as: 07x xxxx xxxx
    return localNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
  }
  
  // Return as-is for non-Jordanian numbers
  return phone;
}

/**
 * Validate if a phone number is a valid Jordanian mobile number
 */
export function isValidJordanianMobile(phone: string): boolean {
  try {
    const normalized = normalizePhoneNumber(phone);
    return /^\+962(77|78|79)\d{7}$/.test(normalized);
  } catch {
    return false;
  }
}

/**
 * Extract the local number from international format
 * Input: +962xxxxxxxxx
 * Output: 07xxxxxxxx
 */
export function getLocalNumber(phone: string): string {
  if (!phone) return '';
  
  if (phone.startsWith('+962')) {
    return '0' + phone.substring(4);
  }
  
  // Already local format
  if (phone.startsWith('07')) {
    return phone;
  }
  
  // Try to normalize first
  try {
    const normalized = normalizePhoneNumber(phone);
    return '0' + normalized.substring(4);
  } catch {
    return phone;
  }
}

/**
 * Mask phone number for privacy
 * Input: +962791234567
 * Output: +962*****4567
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  
  const visibleStart = 4; // Show country code
  const visibleEnd = 4;   // Show last 4 digits
  
  const start = phone.substring(0, visibleStart);
  const end = phone.substring(phone.length - visibleEnd);
  const masked = '*'.repeat(phone.length - visibleStart - visibleEnd);
  
  return start + masked + end;
}