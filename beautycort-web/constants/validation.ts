// Validation Rules and Messages

// Field Length Constraints
export const FIELD_LENGTHS = {
  NAME: {
    MIN: 2,
    MAX: 100,
  },
  PASSWORD: {
    MIN: 6,
    MAX: 128,
  },
  PHONE: {
    MIN: 9,
    MAX: 15,
  },
  EMAIL: {
    MAX: 255,
  },
  BUSINESS_NAME: {
    MIN: 3,
    MAX: 255,
  },
  LICENSE_NUMBER: {
    MIN: 5,
    MAX: 50,
  },
  SERVICE_NAME: {
    MIN: 3,
    MAX: 255,
  },
  DESCRIPTION: {
    MIN: 10,
    MAX: 1000,
  },
  REVIEW_COMMENT: {
    MIN: 10,
    MAX: 500,
  },
  BOOKING_NOTES: {
    MAX: 500,
  },
  ADDRESS_FIELD: {
    MIN: 3,
    MAX: 255,
  },
} as const;

// Price Constraints
export const PRICE_CONSTRAINTS = {
  MIN: 1,
  MAX: 1000,
  DECIMAL_PLACES: 3,
} as const;

// Rating Constraints
export const RATING_CONSTRAINTS = {
  MIN: 1,
  MAX: 5,
} as const;

// Location Constraints (Jordan)
export const LOCATION_CONSTRAINTS = {
  JORDAN: {
    LAT_MIN: 29.185,
    LAT_MAX: 33.375,
    LNG_MIN: 34.960,
    LNG_MAX: 39.301,
  },
  DEFAULT_LOCATION: {
    // Amman, Jordan
    LAT: 31.9539,
    LNG: 35.9106,
  },
  SEARCH_RADIUS: {
    MIN: 1,     // 1 km
    MAX: 50,    // 50 km
    DEFAULT: 10, // 10 km
  },
} as const;

// File Upload Constraints
export const FILE_UPLOAD_CONSTRAINTS = {
  IMAGE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  LICENSE: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf'],
  },
} as const;

// Validation Messages
export const VALIDATION_MESSAGES = {
  REQUIRED: {
    ar: 'هذا الحقل مطلوب',
    en: 'This field is required',
  },
  EMAIL: {
    INVALID: {
      ar: 'البريد الإلكتروني غير صالح',
      en: 'Invalid email address',
    },
  },
  PHONE: {
    INVALID: {
      ar: 'رقم الهاتف غير صالح',
      en: 'Invalid phone number',
    },
    JORDAN_ONLY: {
      ar: 'يجب أن يكون رقم هاتف أردني',
      en: 'Must be a Jordanian phone number',
    },
  },
  PASSWORD: {
    TOO_SHORT: {
      ar: `كلمة المرور يجب أن تكون ${FIELD_LENGTHS.PASSWORD.MIN} أحرف على الأقل`,
      en: `Password must be at least ${FIELD_LENGTHS.PASSWORD.MIN} characters`,
    },
    TOO_LONG: {
      ar: `كلمة المرور يجب ألا تتجاوز ${FIELD_LENGTHS.PASSWORD.MAX} حرف`,
      en: `Password must not exceed ${FIELD_LENGTHS.PASSWORD.MAX} characters`,
    },
    MISMATCH: {
      ar: 'كلمات المرور غير متطابقة',
      en: 'Passwords do not match',
    },
  },
  NAME: {
    TOO_SHORT: {
      ar: `الاسم يجب أن يكون ${FIELD_LENGTHS.NAME.MIN} أحرف على الأقل`,
      en: `Name must be at least ${FIELD_LENGTHS.NAME.MIN} characters`,
    },
    TOO_LONG: {
      ar: `الاسم يجب ألا يتجاوز ${FIELD_LENGTHS.NAME.MAX} حرف`,
      en: `Name must not exceed ${FIELD_LENGTHS.NAME.MAX} characters`,
    },
  },
  BUSINESS_NAME: {
    TOO_SHORT: {
      ar: `اسم العمل يجب أن يكون ${FIELD_LENGTHS.BUSINESS_NAME.MIN} أحرف على الأقل`,
      en: `Business name must be at least ${FIELD_LENGTHS.BUSINESS_NAME.MIN} characters`,
    },
    TOO_LONG: {
      ar: `اسم العمل يجب ألا يتجاوز ${FIELD_LENGTHS.BUSINESS_NAME.MAX} حرف`,
      en: `Business name must not exceed ${FIELD_LENGTHS.BUSINESS_NAME.MAX} characters`,
    },
  },
  SERVICE: {
    NAME_TOO_SHORT: {
      ar: `اسم الخدمة يجب أن يكون ${FIELD_LENGTHS.SERVICE_NAME.MIN} أحرف على الأقل`,
      en: `Service name must be at least ${FIELD_LENGTHS.SERVICE_NAME.MIN} characters`,
    },
    NAME_TOO_LONG: {
      ar: `اسم الخدمة يجب ألا يتجاوز ${FIELD_LENGTHS.SERVICE_NAME.MAX} حرف`,
      en: `Service name must not exceed ${FIELD_LENGTHS.SERVICE_NAME.MAX} characters`,
    },
    DESCRIPTION_TOO_SHORT: {
      ar: `الوصف يجب أن يكون ${FIELD_LENGTHS.DESCRIPTION.MIN} أحرف على الأقل`,
      en: `Description must be at least ${FIELD_LENGTHS.DESCRIPTION.MIN} characters`,
    },
    DESCRIPTION_TOO_LONG: {
      ar: `الوصف يجب ألا يتجاوز ${FIELD_LENGTHS.DESCRIPTION.MAX} حرف`,
      en: `Description must not exceed ${FIELD_LENGTHS.DESCRIPTION.MAX} characters`,
    },
  },
  PRICE: {
    INVALID: {
      ar: 'السعر غير صالح',
      en: 'Invalid price',
    },
    TOO_LOW: {
      ar: `السعر يجب أن يكون ${PRICE_CONSTRAINTS.MIN} دينار على الأقل`,
      en: `Price must be at least ${PRICE_CONSTRAINTS.MIN} JOD`,
    },
    TOO_HIGH: {
      ar: `السعر يجب ألا يتجاوز ${PRICE_CONSTRAINTS.MAX} دينار`,
      en: `Price must not exceed ${PRICE_CONSTRAINTS.MAX} JOD`,
    },
  },
  DURATION: {
    INVALID: {
      ar: 'المدة غير صالحة',
      en: 'Invalid duration',
    },
    TOO_SHORT: {
      ar: 'المدة يجب أن تكون 15 دقيقة على الأقل',
      en: 'Duration must be at least 15 minutes',
    },
    TOO_LONG: {
      ar: 'المدة يجب ألا تتجاوز 8 ساعات',
      en: 'Duration must not exceed 8 hours',
    },
  },
  LOCATION: {
    INVALID: {
      ar: 'الموقع غير صالح',
      en: 'Invalid location',
    },
    OUTSIDE_JORDAN: {
      ar: 'الموقع يجب أن يكون داخل الأردن',
      en: 'Location must be within Jordan',
    },
  },
  DATE: {
    INVALID: {
      ar: 'التاريخ غير صالح',
      en: 'Invalid date',
    },
    PAST: {
      ar: 'لا يمكن اختيار تاريخ في الماضي',
      en: 'Cannot select a date in the past',
    },
    TOO_FAR: {
      ar: 'لا يمكن الحجز لأكثر من 30 يوم مقدماً',
      en: 'Cannot book more than 30 days in advance',
    },
  },
  TIME: {
    INVALID: {
      ar: 'الوقت غير صالح',
      en: 'Invalid time',
    },
    OUTSIDE_HOURS: {
      ar: 'الوقت خارج ساعات العمل',
      en: 'Time is outside working hours',
    },
  },
  FILE: {
    TOO_LARGE: {
      ar: 'حجم الملف كبير جداً',
      en: 'File size is too large',
    },
    INVALID_TYPE: {
      ar: 'نوع الملف غير مسموح',
      en: 'File type not allowed',
    },
  },
  RATING: {
    INVALID: {
      ar: 'التقييم غير صالح',
      en: 'Invalid rating',
    },
  },
  REVIEW: {
    TOO_SHORT: {
      ar: `التعليق يجب أن يكون ${FIELD_LENGTHS.REVIEW_COMMENT.MIN} أحرف على الأقل`,
      en: `Comment must be at least ${FIELD_LENGTHS.REVIEW_COMMENT.MIN} characters`,
    },
    TOO_LONG: {
      ar: `التعليق يجب ألا يتجاوز ${FIELD_LENGTHS.REVIEW_COMMENT.MAX} حرف`,
      en: `Comment must not exceed ${FIELD_LENGTHS.REVIEW_COMMENT.MAX} characters`,
    },
  },
  OTP: {
    INVALID: {
      ar: 'رمز التحقق غير صالح',
      en: 'Invalid verification code',
    },
    EXPIRED: {
      ar: 'رمز التحقق منتهي الصلاحية',
      en: 'Verification code has expired',
    },
  },
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ARABIC_NAME: /^[\u0600-\u06FF\s]+$/,
  ENGLISH_NAME: /^[a-zA-Z\s]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^[0-9]+$/,
  DECIMAL: /^\d+(\.\d{1,3})?$/,
  TIME_24H: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  OTP: /^\d{6}$/,
} as const;

// Validation Helper Functions
export const ValidationHelpers = {
  isValidEmail: (email: string): boolean => {
    return REGEX_PATTERNS.EMAIL.test(email);
  },
  
  isValidPrice: (price: number): boolean => {
    return price >= PRICE_CONSTRAINTS.MIN && price <= PRICE_CONSTRAINTS.MAX;
  },
  
  isValidRating: (rating: number): boolean => {
    return rating >= RATING_CONSTRAINTS.MIN && rating <= RATING_CONSTRAINTS.MAX;
  },
  
  isWithinJordan: (lat: number, lng: number): boolean => {
    return (
      lat >= LOCATION_CONSTRAINTS.JORDAN.LAT_MIN &&
      lat <= LOCATION_CONSTRAINTS.JORDAN.LAT_MAX &&
      lng >= LOCATION_CONSTRAINTS.JORDAN.LNG_MIN &&
      lng <= LOCATION_CONSTRAINTS.JORDAN.LNG_MAX
    );
  },
  
  isValidFileSize: (size: number, type: 'IMAGE' | 'LICENSE'): boolean => {
    return size <= FILE_UPLOAD_CONSTRAINTS[type].MAX_SIZE;
  },
  
  isValidFileType: (mimeType: string, type: 'IMAGE' | 'LICENSE'): boolean => {
    return FILE_UPLOAD_CONSTRAINTS[type].ALLOWED_TYPES.includes(mimeType);
  },
  
  isValidOTP: (otp: string): boolean => {
    return REGEX_PATTERNS.OTP.test(otp);
  },
  
  isFutureDate: (date: Date): boolean => {
    return date > new Date();
  },
  
  isWithinBookingWindow: (date: Date): boolean => {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 days from now
    
    return date > now && date <= maxDate;
  },
} as const;