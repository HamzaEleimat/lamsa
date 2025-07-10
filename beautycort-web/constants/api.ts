// API Endpoints
export const API_ENDPOINTS = {
  // Base URL
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  
  // Auth
  AUTH: {
    CUSTOMER_SIGNUP: '/auth/customer/signup',
    CUSTOMER_LOGIN: '/auth/customer/login',
    CUSTOMER_VERIFY_OTP: '/auth/customer/verify-otp',
    PROVIDER_SIGNUP: '/auth/provider/signup',
    PROVIDER_LOGIN: '/auth/provider/login',
    PROVIDER_FORGOT_PASSWORD: '/auth/provider/forgot-password',
    PROVIDER_RESET_PASSWORD: '/auth/provider/reset-password',
    REFRESH_TOKEN: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  
  // Users
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/password',
    DELETE_ACCOUNT: '/users/account',
    UPLOAD_AVATAR: '/users/avatar',
    FAVORITES: '/users/favorites',
    ADD_FAVORITE: '/users/favorites',
    REMOVE_FAVORITE: (providerId: string) => `/users/favorites/${providerId}`,
  },
  
  // Providers
  PROVIDERS: {
    LIST: '/providers',
    DETAILS: (id: string) => `/providers/${id}`,
    CREATE: '/providers',
    UPDATE: (id: string) => `/providers/${id}`,
    DELETE: (id: string) => `/providers/${id}`,
    SERVICES: (id: string) => `/providers/${id}/services`,
    AVAILABILITY: (id: string) => `/providers/${id}/availability`,
    STATS: (id: string) => `/providers/${id}/stats`,
  },
  
  // Services
  SERVICES: {
    LIST: '/services',
    CATEGORIES: '/services/categories',
    SEARCH: '/services/search',
    DETAILS: (id: string) => `/services/${id}`,
    CREATE: (providerId: string) => `/services/providers/${providerId}/services`,
    UPDATE: (providerId: string, serviceId: string) => `/services/providers/${providerId}/services/${serviceId}`,
    DELETE: (providerId: string, serviceId: string) => `/services/providers/${providerId}/services/${serviceId}`,
  },
  
  // Bookings
  BOOKINGS: {
    CREATE: '/bookings',
    USER_BOOKINGS: '/bookings/user',
    PROVIDER_BOOKINGS: (providerId: string) => `/bookings/provider/${providerId}`,
    DETAILS: (id: string) => `/bookings/${id}`,
    UPDATE_STATUS: (id: string) => `/bookings/${id}/status`,
    CANCEL: (id: string) => `/bookings/${id}/cancel`,
    RESCHEDULE: (id: string) => `/bookings/${id}/reschedule`,
    HISTORY: (id: string) => `/bookings/${id}/history`,
  },
  
  // Payments
  PAYMENTS: {
    PROCESS: '/payments',
    HISTORY: '/payments/history',
    REFUND: (paymentId: string) => `/payments/${paymentId}/refund`,
  },
  
  // Reviews
  REVIEWS: {
    CREATE: '/reviews',
    PROVIDER_REVIEWS: (providerId: string) => `/reviews/providers/${providerId}`,
    UPDATE: (id: string) => `/reviews/${id}`,
  },
  
  // Health Check
  HEALTH: '/health',
} as const;

// API Response Status Codes
export const API_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// API Error Messages
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: {
    ar: 'خطأ في الاتصال. يرجى التحقق من اتصال الإنترنت.',
    en: 'Connection error. Please check your internet connection.',
  },
  UNAUTHORIZED: {
    ar: 'غير مصرح. يرجى تسجيل الدخول مرة أخرى.',
    en: 'Unauthorized. Please login again.',
  },
  FORBIDDEN: {
    ar: 'ليس لديك صلاحية للقيام بهذا الإجراء.',
    en: 'You do not have permission to perform this action.',
  },
  NOT_FOUND: {
    ar: 'المورد المطلوب غير موجود.',
    en: 'The requested resource was not found.',
  },
  SERVER_ERROR: {
    ar: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى.',
    en: 'Server error occurred. Please try again.',
  },
  VALIDATION_ERROR: {
    ar: 'يرجى التحقق من البيانات المدخلة.',
    en: 'Please check the entered data.',
  },
  PHONE_EXISTS: {
    ar: 'رقم الهاتف مسجل بالفعل.',
    en: 'Phone number already registered.',
  },
  EMAIL_EXISTS: {
    ar: 'البريد الإلكتروني مسجل بالفعل.',
    en: 'Email already registered.',
  },
  INVALID_CREDENTIALS: {
    ar: 'بيانات الدخول غير صحيحة.',
    en: 'Invalid login credentials.',
  },
  BOOKING_CONFLICT: {
    ar: 'الوقت المحدد غير متاح. يرجى اختيار وقت آخر.',
    en: 'Selected time is not available. Please choose another time.',
  },
} as const;

// API Request Headers
export const API_HEADERS = {
  DEFAULT: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  MULTIPART: {
    'Accept': 'application/json',
    // Content-Type will be set automatically for multipart/form-data
  },
  AUTH: (token: string) => ({
    'Authorization': `Bearer ${token}`,
  }),
} as const;

// API Request Timeouts (in milliseconds)
export const API_TIMEOUTS = {
  DEFAULT: 30000,    // 30 seconds
  UPLOAD: 120000,    // 2 minutes for file uploads
  DOWNLOAD: 60000,   // 1 minute for downloads
} as const;

// Pagination Defaults
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

// Cache Keys for React Query
export const QUERY_KEYS = {
  // Auth
  AUTH: {
    USER: ['auth', 'user'],
    SESSION: ['auth', 'session'],
  },
  
  // Users
  USERS: {
    PROFILE: ['users', 'profile'],
    FAVORITES: ['users', 'favorites'],
  },
  
  // Providers
  PROVIDERS: {
    LIST: (filters?: any) => ['providers', 'list', filters],
    DETAILS: (id: string) => ['providers', 'details', id],
    SERVICES: (id: string) => ['providers', 'services', id],
    AVAILABILITY: (id: string, date?: string) => ['providers', 'availability', id, date],
    STATS: (id: string) => ['providers', 'stats', id],
    NEARBY: (lat: number, lng: number, radius: number) => ['providers', 'nearby', lat, lng, radius],
  },
  
  // Services
  SERVICES: {
    LIST: (filters?: any) => ['services', 'list', filters],
    CATEGORIES: ['services', 'categories'],
    DETAILS: (id: string) => ['services', 'details', id],
    BY_CATEGORY: (categoryId: string) => ['services', 'by-category', categoryId],
  },
  
  // Bookings
  BOOKINGS: {
    USER_LIST: (userId: string, filters?: any) => ['bookings', 'user', userId, filters],
    PROVIDER_LIST: (providerId: string, filters?: any) => ['bookings', 'provider', providerId, filters],
    DETAILS: (id: string) => ['bookings', 'details', id],
    HISTORY: (id: string) => ['bookings', 'history', id],
  },
  
  // Payments
  PAYMENTS: {
    HISTORY: (filters?: any) => ['payments', 'history', filters],
  },
  
  // Reviews
  REVIEWS: {
    PROVIDER: (providerId: string, filters?: any) => ['reviews', 'provider', providerId, filters],
  },
} as const;

// Mutation Keys for React Query
export const MUTATION_KEYS = {
  // Auth
  AUTH: {
    CUSTOMER_SIGNUP: 'customerSignup',
    CUSTOMER_LOGIN: 'customerLogin',
    PROVIDER_SIGNUP: 'providerSignup',
    PROVIDER_LOGIN: 'providerLogin',
    LOGOUT: 'logout',
  },
  
  // Users
  USERS: {
    UPDATE_PROFILE: 'updateProfile',
    CHANGE_PASSWORD: 'changePassword',
    UPLOAD_AVATAR: 'uploadAvatar',
    ADD_FAVORITE: 'addFavorite',
    REMOVE_FAVORITE: 'removeFavorite',
  },
  
  // Bookings
  BOOKINGS: {
    CREATE: 'createBooking',
    UPDATE_STATUS: 'updateBookingStatus',
    CANCEL: 'cancelBooking',
    RESCHEDULE: 'rescheduleBooking',
  },
  
  // Reviews
  REVIEWS: {
    CREATE: 'createReview',
    UPDATE: 'updateReview',
  },
} as const;