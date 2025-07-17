/**
 * Centralized Bilingual Error Messages
 * Comprehensive error message dictionary for Arabic/English support
 */

export interface BilingualMessage {
  en: string;
  ar: string;
}

export interface ErrorMessageData {
  [key: string]: BilingualMessage;
}

// Authentication Error Messages
export const AUTH_ERRORS: ErrorMessageData = {
  // Phone validation errors
  PHONE_REQUIRED: {
    en: 'Phone number is required',
    ar: 'رقم الهاتف مطلوب'
  },
  INVALID_PHONE_FORMAT: {
    en: 'Invalid phone number format. Please use Jordan format: +962 7X XXX XXXX',
    ar: 'رقم الهاتف غير صحيح. يرجى استخدام الرقم الأردني: +962 7X XXX XXXX'
  },
  PHONE_NOT_JORDAN: {
    en: 'Only Jordan phone numbers are supported',
    ar: 'ندعم فقط أرقام الهواتف الأردنية'
  },
  PHONE_ALREADY_EXISTS: {
    en: 'Phone number is already registered',
    ar: 'رقم الهاتف مسجل بالفعل'
  },
  
  // OTP errors
  OTP_REQUIRED: {
    en: 'Verification code is required',
    ar: 'رمز التحقق مطلوب'
  },
  INVALID_OTP: {
    en: 'Invalid verification code',
    ar: 'رمز التحقق غير صحيح'
  },
  OTP_EXPIRED: {
    en: 'Verification code has expired. Please request a new one',
    ar: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد'
  },
  OTP_MAX_ATTEMPTS: {
    en: 'Maximum verification attempts reached. Please request a new code',
    ar: 'تم الوصول للحد الأقصى من محاولات التحقق. يرجى طلب رمز جديد'
  },
  OTP_SEND_FAILED: {
    en: 'Failed to send verification code. Please try again',
    ar: 'فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى'
  },
  
  // Token errors
  TOKEN_REQUIRED: {
    en: 'Authentication token is required',
    ar: 'رمز الدخول مطلوب'
  },
  TOKEN_INVALID: {
    en: 'Invalid authentication token',
    ar: 'رمز الدخول غير صحيح'
  },
  TOKEN_EXPIRED: {
    en: 'Authentication token has expired. Please login again',
    ar: 'انتهت صلاحية رمز الدخول. يرجى تسجيل الدخول مرة أخرى'
  },
  TOKEN_MALFORMED: {
    en: 'Malformed authentication token',
    ar: 'رمز الدخول غير مكتمل'
  },
  
  // Permission errors
  INSUFFICIENT_PERMISSIONS: {
    en: 'You do not have permission to perform this action',
    ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء'
  },
  ACCOUNT_SUSPENDED: {
    en: 'Your account has been suspended. Please contact support',
    ar: 'تم إيقاف حسابك. يرجى التواصل مع الدعم'
  },
  ACCOUNT_NOT_VERIFIED: {
    en: 'Your account is not verified. Please verify your phone number',
    ar: 'حسابك غير مُفعل. يرجى التحقق من رقم هاتفك'
  },
  
  // User type errors
  USER_TYPE_REQUIRED: {
    en: 'User type is required',
    ar: 'نوع المستخدم مطلوب'
  },
  INVALID_USER_TYPE: {
    en: 'Invalid user type. Must be customer or provider',
    ar: 'نوع المستخدم غير صحيح. يجب أن يكون عميل أو مقدم خدمة'
  },
  USER_NOT_FOUND: {
    en: 'User not found',
    ar: 'المستخدم غير موجود'
  }
};

// Rate Limiting Error Messages
export const RATE_LIMIT_ERRORS: ErrorMessageData = {
  TOO_MANY_OTP_REQUESTS: {
    en: 'Too many OTP requests. Please try again after 15 minutes',
    ar: 'تجاوزت عدد طلبات رمز التحقق المسموح. يرجى المحاولة بعد 15 دقيقة'
  },
  TOO_MANY_OTP_ATTEMPTS: {
    en: 'Too many OTP verification attempts. Please try again after 15 minutes',
    ar: 'تجاوزت عدد محاولات التحقق من الرمز المسموح. يرجى المحاولة بعد 15 دقيقة'
  },
  TOO_MANY_AUTH_ATTEMPTS: {
    en: 'Too many authentication attempts. Please try again later',
    ar: 'تجاوزت عدد محاولات تسجيل الدخول المسموح. يرجى المحاولة لاحقاً'
  },
  TOO_MANY_REQUESTS: {
    en: 'Too many requests from this IP. Please try again later',
    ar: 'تجاوزت عدد الطلبات المسموح من هذا العنوان. يرجى المحاولة لاحقاً'
  },
  TOO_MANY_SEARCH_REQUESTS: {
    en: 'Too many search requests. Please slow down',
    ar: 'تجاوزت عدد طلبات البحث المسموح. يرجى التقليل من السرعة'
  },
  RATE_LIMIT_EXCEEDED: {
    en: 'Rate limit exceeded. Please try again later',
    ar: 'تجاوزت الحد المسموح. يرجى المحاولة لاحقاً'
  }
};

// Validation Error Messages
export const VALIDATION_ERRORS: ErrorMessageData = {
  // General validation
  FIELD_REQUIRED: {
    en: 'This field is required',
    ar: 'هذا الحقل مطلوب'
  },
  INVALID_INPUT: {
    en: 'Invalid input provided',
    ar: 'المدخل غير صحيح'
  },
  INPUT_TOO_SHORT: {
    en: 'Input is too short',
    ar: 'المدخل قصير جداً'
  },
  INPUT_TOO_LONG: {
    en: 'Input is too long',
    ar: 'المدخل طويل جداً'
  },
  INVALID_FORMAT: {
    en: 'Invalid format',
    ar: 'التنسيق غير صحيح'
  },
  INVALID_CHARACTERS: {
    en: 'Contains invalid characters',
    ar: 'يحتوي على أحرف غير مسموحة'
  },
  
  // Name validation
  NAME_REQUIRED: {
    en: 'Name is required',
    ar: 'الاسم مطلوب'
  },
  NAME_TOO_SHORT: {
    en: 'Name must be at least 2 characters',
    ar: 'الاسم يجب أن يكون حرفين على الأقل'
  },
  NAME_TOO_LONG: {
    en: 'Name must be no more than 100 characters',
    ar: 'الاسم يجب ألا يتجاوز 100 حرف'
  },
  INVALID_NAME_FORMAT: {
    en: 'Name contains invalid characters',
    ar: 'الاسم يحتوي على أحرف غير مسموحة'
  },
  
  // Business name validation
  BUSINESS_NAME_REQUIRED: {
    en: 'Business name is required',
    ar: 'اسم العمل مطلوب'
  },
  BUSINESS_NAME_EXISTS: {
    en: 'Business name already exists',
    ar: 'اسم العمل موجود بالفعل'
  },
  BUSINESS_NAME_TOO_SHORT: {
    en: 'Business name must be at least 3 characters',
    ar: 'اسم العمل يجب أن يكون 3 أحرف على الأقل'
  },
  BUSINESS_NAME_TOO_LONG: {
    en: 'Business name must be no more than 100 characters',
    ar: 'اسم العمل يجب ألا يتجاوز 100 حرف'
  },
  
  // Email validation
  EMAIL_REQUIRED: {
    en: 'Email is required',
    ar: 'البريد الإلكتروني مطلوب'
  },
  INVALID_EMAIL: {
    en: 'Invalid email format',
    ar: 'تنسيق البريد الإلكتروني غير صحيح'
  },
  EMAIL_ALREADY_EXISTS: {
    en: 'Email already registered',
    ar: 'البريد الإلكتروني مسجل بالفعل'
  },
  
  // Description validation
  DESCRIPTION_TOO_SHORT: {
    en: 'Description must be at least 10 characters',
    ar: 'الوصف يجب أن يكون 10 أحرف على الأقل'
  },
  DESCRIPTION_TOO_LONG: {
    en: 'Description must be no more than 1000 characters',
    ar: 'الوصف يجب ألا يتجاوز 1000 حرف'
  },
  
  // Address validation
  ADDRESS_REQUIRED: {
    en: 'Address is required',
    ar: 'العنوان مطلوب'
  },
  INVALID_ADDRESS: {
    en: 'Invalid address format',
    ar: 'تنسيق العنوان غير صحيح'
  },
  
  // Location validation
  LOCATION_REQUIRED: {
    en: 'Location is required',
    ar: 'الموقع مطلوب'
  },
  INVALID_COORDINATES: {
    en: 'Invalid coordinates provided',
    ar: 'الإحداثيات غير صحيحة'
  },
  LOCATION_OUT_OF_BOUNDS: {
    en: 'Location is outside service area',
    ar: 'الموقع خارج منطقة الخدمة'
  }
};

// Booking Error Messages
export const BOOKING_ERRORS: ErrorMessageData = {
  BOOKING_NOT_FOUND: {
    en: 'Booking not found',
    ar: 'الحجز غير موجود'
  },
  BOOKING_ALREADY_CONFIRMED: {
    en: 'Booking is already confirmed',
    ar: 'الحجز مؤكد بالفعل'
  },
  BOOKING_ALREADY_CANCELLED: {
    en: 'Booking is already cancelled',
    ar: 'الحجز ملغي بالفعل'
  },
  BOOKING_CANNOT_CANCEL: {
    en: 'Cannot cancel booking. Cancellation period has expired',
    ar: 'لا يمكن إلغاء الحجز. انتهت فترة الإلغاء المسموحة'
  },
  BOOKING_CONFLICT: {
    en: 'Time slot is already booked',
    ar: 'الوقت محجوز بالفعل'
  },
  BOOKING_INVALID_DATE: {
    en: 'Invalid booking date',
    ar: 'تاريخ الحجز غير صحيح'
  },
  BOOKING_INVALID_TIME: {
    en: 'Invalid booking time',
    ar: 'وقت الحجز غير صحيح'
  },
  BOOKING_OUTSIDE_HOURS: {
    en: 'Booking time is outside working hours',
    ar: 'وقت الحجز خارج ساعات العمل'
  },
  BOOKING_TOO_ADVANCE: {
    en: 'Cannot book more than 90 days in advance',
    ar: 'لا يمكن الحجز أكثر من 90 يوم مسبقاً'
  },
  BOOKING_TOO_LATE: {
    en: 'Cannot book less than 2 hours in advance',
    ar: 'لا يمكن الحجز أقل من ساعتين مسبقاً'
  },
  BOOKING_PAYMENT_REQUIRED: {
    en: 'Payment is required for bookings over 100 JOD',
    ar: 'الدفع مطلوب للحجوزات التي تزيد عن 100 دينار'
  },
  BOOKING_PROVIDER_UNAVAILABLE: {
    en: 'Provider is not available at this time',
    ar: 'مقدم الخدمة غير متاح في هذا الوقت'
  },
  BOOKING_SERVICE_UNAVAILABLE: {
    en: 'Service is not available',
    ar: 'الخدمة غير متوفرة'
  },
  BOOKING_INSUFFICIENT_PERMISSIONS: {
    en: 'You do not have permission to modify this booking',
    ar: 'ليس لديك صلاحية لتعديل هذا الحجز'
  }
};

// Provider Error Messages
export const PROVIDER_ERRORS: ErrorMessageData = {
  PROVIDER_NOT_FOUND: {
    en: 'Provider not found',
    ar: 'مقدم الخدمة غير موجود'
  },
  PROVIDER_NOT_ACTIVE: {
    en: 'Provider account is not active',
    ar: 'حساب مقدم الخدمة غير نشط'
  },
  PROVIDER_ALREADY_EXISTS: {
    en: 'Provider already exists',
    ar: 'مقدم الخدمة موجود بالفعل'
  },
  PROVIDER_PROFILE_INCOMPLETE: {
    en: 'Provider profile is incomplete. Please complete all required fields',
    ar: 'ملف مقدم الخدمة غير مكتمل. يرجى إكمال جميع الحقول المطلوبة'
  },
  PROVIDER_DOCUMENTS_REQUIRED: {
    en: 'Required documents are missing',
    ar: 'المستندات المطلوبة مفقودة'
  },
  PROVIDER_VERIFICATION_PENDING: {
    en: 'Provider verification is pending',
    ar: 'التحقق من مقدم الخدمة قيد الانتظار'
  },
  PROVIDER_VERIFICATION_FAILED: {
    en: 'Provider verification failed',
    ar: 'فشل التحقق من مقدم الخدمة'
  },
  PROVIDER_SUSPENDED: {
    en: 'Provider account is suspended',
    ar: 'حساب مقدم الخدمة موقوف'
  }
};

// Service Error Messages
export const SERVICE_ERRORS: ErrorMessageData = {
  SERVICE_NOT_FOUND: {
    en: 'Service not found',
    ar: 'الخدمة غير موجودة'
  },
  SERVICE_NOT_AVAILABLE: {
    en: 'Service is not available',
    ar: 'الخدمة غير متوفرة'
  },
  SERVICE_ALREADY_EXISTS: {
    en: 'Service already exists',
    ar: 'الخدمة موجودة بالفعل'
  },
  SERVICE_INVALID_PRICE: {
    en: 'Invalid service price. Must be between 1 and 1000 JOD',
    ar: 'سعر الخدمة غير صحيح. يجب أن يكون بين 1 و 1000 دينار'
  },
  SERVICE_INVALID_DURATION: {
    en: 'Invalid service duration. Must be between 15 and 480 minutes',
    ar: 'مدة الخدمة غير صحيحة. يجب أن تكون بين 15 و 480 دقيقة'
  },
  SERVICE_CATEGORY_REQUIRED: {
    en: 'Service category is required',
    ar: 'فئة الخدمة مطلوبة'
  },
  SERVICE_INVALID_CATEGORY: {
    en: 'Invalid service category',
    ar: 'فئة الخدمة غير صحيحة'
  }
};

// Payment Error Messages
export const PAYMENT_ERRORS: ErrorMessageData = {
  PAYMENT_REQUIRED: {
    en: 'Payment is required',
    ar: 'الدفع مطلوب'
  },
  PAYMENT_FAILED: {
    en: 'Payment failed. Please try again',
    ar: 'فشل الدفع. يرجى المحاولة مرة أخرى'
  },
  PAYMENT_CANCELLED: {
    en: 'Payment was cancelled',
    ar: 'تم إلغاء الدفع'
  },
  PAYMENT_ALREADY_PROCESSED: {
    en: 'Payment has already been processed',
    ar: 'تم معالجة الدفع بالفعل'
  },
  PAYMENT_INVALID_AMOUNT: {
    en: 'Invalid payment amount',
    ar: 'مبلغ الدفع غير صحيح'
  },
  PAYMENT_METHOD_REQUIRED: {
    en: 'Payment method is required',
    ar: 'طريقة الدفع مطلوبة'
  },
  PAYMENT_METHOD_INVALID: {
    en: 'Invalid payment method',
    ar: 'طريقة الدفع غير صحيحة'
  },
  PAYMENT_INSUFFICIENT_FUNDS: {
    en: 'Insufficient funds',
    ar: 'الرصيد غير كافي'
  },
  PAYMENT_CARD_DECLINED: {
    en: 'Card was declined',
    ar: 'تم رفض البطاقة'
  },
  PAYMENT_CARD_EXPIRED: {
    en: 'Card has expired',
    ar: 'البطاقة منتهية الصلاحية'
  }
};

// System Error Messages
export const SYSTEM_ERRORS: ErrorMessageData = {
  INTERNAL_SERVER_ERROR: {
    en: 'Internal server error. Please try again later',
    ar: 'خطأ داخلي في الخادم. يرجى المحاولة لاحقاً'
  },
  DATABASE_ERROR: {
    en: 'Database error. Please try again later',
    ar: 'خطأ في قاعدة البيانات. يرجى المحاولة لاحقاً'
  },
  NETWORK_ERROR: {
    en: 'Network error. Please check your connection',
    ar: 'خطأ في الشبكة. يرجى التحقق من اتصالك'
  },
  SERVICE_UNAVAILABLE: {
    en: 'Service temporarily unavailable. Please try again later',
    ar: 'الخدمة غير متوفرة مؤقتاً. يرجى المحاولة لاحقاً'
  },
  MAINTENANCE_MODE: {
    en: 'System is under maintenance. Please try again later',
    ar: 'النظام تحت الصيانة. يرجى المحاولة لاحقاً'
  },
  EXTERNAL_SERVICE_ERROR: {
    en: 'External service error. Please try again later',
    ar: 'خطأ في خدمة خارجية. يرجى المحاولة لاحقاً'
  },
  SMS_SERVICE_ERROR: {
    en: 'SMS service error. Please try again later',
    ar: 'خطأ في خدمة الرسائل النصية. يرجى المحاولة لاحقاً'
  },
  EMAIL_SERVICE_ERROR: {
    en: 'Email service error. Please try again later',
    ar: 'خطأ في خدمة البريد الإلكتروني. يرجى المحاولة لاحقاً'
  }
};

// All error messages combined
export const ALL_ERROR_MESSAGES = {
  ...AUTH_ERRORS,
  ...RATE_LIMIT_ERRORS,
  ...VALIDATION_ERRORS,
  ...BOOKING_ERRORS,
  ...PROVIDER_ERRORS,
  ...SERVICE_ERRORS,
  ...PAYMENT_ERRORS,
  ...SYSTEM_ERRORS
};

// Helper function to get error message
export function getErrorMessage(errorCode: string, language: 'en' | 'ar' = 'en'): string {
  const errorMessage = ALL_ERROR_MESSAGES[errorCode];
  
  if (!errorMessage) {
    return language === 'ar' 
      ? 'خطأ غير معروف' 
      : 'Unknown error';
  }
  
  return errorMessage[language];
}

// Helper function to get bilingual error message
export function getBilingualErrorMessage(errorCode: string): BilingualMessage {
  const errorMessage = ALL_ERROR_MESSAGES[errorCode];
  
  if (!errorMessage) {
    return {
      en: 'Unknown error',
      ar: 'خطأ غير معروف'
    };
  }
  
  return errorMessage;
}

// Helper function to validate all error messages have both languages
export function validateErrorMessages(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  Object.entries(ALL_ERROR_MESSAGES).forEach(([code, message]) => {
    if (!message.en || !message.ar) {
      missing.push(code);
    }
  });
  
  return {
    valid: missing.length === 0,
    missing
  };
}

// Export error codes for type safety
export const ERROR_CODES = Object.keys(ALL_ERROR_MESSAGES) 
export type ErrorCode = typeof ERROR_CODES[number];