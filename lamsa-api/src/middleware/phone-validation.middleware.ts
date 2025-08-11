import { body, ValidationChain } from 'express-validator';
import { normalizePhoneNumber } from '../utils/phone.utils';

/**
 * Consistent phone number validation for Jordan
 * Accepts formats: +962xxxxxxxxx, 962xxxxxxxxx, 07xxxxxxxx, 7xxxxxxxx
 * Normalizes to: +962xxxxxxxxx
 */
export const validatePhoneNumber = (fieldName: string = 'phone'): ValidationChain => {
  return body(fieldName)
    .notEmpty().withMessage('Phone number is required')
    .isString().withMessage('Phone number must be a string')
    .custom((value) => {
      try {
        // Try to normalize the phone number
        const normalized = normalizePhoneNumber(value);
        return true;
      } catch (error) {
        throw new Error('Invalid Jordanian phone number format');
      }
    })
    .customSanitizer((value) => {
      try {
        // Normalize the phone number for consistent storage
        return normalizePhoneNumber(value);
      } catch {
        return value; // Return original if normalization fails
      }
    });
};

/**
 * Optional phone number validation
 */
export const validateOptionalPhoneNumber = (fieldName: string = 'phone'): ValidationChain => {
  return body(fieldName)
    .optional()
    .isString().withMessage('Phone number must be a string')
    .custom((value) => {
      if (!value) return true;
      try {
        normalizePhoneNumber(value);
        return true;
      } catch (error) {
        throw new Error('Invalid Jordanian phone number format');
      }
    })
    .customSanitizer((value) => {
      if (!value) return value;
      try {
        return normalizePhoneNumber(value);
      } catch {
        return value;
      }
    });
};

/**
 * Validate array of phone numbers
 */
export const validatePhoneNumberArray = (fieldName: string = 'phones'): ValidationChain => {
  return body(fieldName)
    .optional()
    .isArray().withMessage('Phone numbers must be an array')
    .custom((values) => {
      if (!Array.isArray(values)) return true;
      
      for (const value of values) {
        try {
          normalizePhoneNumber(value);
        } catch {
          throw new Error(`Invalid phone number: ${value}`);
        }
      }
      return true;
    })
    .customSanitizer((values) => {
      if (!Array.isArray(values)) return values;
      
      return values.map(value => {
        try {
          return normalizePhoneNumber(value);
        } catch {
          return value;
        }
      });
    });
};

/**
 * Validation chains for different contexts
 */
export const phoneValidation = {
  // For authentication (strict)
  auth: validatePhoneNumber('phone'),
  
  // For profile updates (optional)
  profile: validateOptionalPhoneNumber('phone'),
  
  // For provider registration (strict)
  providerRegistration: validatePhoneNumber('phone'),
  
  // For employee management (optional)
  employee: validateOptionalPhoneNumber('phone'),
  
  // For OTP operations (strict)
  otp: validatePhoneNumber('phone'),
  
  // For search/filter operations (optional, lenient)
  search: body('phone')
    .optional()
    .isString()
    .customSanitizer((value) => {
      if (!value) return value;
      try {
        return normalizePhoneNumber(value);
      } catch {
        // For search, we might want partial matches
        return value;
      }
    })
};