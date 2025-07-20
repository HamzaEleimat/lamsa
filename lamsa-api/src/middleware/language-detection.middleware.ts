/**
 * Language Detection Middleware
 * Detects user's preferred language from various sources
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Supported languages
export type SupportedLanguage = 'ar' | 'en';

// Default language for Jordan market
const DEFAULT_LANGUAGE: SupportedLanguage = 'ar';

// Extended Request interface with language
export interface RequestWithLanguage extends Request {
  language: SupportedLanguage;
  isRTL: boolean;
}

// JWT token interface
interface JWTPayload {
  userId: string;
  userType: string;
  language?: SupportedLanguage;
}

/**
 * Language detection middleware
 * Detects user's preferred language from multiple sources in order of priority:
 * 1. JWT token language preference
 * 2. Accept-Language header
 * 3. Query parameter 'lang'
 * 4. Default to Arabic for Jordan market
 */
export const languageDetectionMiddleware = (
  req: RequestWithLanguage,
  res: Response,
  next: NextFunction
): void => {
  let detectedLanguage: SupportedLanguage = DEFAULT_LANGUAGE;

  try {
    // 1. Check JWT token for language preference (highest priority)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        if (decoded.language && isValidLanguage(decoded.language)) {
          detectedLanguage = decoded.language;
        }
      } catch (error) {
        // Token invalid or expired, continue with other detection methods
      }
    }

    // 2. Check Accept-Language header if no language in token
    if (detectedLanguage === DEFAULT_LANGUAGE) {
      const acceptLanguage = req.headers['accept-language'];
      if (acceptLanguage) {
        const preferredLanguage = parseAcceptLanguage(acceptLanguage);
        if (preferredLanguage) {
          detectedLanguage = preferredLanguage;
        }
      }
    }

    // 3. Check query parameter 'lang' (lowest priority)
    if (detectedLanguage === DEFAULT_LANGUAGE) {
      const langParam = req.query.lang as string;
      if (langParam && isValidLanguage(langParam)) {
        detectedLanguage = langParam as SupportedLanguage;
      }
    }

  } catch (error) {
    console.error('Language detection error:', error);
    // Fall back to default language
    detectedLanguage = DEFAULT_LANGUAGE;
  }

  // Set language and RTL flag on request
  req.language = detectedLanguage;
  req.isRTL = detectedLanguage === 'ar';

  // Set response headers for client-side language detection
  res.setHeader('Content-Language', detectedLanguage);
  res.setHeader('X-Language-Detected', detectedLanguage);
  res.setHeader('X-RTL', req.isRTL.toString());

  next();
};

/**
 * Validates if a language code is supported
 */
function isValidLanguage(lang: string): boolean {
  return ['ar', 'en'].includes(lang);
}

/**
 * Parses Accept-Language header to extract preferred language
 * Format: "en-US,en;q=0.9,ar;q=0.8,ar-JO;q=0.7"
 */
function parseAcceptLanguage(acceptLanguage: string): SupportedLanguage | null {
  try {
    // Split by comma and process each language preference
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const parts = lang.trim().split(';');
        const code = parts[0].trim();
        const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
        return { code, quality };
      })
      .sort((a, b) => b.quality - a.quality); // Sort by quality (preference)

    // Check each language in order of preference
    for (const lang of languages) {
      // Check for exact match
      if (lang.code === 'ar' || lang.code === 'ar-JO') {
        return 'ar';
      }
      if (lang.code === 'en' || lang.code.startsWith('en-')) {
        return 'en';
      }
      
      // Check for language prefix (e.g., "ar-JO" -> "ar")
      const langPrefix = lang.code.split('-')[0];
      if (langPrefix === 'ar') {
        return 'ar';
      }
      if (langPrefix === 'en') {
        return 'en';
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing Accept-Language header:', error);
    return null;
  }
}

/**
 * Utility function to get language from request
 */
export function getLanguageFromRequest(req: Request): SupportedLanguage {
  return (req as RequestWithLanguage).language || DEFAULT_LANGUAGE;
}

/**
 * Utility function to check if request is RTL
 */
export function isRTLRequest(req: Request): boolean {
  return (req as RequestWithLanguage).isRTL || false;
}

/**
 * Middleware to force a specific language (for testing)
 */
export const forceLanguageMiddleware = (language: SupportedLanguage) => {
  return (req: RequestWithLanguage, res: Response, next: NextFunction): void => {
    req.language = language;
    req.isRTL = language === 'ar';
    res.setHeader('Content-Language', language);
    res.setHeader('X-Language-Detected', language);
    res.setHeader('X-RTL', req.isRTL.toString());
    next();
  };
};

/**
 * Utility function to format response with language metadata
 */
export function formatResponseWithLanguage(
  req: Request,
  data: any,
  language?: SupportedLanguage
): any {
  const requestLanguage = language || getLanguageFromRequest(req);
  const isRTL = requestLanguage === 'ar';

  return {
    ...data,
    meta: {
      language: requestLanguage,
      isRTL,
      timestamp: new Date().toISOString(),
      ...data.meta
    }
  };
}

/**
 * Language preference validation for user profiles
 */
export function validateLanguagePreference(language: any): SupportedLanguage {
  if (typeof language === 'string' && isValidLanguage(language)) {
    return language as SupportedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return ['ar', 'en'];
}

/**
 * Get language information for API responses
 */
export function getLanguageInfo(language: SupportedLanguage) {
  const languageInfo = {
    ar: {
      code: 'ar',
      name: 'العربية',
      nameEn: 'Arabic',
      direction: 'rtl',
      locale: 'ar-JO',
      flag: '🇯🇴',
      default: true
    },
    en: {
      code: 'en',
      name: 'English',
      nameEn: 'English',
      direction: 'ltr',
      locale: 'en-US',
      flag: '🇺🇸',
      default: false
    }
  };

  return languageInfo[language];
}

/**
 * Express middleware type for TypeScript support
 */
export type LanguageMiddleware = (
  req: RequestWithLanguage,
  res: Response,
  next: NextFunction
) => void;