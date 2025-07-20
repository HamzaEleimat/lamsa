/**
 * Arabic Text Input Validation Utilities
 * Comprehensive validation system for Arabic text input across all forms
 */

import { isRTL } from '../i18n';

// Arabic Unicode ranges and character sets
const ARABIC_UNICODE_RANGES = {
  // Basic Arabic block
  ARABIC_BASIC: /[\u0600-\u06FF]/,
  // Arabic letters only
  ARABIC_LETTERS: /[\u0621-\u064A]/,
  // Arabic digits (Arabic-Indic numerals)
  ARABIC_DIGITS: /[\u0660-\u0669]/,
  // Arabic diacritics and marks
  ARABIC_DIACRITICS: /[\u064B-\u065F]/,
  // Arabic punctuation
  ARABIC_PUNCTUATION: /[\u060C\u061B\u061F\u0640]/,
  // Extended Arabic characters
  ARABIC_EXTENDED: /[\u0750-\u077F]/,
  // Arabic presentation forms
  ARABIC_PRESENTATION_A: /[\uFB50-\uFDFF]/,
  ARABIC_PRESENTATION_B: /[\uFE70-\uFEFF]/
};

// Common Arabic text patterns
const ARABIC_PATTERNS = {
  // Arabic name pattern (letters, spaces, some punctuation)
  NAME: /^[\u0621-\u064A\u0660-\u0669\s\u0640\u002D\u002E]+$/,
  // Arabic business name (more flexible)
  BUSINESS_NAME: /^[\u0621-\u064A\u0660-\u0669\s\u0640\u002D\u002E\u0028\u0029\u0026\u002F]+$/,
  // Arabic description (includes punctuation)
  DESCRIPTION: /^[\u0621-\u064A\u0660-\u0669\s\u0640\u060C\u061B\u061F\u002D\u002E\u0028\u0029\u0021\u003A\u003B\u002F\u0026]+$/,
  // Arabic address
  ADDRESS: /^[\u0621-\u064A\u0660-\u0669\s\u0640\u060C\u061B\u061F\u002D\u002E\u0028\u0029\u002F\u0023]+$/,
  // Arabic notes/comments
  NOTES: /^[\u0621-\u064A\u0660-\u0669\s\u0640\u060C\u061B\u061F\u002D\u002E\u0028\u0029\u0021\u003A\u003B\u002F\u0026\u0022\u0027\u003F\u0040\u0023]+$/
};

// Arabic text normalization rules
const ARABIC_NORMALIZATION = {
  // Normalize Arabic letters to basic forms
  NORMALIZE_LETTERS: [
    [/[\u0622\u0623\u0625]/g, '\u0627'], // Various Alif forms → Alif
    [/[\u0629]/g, '\u0647'], // Teh Marbuta → Heh
    [/[\u0649]/g, '\u064A'], // Alif Maksura → Yeh
    [/[\u064B-\u065F]/g, ''] // Remove diacritics
  ],
  
  // Normalize spaces and punctuation
  NORMALIZE_SPACES: [
    [/\s+/g, ' '], // Multiple spaces → Single space
    [/^\s+|\s+$/g, ''], // Trim leading/trailing spaces
    [/\u00A0/g, ' '] // Non-breaking space → Regular space
  ],
  
  // Normalize punctuation
  NORMALIZE_PUNCTUATION: [
    [/\u060C/g, ','], // Arabic comma → Latin comma
    [/\u061B/g, ';'], // Arabic semicolon → Latin semicolon
    [/\u061F/g, '?'] // Arabic question mark → Latin question mark
  ]
};

// Arabic text quality checks
const ARABIC_QUALITY_CHECKS = {
  // Check for common Arabic text issues
  MIXED_DIGITS: /[\u0660-\u0669].*[0-9]|[0-9].*[\u0660-\u0669]/,
  MIXED_PUNCTUATION: /[\u060C\u061B\u061F].*[,;?]|[,;?].*[\u060C\u061B\u061F]/,
  REPEATED_CHARACTERS: /(.)\1{3,}/,
  INVALID_SEQUENCES: /[\u0640]{2,}/, // Multiple Tatweel
  ISOLATED_DIACRITICS: /^[\u064B-\u065F]+$|[\u064B-\u065F]{2,}/
};

/**
 * Validate Arabic text input
 */
export const validateArabicText = (
  text: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowMixed?: boolean;
    normalize?: boolean;
    strictArabic?: boolean;
  } = {}
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedText?: string;
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let normalizedText = text;

  // Basic validation
  if (options.required && (!text || text.trim().length === 0)) {
    errors.push('النص مطلوب'); // Text is required
    return { isValid: false, errors, warnings };
  }

  if (!text || text.trim().length === 0) {
    return { isValid: true, errors, warnings, normalizedText: '' };
  }

  // Normalize text if requested
  if (options.normalize) {
    normalizedText = normalizeArabicText(text);
  }

  // Length validation
  if (options.minLength && normalizedText.length < options.minLength) {
    errors.push(`النص يجب أن يكون ${options.minLength} أحرف على الأقل`);
  }

  if (options.maxLength && normalizedText.length > options.maxLength) {
    errors.push(`النص يجب أن لا يتجاوز ${options.maxLength} حرف`);
  }

  // Pattern validation
  if (options.pattern && !options.pattern.test(normalizedText)) {
    errors.push('النص يحتوي على أحرف غير صالحة');
  }

  // Arabic-specific validation
  if (options.strictArabic && !isValidArabicText(normalizedText)) {
    errors.push('النص يجب أن يكون باللغة العربية فقط');
  }

  // Quality checks
  const qualityIssues = checkArabicTextQuality(normalizedText);
  warnings.push(...qualityIssues);

  // Mixed content validation
  if (!options.allowMixed && hasMixedContent(normalizedText)) {
    warnings.push('النص يحتوي على خليط من اللغات');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedText
  };
};

/**
 * Check if text contains valid Arabic characters
 */
export const isValidArabicText = (text: string): boolean => {
  if (!text || text.trim().length === 0) return true;
  
  // Allow Arabic letters, digits, spaces, and basic punctuation
  const allowedPattern = /^[\u0621-\u064A\u0660-\u0669\s\u0640\u060C\u061B\u061F\u002D\u002E\u0028\u0029\u0021\u003A\u003B\u002F\u0026\u0022\u0027\u003F\u0040\u0023]+$/;
  return allowedPattern.test(text);
};

/**
 * Check if text contains mixed content (Arabic + other languages)
 */
export const hasMixedContent = (text: string): boolean => {
  const hasArabic = ARABIC_UNICODE_RANGES.ARABIC_LETTERS.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  const hasOther = /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text); // Chinese/Japanese
  
  return hasArabic && (hasLatin || hasCyrillic || hasOther);
};

/**
 * Check for Arabic text quality issues
 */
export const checkArabicTextQuality = (text: string): string[] => {
  const issues: string[] = [];
  
  if (ARABIC_QUALITY_CHECKS.MIXED_DIGITS.test(text)) {
    issues.push('يحتوي النص على خليط من الأرقام العربية والإنجليزية');
  }
  
  if (ARABIC_QUALITY_CHECKS.MIXED_PUNCTUATION.test(text)) {
    issues.push('يحتوي النص على خليط من علامات الترقيم العربية والإنجليزية');
  }
  
  if (ARABIC_QUALITY_CHECKS.REPEATED_CHARACTERS.test(text)) {
    issues.push('يحتوي النص على أحرف متكررة بشكل مفرط');
  }
  
  if (ARABIC_QUALITY_CHECKS.INVALID_SEQUENCES.test(text)) {
    issues.push('يحتوي النص على تسلسلات غير صالحة من الأحرف');
  }
  
  if (ARABIC_QUALITY_CHECKS.ISOLATED_DIACRITICS.test(text)) {
    issues.push('يحتوي النص على تشكيل منفصل عن الأحرف');
  }
  
  return issues;
};

/**
 * Normalize Arabic text for consistent processing
 */
export const normalizeArabicText = (text: string): string => {
  let normalized = text;
  
  // Apply letter normalization
  ARABIC_NORMALIZATION.NORMALIZE_LETTERS.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });
  
  // Apply space normalization
  ARABIC_NORMALIZATION.NORMALIZE_SPACES.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });
  
  // Apply punctuation normalization
  ARABIC_NORMALIZATION.NORMALIZE_PUNCTUATION.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });
  
  return normalized;
};

/**
 * Validate Arabic name input
 */
export const validateArabicName = (name: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  return validateArabicText(name, {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: ARABIC_PATTERNS.NAME,
    normalize: true,
    strictArabic: true
  });
};

/**
 * Validate Arabic business name input
 */
export const validateArabicBusinessName = (name: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  return validateArabicText(name, {
    required: true,
    minLength: 3,
    maxLength: 255,
    pattern: ARABIC_PATTERNS.BUSINESS_NAME,
    normalize: true,
    allowMixed: true // Business names can have mixed content
  });
};

/**
 * Validate Arabic description input
 */
export const validateArabicDescription = (description: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  return validateArabicText(description, {
    required: false,
    minLength: 10,
    maxLength: 1000,
    pattern: ARABIC_PATTERNS.DESCRIPTION,
    normalize: true,
    allowMixed: true
  });
};

/**
 * Validate Arabic address input
 */
export const validateArabicAddress = (address: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  return validateArabicText(address, {
    required: true,
    minLength: 5,
    maxLength: 500,
    pattern: ARABIC_PATTERNS.ADDRESS,
    normalize: true,
    allowMixed: true
  });
};

/**
 * Validate Arabic notes/comments input
 */
export const validateArabicNotes = (notes: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  return validateArabicText(notes, {
    required: false,
    minLength: 0,
    maxLength: 2000,
    pattern: ARABIC_PATTERNS.NOTES,
    normalize: true,
    allowMixed: true
  });
};

/**
 * Convert Arabic text to search-friendly format
 */
export const prepareArabicSearchText = (text: string): string => {
  let searchText = normalizeArabicText(text);
  
  // Remove diacritics for better search
  searchText = searchText.replace(/[\u064B-\u065F]/g, '');
  
  // Convert to lowercase equivalent
  searchText = searchText.toLowerCase();
  
  return searchText;
};

/**
 * Check if text direction should be RTL
 */
export const shouldUseRTL = (text: string): boolean => {
  if (!text || text.trim().length === 0) return isRTL();
  
  // Count Arabic vs Latin characters
  const arabicChars = (text.match(ARABIC_UNICODE_RANGES.ARABIC_LETTERS) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  // If more than 50% Arabic characters, use RTL
  return arabicChars > latinChars;
};

/**
 * Get text input direction based on content
 */
export const getTextDirection = (text: string): 'ltr' | 'rtl' => {
  return shouldUseRTL(text) ? 'rtl' : 'ltr';
};

/**
 * Validate Arabic phone number input
 */
export const validateArabicPhoneNumber = (phone: string): {
  isValid: boolean;
  errors: string[];
  formattedPhone: string;
} => {
  const errors: string[] = [];
  
  if (!phone || phone.trim().length === 0) {
    errors.push('رقم الهاتف مطلوب');
    return { isValid: false, errors, formattedPhone: '' };
  }
  
  // Convert Arabic numerals to Western for validation
  const westernPhone = phone.replace(/[\u0660-\u0669]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x0660 + 0x0030);
  });
  
  // Jordan phone number validation
  const jordanPhonePattern = /^(\+962|962|0)?(7[789])\d{7}$/;
  const cleanPhone = westernPhone.replace(/[\s\-\(\)]/g, '');
  
  if (!jordanPhonePattern.test(cleanPhone)) {
    errors.push('رقم الهاتف غير صالح (يجب أن يبدأ بـ 77 أو 78 أو 79)');
    return { isValid: false, errors, formattedPhone: phone };
  }
  
  // Format the phone number
  const match = cleanPhone.match(/^(?:\+962|962|0)?(7[789])(\d{3})(\d{4})$/);
  if (match) {
    const [, prefix, middle, end] = match;
    const formattedPhone = `+962 ${prefix} ${middle} ${end}`;
    return { isValid: true, errors: [], formattedPhone };
  }
  
  return { isValid: false, errors: ['تعذر تنسيق رقم الهاتف'], formattedPhone: phone };
};

/**
 * Validate Arabic email input (supporting Arabic domains)
 */
export const validateArabicEmail = (email: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!email || email.trim().length === 0) {
    errors.push('البريد الإلكتروني مطلوب');
    return { isValid: false, errors };
  }
  
  // Basic email pattern that supports international domains
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(email)) {
    errors.push('البريد الإلكتروني غير صالح');
    return { isValid: false, errors };
  }
  
  // Check for Arabic characters in local part (before @)
  const [localPart, domain] = email.split('@');
  
  if (ARABIC_UNICODE_RANGES.ARABIC_BASIC.test(localPart)) {
    errors.push('الجزء المحلي من البريد الإلكتروني لا يمكن أن يحتوي على أحرف عربية');
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: [] };
};

/**
 * Real-time Arabic text validation for input fields
 */
export const createArabicInputValidator = (
  validationOptions: {
    type: 'name' | 'businessName' | 'description' | 'address' | 'notes' | 'phone' | 'email' | 'custom';
    customPattern?: RegExp;
    customOptions?: Parameters<typeof validateArabicText>[1];
  }
) => {
  return (text: string) => {
    switch (validationOptions.type) {
      case 'name':
        return validateArabicName(text);
      case 'businessName':
        return validateArabicBusinessName(text);
      case 'description':
        return validateArabicDescription(text);
      case 'address':
        return validateArabicAddress(text);
      case 'notes':
        return validateArabicNotes(text);
      case 'phone':
        return validateArabicPhoneNumber(text);
      case 'email':
        return validateArabicEmail(text);
      case 'custom':
        return validateArabicText(text, validationOptions.customOptions);
      default:
        return validateArabicText(text);
    }
  };
};

/**
 * Arabic text input utilities
 */
export const ArabicInputUtils = {
  // Validation functions
  validateText: validateArabicText,
  validateName: validateArabicName,
  validateBusinessName: validateArabicBusinessName,
  validateDescription: validateArabicDescription,
  validateAddress: validateArabicAddress,
  validateNotes: validateArabicNotes,
  validatePhoneNumber: validateArabicPhoneNumber,
  validateEmail: validateArabicEmail,
  
  // Text processing functions
  normalizeText: normalizeArabicText,
  prepareSearchText: prepareArabicSearchText,
  checkTextQuality: checkArabicTextQuality,
  
  // Direction and layout functions
  shouldUseRTL,
  getTextDirection,
  
  // Validation helper
  createValidator: createArabicInputValidator,
  
  // Constants
  PATTERNS: ARABIC_PATTERNS,
  UNICODE_RANGES: ARABIC_UNICODE_RANGES
};

export default ArabicInputUtils;