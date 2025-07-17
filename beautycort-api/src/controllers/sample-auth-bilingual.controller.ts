/**
 * Sample Authentication Controller with Bilingual Error Support
 * Demonstrates how to implement bilingual error handling in controllers
 */

import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { RequestWithLanguage } from '../middleware/language-detection.middleware';
import { 
  BilingualAppError, 
  throwBilingualError, 
  asyncErrorHandler 
} from '../middleware/enhanced-bilingual-error.middleware';

// Mock services - replace with actual implementations
const mockAuthService = {
  async sendOTP(phone: string): Promise<{ success: boolean; message?: string }> {
    // Mock SMS service call
    if (phone === '+962771234567') {
      return { success: true };
    }
    return { success: false, message: 'SMS service error' };
  },
  
  async verifyOTP(phone: string, otp: string): Promise<{ success: boolean; token?: string }> {
    // Mock OTP verification
    if (otp === '123456') {
      return { success: true, token: 'mock-jwt-token' };
    }
    return { success: false };
  },
  
  async findUserByPhone(phone: string): Promise<{ id: string; phone: string } | null> {
    // Mock user lookup
    if (phone === '+962771234567') {
      return { id: '1', phone };
    }
    return null;
  }
};

// Validation rules for phone number
export const phoneValidationRules = [
  body('phone')
    .notEmpty()
    .withMessage('PHONE_REQUIRED')
    .matches(/^\+9627[789]\d{7}$/)
    .withMessage('INVALID_PHONE_FORMAT')
    .custom(async (phone) => {
      // Check if phone already exists (for registration)
      const existingUser = await mockAuthService.findUserByPhone(phone);
      if (existingUser) {
        throw new Error('PHONE_ALREADY_EXISTS');
      }
      return true;
    })
];

// Validation rules for OTP
export const otpValidationRules = [
  body('phone')
    .notEmpty()
    .withMessage('PHONE_REQUIRED')
    .matches(/^\+9627[789]\d{7}$/)
    .withMessage('INVALID_PHONE_FORMAT'),
  body('otp')
    .notEmpty()
    .withMessage('OTP_REQUIRED')
    .isLength({ min: 6, max: 6 })
    .withMessage('INVALID_OTP')
    .isNumeric()
    .withMessage('INVALID_OTP')
];

/**
 * Send OTP to phone number
 */
export const sendOTP = asyncErrorHandler(async (
  req: RequestWithLanguage,
  res: Response,
  next: NextFunction
) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errors.array());
  }

  const { phone } = req.body;

  try {
    // Call SMS service
    const result = await mockAuthService.sendOTP(phone);
    
    if (!result.success) {
      throwBilingualError('OTP_SEND_FAILED', 500);
    }

    // Success response with bilingual messages
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      messageAr: 'تم إرسال رمز التحقق بنجاح',
      data: {
        phone,
        expiresIn: 300, // 5 minutes
        language: req.language,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    // Handle SMS service errors
    if (error instanceof Error && error.message.includes('SMS service')) {
      throwBilingualError('SMS_SERVICE_ERROR', 503);
    }
    
    // Re-throw other errors
    throw error;
  }
});

/**
 * Verify OTP and authenticate user
 */
export const verifyOTP = asyncErrorHandler(async (
  req: RequestWithLanguage,
  res: Response,
  next: NextFunction
) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errors.array());
  }

  const { phone, otp } = req.body;

  try {
    // Verify OTP
    const result = await mockAuthService.verifyOTP(phone, otp);
    
    if (!result.success) {
      throwBilingualError('INVALID_OTP', 400);
    }

    // Get user information
    const user = await mockAuthService.findUserByPhone(phone);
    if (!user) {
      throwBilingualError('USER_NOT_FOUND', 404);
    }

    // Success response with bilingual messages
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      messageAr: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          id: user.id,
          phone: user.phone
        },
        token: result.token,
        expiresIn: 3600 * 24 * 7, // 7 days
        language: req.language,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    // Handle specific OTP errors
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throwBilingualError('OTP_EXPIRED', 400);
      }
      if (error.message.includes('max attempts')) {
        throwBilingualError('OTP_MAX_ATTEMPTS', 400);
      }
    }
    
    // Re-throw other errors
    throw error;
  }
});

/**
 * Get user profile (authenticated endpoint)
 */
export const getProfile = asyncErrorHandler(async (
  req: RequestWithLanguage,
  res: Response,
  next: NextFunction
) => {
  // Check for authentication token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throwBilingualError('TOKEN_REQUIRED', 401);
  }

  const token = authHeader.substring(7);
  
  // Mock token validation
  if (token !== 'mock-jwt-token') {
    throwBilingualError('TOKEN_INVALID', 401);
  }

  // Mock user data
  const user = {
    id: '1',
    phone: '+962771234567',
    name: 'أحمد محمد',
    nameEn: 'Ahmad Mohammad',
    email: 'ahmad@example.com',
    userType: 'customer',
    isVerified: true,
    createdAt: new Date().toISOString(),
    language: req.language
  };

  // Success response with bilingual messages
  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    messageAr: 'تم جلب الملف الشخصي بنجاح',
    data: {
      user,
      language: req.language,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Update language preference
 */
export const updateLanguage = asyncErrorHandler(async (
  req: RequestWithLanguage,
  res: Response,
  next: NextFunction
) => {
  const { language } = req.body;

  // Validate language
  if (!language || !['ar', 'en'].includes(language)) {
    throwBilingualError('INVALID_INPUT', 400, {
      en: 'Invalid language. Must be "ar" or "en"',
      ar: 'اللغة غير صحيحة. يجب أن تكون "ar" أو "en"'
    });
  }

  // Check for authentication token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throwBilingualError('TOKEN_REQUIRED', 401);
  }

  // Mock language update
  const updatedUser = {
    id: '1',
    phone: '+962771234567',
    language: language,
    updatedAt: new Date().toISOString()
  };

  // Success response with bilingual messages
  res.status(200).json({
    success: true,
    message: 'Language preference updated successfully',
    messageAr: 'تم تحديث تفضيل اللغة بنجاح',
    data: {
      user: updatedUser,
      language: language,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Error handling examples for different scenarios
 */
export const errorExamples = {
  // Phone validation error
  invalidPhone: () => {
    throwBilingualError('INVALID_PHONE_FORMAT', 400);
  },

  // OTP validation error
  invalidOTP: () => {
    throwBilingualError('INVALID_OTP', 400);
  },

  // Token validation error
  expiredToken: () => {
    throwBilingualError('TOKEN_EXPIRED', 401);
  },

  // Permission error
  insufficientPermissions: () => {
    throwBilingualError('INSUFFICIENT_PERMISSIONS', 403);
  },

  // User not found error
  userNotFound: () => {
    throwBilingualError('USER_NOT_FOUND', 404);
  },

  // Rate limit error
  tooManyRequests: () => {
    throwBilingualError('TOO_MANY_OTP_REQUESTS', 429);
  },

  // System error
  systemError: () => {
    throwBilingualError('INTERNAL_SERVER_ERROR', 500);
  },

  // Custom error with custom message
  customError: () => {
    throwBilingualError('CUSTOM_ERROR', 400, {
      en: 'This is a custom error message',
      ar: 'هذه رسالة خطأ مخصصة'
    });
  }
};

/**
 * Test endpoint to demonstrate error handling
 */
export const testError = asyncErrorHandler(async (
  req: RequestWithLanguage,
  res: Response,
  next: NextFunction
) => {
  const { errorType } = req.params;

  // Call the appropriate error example
  if (errorExamples[errorType as keyof typeof errorExamples]) {
    errorExamples[errorType as keyof typeof errorExamples]();
  } else {
    throwBilingualError('INVALID_INPUT', 400, {
      en: 'Invalid error type',
      ar: 'نوع الخطأ غير صحيح'
    });
  }
});

/**
 * Example of handling multiple validation errors
 */
export const complexValidation = [
  body('name')
    .notEmpty()
    .withMessage('NAME_REQUIRED')
    .isLength({ min: 2, max: 100 })
    .withMessage('NAME_TOO_SHORT'),
  body('email')
    .isEmail()
    .withMessage('INVALID_EMAIL')
    .normalizeEmail(),
  body('phone')
    .matches(/^\+9627[789]\d{7}$/)
    .withMessage('INVALID_PHONE_FORMAT'),
  body('businessName')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('BUSINESS_NAME_TOO_SHORT')
];

export const processComplexValidation = asyncErrorHandler(async (
  req: RequestWithLanguage,
  res: Response,
  next: NextFunction
) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errors.array());
  }

  // Process valid data
  res.status(200).json({
    success: true,
    message: 'Validation passed',
    messageAr: 'تم التحقق من صحة البيانات',
    data: {
      validatedData: req.body,
      language: req.language,
      timestamp: new Date().toISOString()
    }
  });
});

// Export validation rules and controllers
export const authValidation = {
  phoneValidationRules,
  otpValidationRules,
  complexValidation
};

export const authControllers = {
  sendOTP,
  verifyOTP,
  getProfile,
  updateLanguage,
  testError,
  processComplexValidation
};