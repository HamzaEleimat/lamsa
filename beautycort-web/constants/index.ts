// Service Categories
export const SERVICE_CATEGORIES = [
  {
    id: 'salon-women',
    name_ar: 'صالون نسائي',
    name_en: "Women's Salon",
    icon: 'salon-women',
    sort_order: 1,
  },
  {
    id: 'salon-men',
    name_ar: 'صالون رجالي',
    name_en: "Men's Salon",
    icon: 'salon-men',
    sort_order: 2,
  },
  {
    id: 'spa',
    name_ar: 'سبا ومساج',
    name_en: 'Spa & Massage',
    icon: 'spa',
    sort_order: 3,
  },
  {
    id: 'nails',
    name_ar: 'أظافر',
    name_en: 'Nails',
    icon: 'nails',
    sort_order: 4,
  },
  {
    id: 'makeup',
    name_ar: 'مكياج',
    name_en: 'Makeup',
    icon: 'makeup',
    sort_order: 5,
  },
  {
    id: 'skincare',
    name_ar: 'العناية بالبشرة',
    name_en: 'Skincare',
    icon: 'skincare',
    sort_order: 6,
  },
  {
    id: 'hair-removal',
    name_ar: 'إزالة الشعر',
    name_en: 'Hair Removal',
    icon: 'hair-removal',
    sort_order: 7,
  },
  {
    id: 'clinic',
    name_ar: 'عيادة تجميل',
    name_en: 'Beauty Clinic',
    icon: 'clinic',
    sort_order: 8,
  },
] as const;

// Booking Status
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export const BOOKING_STATUS_LABELS = {
  [BOOKING_STATUS.PENDING]: {
    ar: 'قيد الانتظار',
    en: 'Pending',
  },
  [BOOKING_STATUS.CONFIRMED]: {
    ar: 'مؤكد',
    en: 'Confirmed',
  },
  [BOOKING_STATUS.COMPLETED]: {
    ar: 'مكتمل',
    en: 'Completed',
  },
  [BOOKING_STATUS.CANCELLED]: {
    ar: 'ملغي',
    en: 'Cancelled',
  },
  [BOOKING_STATUS.NO_SHOW]: {
    ar: 'لم يحضر',
    en: 'No Show',
  },
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  ONLINE: 'online',
} as const;

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: {
    ar: 'نقدي',
    en: 'Cash',
  },
  [PAYMENT_METHODS.CARD]: {
    ar: 'بطاقة',
    en: 'Card',
  },
  [PAYMENT_METHODS.ONLINE]: {
    ar: 'دفع إلكتروني',
    en: 'Online Payment',
  },
} as const;

// Time Slots (30-minute intervals from 9 AM to 9 PM)
export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00',
] as const;

// Generate time slot labels with AM/PM
export const TIME_SLOT_LABELS = TIME_SLOTS.reduce((acc, time) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  
  acc[time] = {
    ar: `${displayHour}:${minutes} ${ampm === 'PM' ? 'م' : 'ص'}`,
    en: `${displayHour}:${minutes} ${ampm}`,
  };
  
  return acc;
}, {} as Record<string, { ar: string; en: string }>);

// Jordan Phone Number Regex
export const JORDAN_PHONE_REGEX = {
  INTERNATIONAL: /^\+962[7][0-9]{8}$/,
  LOCAL_WITH_ZERO: /^07[0-9]{8}$/,
  LOCAL_WITHOUT_ZERO: /^7[0-9]{8}$/,
  ANY_FORMAT: /^(\+962|962|0)?7[0-9]{8}$/,
} as const;

// Default Service Durations (in minutes)
export const DEFAULT_SERVICE_DURATIONS = {
  'salon-women': {
    haircut: 45,
    hair_color: 120,
    hair_treatment: 60,
    styling: 60,
    makeup: 90,
  },
  'salon-men': {
    haircut: 30,
    beard_trim: 20,
    hair_color: 60,
    styling: 30,
  },
  'spa': {
    full_body_massage: 60,
    back_massage: 30,
    facial: 60,
    body_scrub: 45,
  },
  'nails': {
    manicure: 45,
    pedicure: 60,
    nail_art: 30,
    gel_polish: 60,
  },
  'makeup': {
    daily_makeup: 45,
    bridal_makeup: 120,
    party_makeup: 60,
    makeup_lesson: 90,
  },
  'skincare': {
    facial_treatment: 60,
    acne_treatment: 45,
    anti_aging: 75,
    skin_consultation: 30,
  },
  'hair-removal': {
    waxing_full_body: 120,
    waxing_legs: 45,
    waxing_arms: 30,
    laser_session: 30,
  },
  'clinic': {
    botox: 30,
    filler: 45,
    consultation: 30,
    skin_treatment: 60,
  },
} as const;

// Platform Fee Structure
export const PLATFORM_FEE = {
  THRESHOLD: 25, // JOD
  LOW_FEE: 2,     // JOD for amounts ≤ 25 JOD
  HIGH_FEE: 5,    // JOD for amounts > 25 JOD
} as const;

// Calculate platform fee based on amount
export const calculatePlatformFee = (amount: number): number => {
  return amount <= PLATFORM_FEE.THRESHOLD ? PLATFORM_FEE.LOW_FEE : PLATFORM_FEE.HIGH_FEE;
};

// Provider Tier Thresholds
export const PROVIDER_TIERS = {
  BRONZE: {
    name_ar: 'برونزي',
    name_en: 'Bronze',
    min_bookings: 0,
    max_bookings: 50,
    commission_rate: 0.15, // 15%
    benefits: {
      ar: ['الحساب الأساسي', 'الدعم القياسي'],
      en: ['Basic account', 'Standard support'],
    },
  },
  SILVER: {
    name_ar: 'فضي',
    name_en: 'Silver',
    min_bookings: 51,
    max_bookings: 200,
    commission_rate: 0.12, // 12%
    benefits: {
      ar: ['أولوية في البحث', 'دعم مخصص', 'تقارير شهرية'],
      en: ['Search priority', 'Dedicated support', 'Monthly reports'],
    },
  },
  GOLD: {
    name_ar: 'ذهبي',
    name_en: 'Gold',
    min_bookings: 201,
    max_bookings: 500,
    commission_rate: 0.10, // 10%
    benefits: {
      ar: ['أعلى أولوية في البحث', 'مدير حساب مخصص', 'تقارير أسبوعية', 'ترويج مميز'],
      en: ['Top search priority', 'Account manager', 'Weekly reports', 'Featured promotion'],
    },
  },
  PLATINUM: {
    name_ar: 'بلاتيني',
    name_en: 'Platinum',
    min_bookings: 501,
    max_bookings: Infinity,
    commission_rate: 0.08, // 8%
    benefits: {
      ar: ['جميع المزايا', 'عمولة مخفضة', 'دعم 24/7', 'حملات تسويقية'],
      en: ['All benefits', 'Reduced commission', '24/7 support', 'Marketing campaigns'],
    },
  },
} as const;

// Get provider tier based on total bookings
export const getProviderTier = (totalBookings: number) => {
  if (totalBookings <= PROVIDER_TIERS.BRONZE.max_bookings) return 'BRONZE';
  if (totalBookings <= PROVIDER_TIERS.SILVER.max_bookings) return 'SILVER';
  if (totalBookings <= PROVIDER_TIERS.GOLD.max_bookings) return 'GOLD';
  return 'PLATINUM';
};

// Days of the Week
export const DAYS_OF_WEEK = [
  { value: 0, label_ar: 'الأحد', label_en: 'Sunday' },
  { value: 1, label_ar: 'الإثنين', label_en: 'Monday' },
  { value: 2, label_ar: 'الثلاثاء', label_en: 'Tuesday' },
  { value: 3, label_ar: 'الأربعاء', label_en: 'Wednesday' },
  { value: 4, label_ar: 'الخميس', label_en: 'Thursday' },
  { value: 5, label_ar: 'الجمعة', label_en: 'Friday' },
  { value: 6, label_ar: 'السبت', label_en: 'Saturday' },
] as const;

// Currency
export const CURRENCY = {
  CODE: 'JOD',
  SYMBOL: 'د.أ',
  SYMBOL_EN: 'JD',
  DECIMAL_PLACES: 3,
} as const;

// Format currency
export const formatCurrency = (amount: number, locale: 'ar' | 'en' = 'ar'): string => {
  const symbol = locale === 'ar' ? CURRENCY.SYMBOL : CURRENCY.SYMBOL_EN;
  const formatted = amount.toFixed(CURRENCY.DECIMAL_PLACES);
  return locale === 'ar' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
};

// App Languages
export const LANGUAGES = {
  AR: { code: 'ar', name: 'العربية', dir: 'rtl' },
  EN: { code: 'en', name: 'English', dir: 'ltr' },
} as const;

// TypeScript Types
export type ServiceCategoryId = typeof SERVICE_CATEGORIES[number]['id'];
export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
export type TimeSlot = typeof TIME_SLOTS[number];
export type ProviderTierName = keyof typeof PROVIDER_TIERS;
export type LanguageCode = keyof typeof LANGUAGES;
export type DayOfWeek = typeof DAYS_OF_WEEK[number]['value'];

// Service Category Type
export interface ServiceCategory {
  id: ServiceCategoryId;
  name_ar: string;
  name_en: string;
  icon: string;
  sort_order: number;
}

// Provider Tier Type
export interface ProviderTier {
  name_ar: string;
  name_en: string;
  min_bookings: number;
  max_bookings: number;
  commission_rate: number;
  benefits: {
    ar: string[];
    en: string[];
  };
}

// Time Slot Type
export interface TimeSlotInfo {
  time: TimeSlot;
  label_ar: string;
  label_en: string;
  available?: boolean;
}

// Validation Functions
export const validateJordanPhone = (phone: string): boolean => {
  return JORDAN_PHONE_REGEX.ANY_FORMAT.test(phone);
};

export const normalizeJordanPhone = (phone: string): string => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('962')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('07')) {
    return '+962' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') && cleaned.length === 9) {
    return '+962' + cleaned;
  }
  
  return phone; // Return original if not valid
};

// Export all constants as a single object for convenience
export const CONSTANTS = {
  SERVICE_CATEGORIES,
  BOOKING_STATUS,
  BOOKING_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
  JORDAN_PHONE_REGEX,
  DEFAULT_SERVICE_DURATIONS,
  PLATFORM_FEE,
  PROVIDER_TIERS,
  DAYS_OF_WEEK,
  CURRENCY,
  LANGUAGES,
} as const;