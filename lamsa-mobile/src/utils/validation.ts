/**
 * @file validation.ts
 * @description Input validation utilities for mobile services
 * @author Lamsa Development Team
 * @date Created: 2025-07-26
 * @copyright Lamsa 2025
 */

export const validateJordanianPhone = (phone: string): boolean => {
  // Remove any spaces or special characters
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
  
  // Jordanian mobile numbers start with 7 and have 8 digits total
  // Valid prefixes: 77, 78, 79
  const jordanianMobileRegex = /^7[789]\d{6}$/;
  
  return jordanianMobileRegex.test(cleanPhone);
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Format as 7X XXX XXXX
  if (cleanPhone.length >= 2) {
    let formatted = cleanPhone.substring(0, 2);
    if (cleanPhone.length > 2) {
      formatted += ' ' + cleanPhone.substring(2, 5);
    }
    if (cleanPhone.length > 5) {
      formatted += ' ' + cleanPhone.substring(5, 9);
    }
    return formatted;
  }
  
  return cleanPhone;
};

export const getFullPhoneNumber = (phone: string, countryCode: string = '+962'): string => {
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
  return `${countryCode}${cleanPhone}`;
};

/**
 * Validates UUID format
 * @param uuid - The UUID string to validate
 * @param paramName - Parameter name for error messages
 * @returns The validated UUID in lowercase
 * @throws Error if UUID is invalid
 */
export function validateUUID(uuid: string, paramName: string = 'id'): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuid || !uuidRegex.test(uuid)) {
    throw new Error(`Invalid ${paramName} format. Must be a valid UUID.`);
  }
  
  return uuid.toLowerCase();
}

/**
 * Validates email format
 * @param email - The email address to validate
 * @returns The validated email in lowercase
 * @throws Error if email is invalid
 */
export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  return email.toLowerCase().trim();
}

/**
 * Validates date string
 * @param date - The date string to validate
 * @param paramName - Parameter name for error messages
 * @returns The validated date in ISO format
 * @throws Error if date is invalid
 */
export function validateDate(date: string | Date, paramName: string = 'date'): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    throw new Error(`${paramName} must be a valid date`);
  }
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`${paramName} is not a valid date`);
  }
  
  return dateObj.toISOString();
}

/**
 * Validates time string (HH:mm format)
 * @param time - The time string to validate
 * @returns The validated time string
 * @throws Error if time format is invalid
 */
export function validateTime(time: string): string {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!time || !timeRegex.test(time)) {
    throw new Error('Invalid time format. Must be HH:mm');
  }
  
  return time;
}

/**
 * Validates pagination parameters
 * @param page - Page number
 * @param limit - Items per page
 * @returns Validated pagination parameters
 */
export function validatePagination(
  page?: number | string,
  limit?: number | string
): { page: number; limit: number } {
  const validatedPage = Math.max(1, Number(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  
  return { page: validatedPage, limit: validatedLimit };
}

/**
 * Validates price/amount
 * @param amount - The amount to validate
 * @param paramName - Parameter name for error messages
 * @returns The validated amount
 * @throws Error if amount is invalid
 */
export function validateAmount(amount: number | string, paramName: string = 'amount'): number {
  const numAmount = Number(amount);
  
  if (isNaN(numAmount) || numAmount < 0) {
    throw new Error(`${paramName} must be a valid positive number`);
  }
  
  // Round to 2 decimal places for currency
  return Math.round(numAmount * 100) / 100;
}

/**
 * Validates location coordinates
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Validated coordinates
 * @throws Error if coordinates are invalid
 */
export function validateCoordinates(
  lat: number | string,
  lng: number | string
): { latitude: number; longitude: number } {
  const latitude = Number(lat);
  const longitude = Number(lng);
  
  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude. Must be between -90 and 90');
  }
  
  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude. Must be between -180 and 180');
  }
  
  return { latitude, longitude };
}

/**
 * Sanitizes string input to prevent injection
 * @param input - The string to sanitize
 * @param paramName - Parameter name for error messages
 * @returns The sanitized string
 */
export function sanitizeString(input: string, paramName: string = 'input'): string {
  if (typeof input !== 'string') {
    throw new Error(`${paramName} must be a string`);
  }
  
  // Remove potential script tags and dangerous characters
  const sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/[<>\"']/g, '')
    .trim();
  
  if (sanitized.length === 0) {
    throw new Error(`${paramName} cannot be empty`);
  }
  
  return sanitized;
}

/**
 * Validates OTP code
 * @param otp - The OTP code to validate
 * @returns The validated OTP
 * @throws Error if OTP is invalid
 */
export function validateOTP(otp: string): string {
  const otpRegex = /^[0-9]{6}$/;
  
  if (!otp || !otpRegex.test(otp)) {
    throw new Error('OTP must be exactly 6 digits');
  }
  
  return otp;
}

/**
 * Validates array of UUIDs
 * @param ids - Array of UUID strings
 * @param paramName - Parameter name for error messages
 * @returns Array of validated UUIDs
 */
export function validateUUIDArray(ids: string[], paramName: string = 'ids'): string[] {
  if (!Array.isArray(ids)) {
    throw new Error(`${paramName} must be an array`);
  }
  
  return ids.map((id, index) => 
    validateUUID(id, `${paramName}[${index}]`)
  );
}