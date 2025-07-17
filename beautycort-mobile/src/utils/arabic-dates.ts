/**
 * Arabic Date and Time Formatting Utilities
 * Provides comprehensive date/time formatting with Arabic support
 * Includes Jordan-specific formatting and Islamic calendar support
 */

import { isRTL } from '../i18n';
import { toArabicNumerals, toWesternNumerals } from './arabic-numerals';

// Arabic month names (Gregorian calendar)
const ARABIC_MONTHS = [
  'كانون الثاني',  // January
  'شباط',         // February
  'آذار',         // March
  'نيسان',        // April
  'أيار',         // May
  'حزيران',       // June
  'تموز',         // July
  'آب',           // August
  'أيلول',        // September
  'تشرين الأول',  // October
  'تشرين الثاني', // November
  'كانون الأول'   // December
];

// Arabic short month names
const ARABIC_MONTHS_SHORT = [
  'ك2',  // January
  'شباط', // February
  'آذار', // March
  'نيسان', // April
  'أيار', // May
  'حزيران', // June
  'تموز', // July
  'آب',   // August
  'أيلول', // September
  'ت1',   // October
  'ت2',   // November
  'ك1'    // December
];

// Arabic day names
const ARABIC_DAYS = [
  'الأحد',    // Sunday
  'الإثنين',  // Monday
  'الثلاثاء', // Tuesday
  'الأربعاء', // Wednesday
  'الخميس',  // Thursday
  'الجمعة',  // Friday
  'السبت'    // Saturday
];

// Arabic short day names
const ARABIC_DAYS_SHORT = [
  'أحد',  // Sunday
  'إثنين', // Monday
  'ثلاثاء', // Tuesday
  'أربعاء', // Wednesday
  'خميس', // Thursday
  'جمعة', // Friday
  'سبت'   // Saturday
];

// Islamic month names (Hijri calendar)
const ISLAMIC_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة'
];

// Time periods in Arabic
const TIME_PERIODS_AR = {
  am: 'صباحاً',
  pm: 'مساءً',
  morning: 'صباح',
  afternoon: 'بعد الظهر',
  evening: 'مساء',
  night: 'ليل'
};

// Time periods in English
const TIME_PERIODS_EN = {
  am: 'AM',
  pm: 'PM',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night'
};

// Prayer times names
const PRAYER_TIMES_AR = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء'
};

const PRAYER_TIMES_EN = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha'
};

// Relative time expressions
const RELATIVE_TIME_AR = {
  now: 'الآن',
  justNow: 'منذ قليل',
  minutesAgo: 'منذ {count} دقائق',
  oneMinuteAgo: 'منذ دقيقة',
  hoursAgo: 'منذ {count} ساعات',
  oneHourAgo: 'منذ ساعة',
  daysAgo: 'منذ {count} أيام',
  oneDayAgo: 'منذ يوم',
  weeksAgo: 'منذ {count} أسابيع',
  oneWeekAgo: 'منذ أسبوع',
  monthsAgo: 'منذ {count} شهور',
  oneMonthAgo: 'منذ شهر',
  yearsAgo: 'منذ {count} سنوات',
  oneYearAgo: 'منذ سنة',
  tomorrow: 'غداً',
  yesterday: 'أمس',
  today: 'اليوم'
};

const RELATIVE_TIME_EN = {
  now: 'now',
  justNow: 'just now',
  minutesAgo: '{count} minutes ago',
  oneMinuteAgo: '1 minute ago',
  hoursAgo: '{count} hours ago',
  oneHourAgo: '1 hour ago',
  daysAgo: '{count} days ago',
  oneDayAgo: '1 day ago',
  weeksAgo: '{count} weeks ago',
  oneWeekAgo: '1 week ago',
  monthsAgo: '{count} months ago',
  oneMonthAgo: '1 month ago',
  yearsAgo: '{count} years ago',
  oneYearAgo: '1 year ago',
  tomorrow: 'tomorrow',
  yesterday: 'yesterday',
  today: 'today'
};

/**
 * Format date with Arabic month and day names
 */
export const formatArabicDate = (
  date: Date,
  format: 'full' | 'long' | 'medium' | 'short' = 'long',
  useArabicNumerals: boolean = isRTL()
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const dayOfWeek = date.getDay();
  
  const dayStr = useArabicNumerals ? toArabicNumerals(day.toString()) : day.toString();
  const yearStr = useArabicNumerals ? toArabicNumerals(year.toString()) : year.toString();
  
  switch (format) {
    case 'full':
      return `${ARABIC_DAYS[dayOfWeek]}، ${dayStr} ${ARABIC_MONTHS[month]} ${yearStr}`;
    case 'long':
      return `${dayStr} ${ARABIC_MONTHS[month]} ${yearStr}`;
    case 'medium':
      return `${dayStr} ${ARABIC_MONTHS_SHORT[month]} ${yearStr}`;
    case 'short':
      const monthNum = useArabicNumerals ? toArabicNumerals((month + 1).toString().padStart(2, '0')) : (month + 1).toString().padStart(2, '0');
      return `${dayStr}/${monthNum}/${yearStr}`;
    default:
      return `${dayStr} ${ARABIC_MONTHS[month]} ${yearStr}`;
  }
};

/**
 * Format time with Arabic AM/PM
 */
export const formatArabicTime = (
  date: Date,
  use24Hour: boolean = false,
  useArabicNumerals: boolean = isRTL(),
  useArabicPeriods: boolean = isRTL()
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  if (use24Hour) {
    const hoursStr = useArabicNumerals ? toArabicNumerals(hours.toString().padStart(2, '0')) : hours.toString().padStart(2, '0');
    const minutesStr = useArabicNumerals ? toArabicNumerals(minutes.toString().padStart(2, '0')) : minutes.toString().padStart(2, '0');
    return `${hoursStr}:${minutesStr}`;
  } else {
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const hoursStr = useArabicNumerals ? toArabicNumerals(hour12.toString()) : hour12.toString();
    const minutesStr = useArabicNumerals ? toArabicNumerals(minutes.toString().padStart(2, '0')) : minutes.toString().padStart(2, '0');
    const period = hours >= 12 ? 'pm' : 'am';
    const periodStr = useArabicPeriods ? TIME_PERIODS_AR[period] : TIME_PERIODS_EN[period];
    
    return `${hoursStr}:${minutesStr} ${periodStr}`;
  }
};

/**
 * Format date and time together
 */
export const formatArabicDateTime = (
  date: Date,
  dateFormat: 'full' | 'long' | 'medium' | 'short' = 'medium',
  use24Hour: boolean = false,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  const formattedDate = useArabicText 
    ? formatArabicDate(date, dateFormat, useArabicNumerals)
    : date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: dateFormat === 'short' ? '2-digit' : 'long',
        day: 'numeric',
        weekday: dateFormat === 'full' ? 'long' : undefined
      });
  
  const formattedTime = useArabicText
    ? formatArabicTime(date, use24Hour, useArabicNumerals, true)
    : formatArabicTime(date, use24Hour, useArabicNumerals, false);
  
  return `${formattedDate} ${formattedTime}`;
};

/**
 * Format relative time (e.g., "منذ 5 دقائق")
 */
export const formatRelativeTime = (
  date: Date,
  useArabicText: boolean = isRTL(),
  useArabicNumerals: boolean = isRTL()
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  const templates = useArabicText ? RELATIVE_TIME_AR : RELATIVE_TIME_EN;
  
  if (diffSeconds < 60) {
    return templates.justNow;
  } else if (diffMinutes < 60) {
    if (diffMinutes === 1) {
      return templates.oneMinuteAgo;
    }
    const count = useArabicNumerals ? toArabicNumerals(diffMinutes.toString()) : diffMinutes.toString();
    return templates.minutesAgo.replace('{count}', count);
  } else if (diffHours < 24) {
    if (diffHours === 1) {
      return templates.oneHourAgo;
    }
    const count = useArabicNumerals ? toArabicNumerals(diffHours.toString()) : diffHours.toString();
    return templates.hoursAgo.replace('{count}', count);
  } else if (diffDays < 7) {
    if (diffDays === 1) {
      return templates.yesterday;
    }
    const count = useArabicNumerals ? toArabicNumerals(diffDays.toString()) : diffDays.toString();
    return templates.daysAgo.replace('{count}', count);
  } else if (diffWeeks < 4) {
    if (diffWeeks === 1) {
      return templates.oneWeekAgo;
    }
    const count = useArabicNumerals ? toArabicNumerals(diffWeeks.toString()) : diffWeeks.toString();
    return templates.weeksAgo.replace('{count}', count);
  } else if (diffMonths < 12) {
    if (diffMonths === 1) {
      return templates.oneMonthAgo;
    }
    const count = useArabicNumerals ? toArabicNumerals(diffMonths.toString()) : diffMonths.toString();
    return templates.monthsAgo.replace('{count}', count);
  } else {
    if (diffYears === 1) {
      return templates.oneYearAgo;
    }
    const count = useArabicNumerals ? toArabicNumerals(diffYears.toString()) : diffYears.toString();
    return templates.yearsAgo.replace('{count}', count);
  }
};

/**
 * Format time range (e.g., "٩:٠٠ ص - ٥:٠٠ م")
 */
export const formatTimeRange = (
  startTime: Date,
  endTime: Date,
  use24Hour: boolean = false,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  if (!startTime || !endTime || !(startTime instanceof Date) || !(endTime instanceof Date)) return '';
  
  const formattedStart = formatArabicTime(startTime, use24Hour, useArabicNumerals, useArabicText);
  const formattedEnd = formatArabicTime(endTime, use24Hour, useArabicNumerals, useArabicText);
  
  const separator = useArabicText ? ' - ' : ' - ';
  return `${formattedStart}${separator}${formattedEnd}`;
};

/**
 * Format date range (e.g., "١ - ٥ كانون الثاني ٢٠٢٤")
 */
export const formatDateRange = (
  startDate: Date,
  endDate: Date,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  if (!startDate || !endDate || !(startDate instanceof Date) || !(endDate instanceof Date)) return '';
  
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  
  if (sameMonth && sameYear) {
    const startDay = useArabicNumerals ? toArabicNumerals(startDate.getDate().toString()) : startDate.getDate().toString();
    const endDay = useArabicNumerals ? toArabicNumerals(endDate.getDate().toString()) : endDate.getDate().toString();
    const month = useArabicText ? ARABIC_MONTHS[startDate.getMonth()] : startDate.toLocaleDateString('en-US', { month: 'long' });
    const year = useArabicNumerals ? toArabicNumerals(startDate.getFullYear().toString()) : startDate.getFullYear().toString();
    
    return `${startDay} - ${endDay} ${month} ${year}`;
  } else {
    const formattedStart = useArabicText 
      ? formatArabicDate(startDate, 'medium', useArabicNumerals)
      : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const formattedEnd = useArabicText
      ? formatArabicDate(endDate, 'medium', useArabicNumerals)
      : endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `${formattedStart} - ${formattedEnd}`;
  }
};

/**
 * Format prayer time
 */
export const formatPrayerTime = (
  prayerName: keyof typeof PRAYER_TIMES_AR,
  time: Date,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  if (!time || !(time instanceof Date)) return '';
  
  const prayerNameStr = useArabicText ? PRAYER_TIMES_AR[prayerName] : PRAYER_TIMES_EN[prayerName];
  const timeStr = formatArabicTime(time, false, useArabicNumerals, useArabicText);
  
  return `${prayerNameStr}: ${timeStr}`;
};

/**
 * Format working hours
 */
export const formatWorkingHours = (
  openTime: Date,
  closeTime: Date,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  if (!openTime || !closeTime || !(openTime instanceof Date) || !(closeTime instanceof Date)) return '';
  
  return formatTimeRange(openTime, closeTime, false, useArabicNumerals, useArabicText);
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  if (!date || !(date instanceof Date)) return false;
  
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: Date): boolean => {
  if (!date || !(date instanceof Date)) return false;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

/**
 * Check if date is tomorrow
 */
export const isTomorrow = (date: Date): boolean => {
  if (!date || !(date instanceof Date)) return false;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
};

/**
 * Get day name in Arabic
 */
export const getArabicDayName = (
  date: Date,
  useShort: boolean = false,
  useArabicText: boolean = isRTL()
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  if (!useArabicText) {
    return date.toLocaleDateString('en-US', { weekday: useShort ? 'short' : 'long' });
  }
  
  const dayIndex = date.getDay();
  return useShort ? ARABIC_DAYS_SHORT[dayIndex] : ARABIC_DAYS[dayIndex];
};

/**
 * Get month name in Arabic
 */
export const getArabicMonthName = (
  date: Date,
  useShort: boolean = false,
  useArabicText: boolean = isRTL()
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  if (!useArabicText) {
    return date.toLocaleDateString('en-US', { month: useShort ? 'short' : 'long' });
  }
  
  const monthIndex = date.getMonth();
  return useShort ? ARABIC_MONTHS_SHORT[monthIndex] : ARABIC_MONTHS[monthIndex];
};

/**
 * Parse Arabic date input
 */
export const parseArabicDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  // Convert Arabic numerals to Western numerals
  const westernDateString = toWesternNumerals(dateString);
  
  // Try to parse the date
  const parsedDate = new Date(westernDateString);
  
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

/**
 * Format booking time slot
 */
export const formatBookingTimeSlot = (
  date: Date,
  duration: number,
  useArabicNumerals: boolean = isRTL(),
  useArabicText: boolean = isRTL()
): string => {
  if (!date || !(date instanceof Date)) return '';
  
  const startTime = new Date(date);
  const endTime = new Date(date.getTime() + duration * 60000); // duration in minutes
  
  const timeRange = formatTimeRange(startTime, endTime, false, useArabicNumerals, useArabicText);
  
  if (isToday(date)) {
    const todayStr = useArabicText ? RELATIVE_TIME_AR.today : RELATIVE_TIME_EN.today;
    return `${todayStr} ${timeRange}`;
  } else if (isTomorrow(date)) {
    const tomorrowStr = useArabicText ? RELATIVE_TIME_AR.tomorrow : RELATIVE_TIME_EN.tomorrow;
    return `${tomorrowStr} ${timeRange}`;
  } else {
    const dateStr = useArabicText 
      ? formatArabicDate(date, 'medium', useArabicNumerals)
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${dateStr} ${timeRange}`;
  }
};

/**
 * Utility object with all date formatting functions
 */
export const ArabicDates = {
  // Basic formatting
  formatDate: formatArabicDate,
  formatTime: formatArabicTime,
  formatDateTime: formatArabicDateTime,
  
  // Relative time
  formatRelativeTime,
  
  // Ranges
  formatTimeRange,
  formatDateRange,
  
  // Specialized formatting
  formatPrayerTime,
  formatWorkingHours,
  formatBookingTimeSlot,
  
  // Utilities
  isToday,
  isYesterday,
  isTomorrow,
  getArabicDayName,
  getArabicMonthName,
  parseArabicDate,
  
  // Constants
  ARABIC_MONTHS,
  ARABIC_DAYS,
  ISLAMIC_MONTHS,
  PRAYER_TIMES_AR,
  PRAYER_TIMES_EN
};

export default ArabicDates;