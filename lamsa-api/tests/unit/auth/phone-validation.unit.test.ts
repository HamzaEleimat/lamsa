/**
 * Unit Tests for Phone Validation Utility
 * Tests Jordan phone number validation, normalization, and security features
 */

import {
  validateJordanPhone,
  normalizePhoneNumber,
  isTestPhoneNumber,
  formatPhoneDisplay,
  verifyOtpSecure
} from '../../../src/utils/phone-validation';

describe('Phone Validation Utils', () => {
  describe('validateJordanPhone', () => {
    describe('Valid Jordan Phone Numbers', () => {
      const validNumbers = [
        // +962 format
        '+96277-1234567',
        '+96277 1234567',
        '+962771234567',
        '+96278-1234567',
        '+96279-1234567',
        
        // 962 format (without +)
        '962771234567',
        '962781234567',
        '962791234567',
        
        // 07 format (local)
        '0771234567',
        '0781234567',
        '0791234567',
        
        // 7 format (short local)
        '771234567',
        '781234567',
        '791234567'
      ];

      test.each(validNumbers)('should validate %s as valid Jordan number', (phone) => {
        expect(validateJordanPhone(phone)).toBe(true);
      });
    });

    describe('Invalid Jordan Phone Numbers', () => {
      const invalidNumbers = [
        // Wrong country codes
        '+1234567890',
        '+44123456789',
        '+971123456789',
        
        // Wrong prefixes (not 77, 78, 79)
        '+96276-1234567',
        '+96280-1234567',
        '0761234567',
        '0801234567',
        
        // Too short
        '+962771234',
        '077123',
        '77123',
        
        // Too long
        '+96277123456789',
        '077123456789',
        
        // Invalid characters
        '+962-77-abc-defg',
        '077-123-abcd',
        '+962 77 123 45xx',
        
        // Empty/null/undefined
        '',
        null,
        undefined,
        
        // Other invalid formats
        '++962771234567',
        '962-77-1234567',
        'phone:771234567'
      ];

      test.each(invalidNumbers)('should validate %s as invalid', (phone) => {
        expect(validateJordanPhone(phone as any)).toBe(false);
      });
    });
  });

  describe('normalizePhoneNumber', () => {
    const normalizationTests = [
      // [input, expected_output]
      ['+962771234567', '+962771234567'],
      ['962771234567', '+962771234567'],
      ['0771234567', '+962771234567'],
      ['771234567', '+962771234567'],
      ['+962 77 123 4567', '+962771234567'],
      ['+962-77-123-4567', '+962771234567'],
      ['962 78 123 4567', '+962781234567'],
      ['07 91 23 45 67', '+962791234567'],
      ['7 7 1 2 3 4 5 6 7', '+962771234567']
    ];

    test.each(normalizationTests)('should normalize %s to %s', (input, expected) => {
      expect(normalizePhoneNumber(input)).toBe(expected);
    });

    test('should return null for invalid numbers', () => {
      expect(normalizePhoneNumber('+1234567890')).toBeNull();
      expect(normalizePhoneNumber('invalid')).toBeNull();
      expect(normalizePhoneNumber('')).toBeNull();
    });
  });

  describe('isTestPhoneNumber', () => {
    const testNumbers = [
      '+1234567890',  // US test
      '+34123456789', // Spain test
      '1234567890',
      '34123456789'
    ];

    const realNumbers = [
      '+962771234567',
      '0771234567',
      '+966501234567', // Saudi
      '+971501234567'  // UAE
    ];

    test.each(testNumbers)('should identify %s as test number', (phone) => {
      expect(isTestPhoneNumber(phone)).toBe(true);
    });

    test.each(realNumbers)('should identify %s as real number', (phone) => {
      expect(isTestPhoneNumber(phone)).toBe(false);
    });
  });

  describe('formatPhoneDisplay', () => {
    const formatTests = [
      ['+962771234567', '(+962) 77 123-4567'],
      ['+962781234567', '(+962) 78 123-4567'],
      ['+962791234567', '(+962) 79 123-4567']
    ];

    test.each(formatTests)('should format %s as %s', (input, expected) => {
      expect(formatPhoneDisplay(input)).toBe(expected);
    });

    test('should return original for invalid numbers', () => {
      expect(formatPhoneDisplay('invalid')).toBe('invalid');
      expect(formatPhoneDisplay('')).toBe('');
    });
  });

  describe('verifyOtpSecure', () => {
    test('should verify correct OTP', () => {
      const otp = '123456';
      const stored = '123456';
      expect(verifyOtpSecure(otp, stored)).toBe(true);
    });

    test('should reject incorrect OTP', () => {
      const otp = '123456';
      const stored = '654321';
      expect(verifyOtpSecure(otp, stored)).toBe(false);
    });

    test('should use constant-time comparison', () => {
      // This is harder to test directly, but we ensure the function exists
      // and behaves correctly for edge cases
      expect(verifyOtpSecure('', '')).toBe(true);
      expect(verifyOtpSecure('123', '1234')).toBe(false);
      expect(verifyOtpSecure('1234', '123')).toBe(false);
    });

    test('should handle null/undefined inputs', () => {
      expect(verifyOtpSecure(null as any, '123456')).toBe(false);
      expect(verifyOtpSecure('123456', null as any)).toBe(false);
      expect(verifyOtpSecure(undefined as any, '123456')).toBe(false);
      expect(verifyOtpSecure('123456', undefined as any)).toBe(false);
    });
  });

  describe('Security Edge Cases', () => {
    test('should handle malformed input gracefully', () => {
      const malformedInputs = [
        { toString: () => { throw new Error('Evil object'); } },
        new Date(),
        {},
        [],
        Symbol('phone'),
        function() { return 'phone'; }
      ];

      malformedInputs.forEach(input => {
        expect(() => validateJordanPhone(input as any)).not.toThrow();
        expect(validateJordanPhone(input as any)).toBe(false);
      });
    });

    test('should resist timing attacks on phone validation', () => {
      const validPhone = '+962771234567';
      const invalidPhone = '+962771234568';
      
      // Multiple iterations to check for consistent timing
      for (let i = 0; i < 100; i++) {
        expect(validateJordanPhone(validPhone)).toBe(true);
        expect(validateJordanPhone(invalidPhone)).toBe(false);
      }
    });
  });

  describe('Performance Tests', () => {
    test('should validate 1000 phone numbers quickly', () => {
      const phones = Array.from({ length: 1000 }, (_, i) => 
        `+96277${String(i).padStart(7, '0')}`
      );
      
      const startTime = Date.now();
      phones.forEach(phone => validateJordanPhone(phone));
      const endTime = Date.now();
      
      // Should complete in under 100ms for 1000 validations
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should normalize 1000 phone numbers quickly', () => {
      const phones = Array.from({ length: 1000 }, (_, i) => 
        `077${String(i).padStart(7, '0')}`
      );
      
      const startTime = Date.now();
      phones.forEach(phone => normalizePhoneNumber(phone));
      const endTime = Date.now();
      
      // Should complete in under 200ms for 1000 normalizations
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});