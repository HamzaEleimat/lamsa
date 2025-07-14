import { format, parseISO } from 'date-fns';

interface PrayerTime {
  name: string;
  name_ar: string;
  time: string; // HH:mm format
  type: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

// Jordan major cities coordinates
export const JORDAN_CITIES = {
  amman: { latitude: 31.9539, longitude: 35.9106, name: 'Amman', name_ar: 'عمّان' },
  irbid: { latitude: 32.5510, longitude: 35.8579, name: 'Irbid', name_ar: 'إربد' },
  zarqa: { latitude: 32.0728, longitude: 36.0880, name: 'Zarqa', name_ar: 'الزرقاء' },
  aqaba: { latitude: 29.5321, longitude: 35.0063, name: 'Aqaba', name_ar: 'العقبة' },
  salt: { latitude: 32.0385, longitude: 35.7284, name: 'Salt', name_ar: 'السلط' },
  madaba: { latitude: 31.7160, longitude: 35.7940, name: 'Madaba', name_ar: 'مادبا' },
  karak: { latitude: 31.1853, longitude: 35.7048, name: 'Karak', name_ar: 'الكرك' },
  mafraq: { latitude: 32.3425, longitude: 36.2080, name: 'Mafraq', name_ar: 'المفرق' },
  ajloun: { latitude: 32.3326, longitude: 35.7517, name: 'Ajloun', name_ar: 'عجلون' },
  jerash: { latitude: 32.2807, longitude: 35.8993, name: 'Jerash', name_ar: 'جرش' },
};

// Calculation method constants for Jordan (Uses University of Islamic Sciences, Karachi method)
const CALCULATION_METHOD = {
  fajrAngle: 18.0,
  ishaAngle: 18.0,
  asrJuristic: 1, // Shafi (standard in Jordan)
  highLatitudeRule: 'NightMiddle',
};

/**
 * Calculate prayer times for Jordan
 * This is a simplified calculation. In production, use a proper Islamic prayer time library
 * like adhan-js or prayer-times.js
 */
export function calculatePrayerTimes(
  date: Date,
  coordinates: Coordinates = JORDAN_CITIES.amman
): PrayerTime[] {
  // This is a simplified calculation for demonstration
  // In production, use a proper prayer time calculation library
  
  const month = date.getMonth();
  const isWinter = month >= 10 || month <= 2; // Nov-Feb
  
  // Approximate prayer times for Jordan (varies by season and location)
  const times = {
    winter: {
      fajr: '05:30',
      sunrise: '06:45',
      dhuhr: '12:00',
      asr: '14:30',
      maghrib: '17:00',
      isha: '18:30',
    },
    summer: {
      fajr: '04:00',
      sunrise: '05:30',
      dhuhr: '12:30',
      asr: '16:00',
      maghrib: '19:30',
      isha: '21:00',
    },
  };
  
  const seasonTimes = isWinter ? times.winter : times.summer;
  
  return [
    {
      name: 'Fajr',
      name_ar: 'الفجر',
      time: seasonTimes.fajr,
      type: 'fajr',
    },
    {
      name: 'Sunrise',
      name_ar: 'الشروق',
      time: seasonTimes.sunrise,
      type: 'sunrise',
    },
    {
      name: 'Dhuhr',
      name_ar: 'الظهر',
      time: seasonTimes.dhuhr,
      type: 'dhuhr',
    },
    {
      name: 'Asr',
      name_ar: 'العصر',
      time: seasonTimes.asr,
      type: 'asr',
    },
    {
      name: 'Maghrib',
      name_ar: 'المغرب',
      time: seasonTimes.maghrib,
      type: 'maghrib',
    },
    {
      name: 'Isha',
      name_ar: 'العشاء',
      time: seasonTimes.isha,
      type: 'isha',
    },
  ];
}

/**
 * Get Friday (Jumu'ah) prayer time
 * In Jordan, Friday prayer is typically held shortly after Dhuhr
 */
export function getFridayPrayerTime(date: Date, coordinates?: Coordinates): string {
  const prayerTimes = calculatePrayerTimes(date, coordinates);
  const dhuhrTime = prayerTimes.find(p => p.type === 'dhuhr')?.time || '12:30';
  
  // Friday prayer is typically 15-30 minutes after Dhuhr
  const [hours, minutes] = dhuhrTime.split(':').map(Number);
  const fridayTime = new Date();
  fridayTime.setHours(hours, minutes + 15, 0, 0);
  
  return format(fridayTime, 'HH:mm');
}

/**
 * Get Ramadan prayer times adjustments
 * During Ramadan, additional prayers (Tarawih) are performed after Isha
 */
export function getRamadanPrayerTimes(date: Date, coordinates?: Coordinates): PrayerTime[] {
  const regularPrayers = calculatePrayerTimes(date, coordinates);
  
  // Add Tarawih prayer (usually 30-60 minutes after Isha)
  const ishaTime = regularPrayers.find(p => p.type === 'isha')?.time || '21:00';
  const [hours, minutes] = ishaTime.split(':').map(Number);
  const tarawihTime = new Date();
  tarawihTime.setHours(hours, minutes + 30, 0, 0);
  
  return [
    ...regularPrayers,
    {
      name: 'Tarawih',
      name_ar: 'التراويح',
      time: format(tarawihTime, 'HH:mm'),
      type: 'isha', // Grouped with Isha
    },
  ];
}

/**
 * Check if a given time conflicts with prayer time
 * Includes buffer time before and after prayer
 */
export function conflictsWithPrayerTime(
  startTime: Date,
  endTime: Date,
  prayerTimes: PrayerTime[],
  bufferMinutes: number = 15
): { conflicts: boolean; prayer?: PrayerTime } {
  for (const prayer of prayerTimes) {
    const [hours, minutes] = prayer.time.split(':').map(Number);
    const prayerStart = new Date(startTime);
    prayerStart.setHours(hours, minutes - bufferMinutes, 0, 0);
    
    const prayerEnd = new Date(startTime);
    const prayerDuration = prayer.type === 'dhuhr' && startTime.getDay() === 5 ? 90 : 15; // Friday prayer is longer
    prayerEnd.setHours(hours, minutes + prayerDuration + bufferMinutes, 0, 0);
    
    if (
      (startTime >= prayerStart && startTime < prayerEnd) ||
      (endTime > prayerStart && endTime <= prayerEnd) ||
      (startTime <= prayerStart && endTime >= prayerEnd)
    ) {
      return { conflicts: true, prayer };
    }
  }
  
  return { conflicts: false };
}

/**
 * Get prayer time by type
 */
export function getPrayerByType(
  type: PrayerTime['type'],
  date: Date,
  coordinates?: Coordinates
): PrayerTime | undefined {
  const prayerTimes = calculatePrayerTimes(date, coordinates);
  return prayerTimes.find(p => p.type === type);
}

/**
 * Format prayer time for display
 */
export function formatPrayerTime(prayer: PrayerTime, locale: 'ar' | 'en' = 'en'): string {
  const name = locale === 'ar' ? prayer.name_ar : prayer.name;
  return `${name}: ${prayer.time}`;
}

/**
 * Get next prayer time
 */
export function getNextPrayer(currentTime: Date, coordinates?: Coordinates): PrayerTime | null {
  const prayerTimes = calculatePrayerTimes(currentTime, coordinates);
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  for (const prayer of prayerTimes) {
    const [hours, minutes] = prayer.time.split(':').map(Number);
    const prayerMinutes = hours * 60 + minutes;
    
    if (prayerMinutes > currentMinutes) {
      return prayer;
    }
  }
  
  // If no prayer found today, return Fajr of next day
  return prayerTimes[0];
}

/**
 * Check if current time is during prayer
 */
export function isDuringPrayer(
  currentTime: Date,
  coordinates?: Coordinates,
  prayerDuration: number = 15
): { isDuring: boolean; prayer?: PrayerTime } {
  const prayerTimes = calculatePrayerTimes(currentTime, coordinates);
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  for (const prayer of prayerTimes) {
    const [hours, minutes] = prayer.time.split(':').map(Number);
    const prayerStartMinutes = hours * 60 + minutes;
    const prayerEndMinutes = prayerStartMinutes + prayerDuration;
    
    if (currentMinutes >= prayerStartMinutes && currentMinutes <= prayerEndMinutes) {
      return { isDuring: true, prayer };
    }
  }
  
  return { isDuring: false };
}

/**
 * Get Ramadan dates for a given year
 * Note: Islamic calendar dates vary each year
 */
export function getRamadanDates(year: number): { start: Date; end: Date } {
  // Approximate Ramadan dates (in production, use proper Islamic calendar calculation)
  const ramadanDates: { [key: number]: { start: string; end: string } } = {
    2024: { start: '2024-03-11', end: '2024-04-09' },
    2025: { start: '2025-03-01', end: '2025-03-30' },
    2026: { start: '2026-02-18', end: '2026-03-19' },
  };
  
  const dates = ramadanDates[year] || ramadanDates[2024];
  
  return {
    start: parseISO(dates.start),
    end: parseISO(dates.end),
  };
}

/**
 * Check if a date is during Ramadan
 */
export function isDuringRamadan(date: Date): boolean {
  const year = date.getFullYear();
  const { start, end } = getRamadanDates(year);
  
  return date >= start && date <= end;
}

/**
 * Get recommended working hours during Ramadan
 */
export function getRamadanWorkingHours(): {
  morning: { start: string; end: string };
  evening: { start: string; end: string };
} {
  return {
    morning: { start: '10:00', end: '15:00' },
    evening: { start: '20:00', end: '23:00' },
  };
}