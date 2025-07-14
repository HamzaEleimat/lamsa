import axios from 'axios';
import { supabase } from '../config/supabase-simple';
import { AppError } from '../middleware/error.middleware';

interface PrayerTimesData {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  date: {
    gregorian: {
      date: string;
    };
    hijri: {
      date: string;
      month: {
        number: number;
        en: string;
        ar: string;
      };
    };
  };
}

interface CityCoordinates {
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export class PrayerTimeService {
  private static instance: PrayerTimeService;
  private readonly API_URL = 'http://api.aladhan.com/v1/timings';
  
  // Jordan major cities coordinates
  private readonly jordanCities: CityCoordinates[] = [
    { city: 'Amman', latitude: 31.9454, longitude: 35.9284, timezone: 'Asia/Amman' },
    { city: 'Irbid', latitude: 32.5510, longitude: 35.8479, timezone: 'Asia/Amman' },
    { city: 'Zarqa', latitude: 32.0728, longitude: 36.0880, timezone: 'Asia/Amman' },
    { city: 'Aqaba', latitude: 29.5321, longitude: 35.0063, timezone: 'Asia/Amman' },
    { city: 'Madaba', latitude: 31.7160, longitude: 35.7940, timezone: 'Asia/Amman' },
    { city: 'Jerash', latitude: 32.2807, longitude: 35.8991, timezone: 'Asia/Amman' },
    { city: 'Ajloun', latitude: 32.3326, longitude: 35.7518, timezone: 'Asia/Amman' },
    { city: 'Karak', latitude: 31.1837, longitude: 35.7049, timezone: 'Asia/Amman' },
    { city: 'Tafilah', latitude: 30.8377, longitude: 35.6044, timezone: 'Asia/Amman' },
    { city: 'Mafraq', latitude: 32.3420, longitude: 36.2080, timezone: 'Asia/Amman' },
    { city: 'Salt', latitude: 32.0392, longitude: 35.7272, timezone: 'Asia/Amman' },
  ];

  private constructor() {}

  static getInstance(): PrayerTimeService {
    if (!PrayerTimeService.instance) {
      PrayerTimeService.instance = new PrayerTimeService();
    }
    return PrayerTimeService.instance;
  }

  /**
   * Fetch prayer times from external API
   */
  async fetchPrayerTimes(
    city: string, 
    date: Date,
    method: number = 4 // 4 = Umm Al-Qura University, Makkah
  ): Promise<PrayerTimesData | null> {
    try {
      const cityData = this.jordanCities.find(c => c.city.toLowerCase() === city.toLowerCase());
      if (!cityData) {
        throw new AppError(`City ${city} not found in Jordan cities`, 400);
      }

      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const timestamp = Math.floor(date.getTime() / 1000);

      const response = await axios.get(this.API_URL, {
        params: {
          latitude: cityData.latitude,
          longitude: cityData.longitude,
          method: method,
          timestamp: timestamp,
        },
      });

      if (response.data && response.data.data) {
        return response.data.data.timings;
      }

      return null;
    } catch (error) {
      console.error('Error fetching prayer times:', error);
      return null;
    }
  }

  /**
   * Get prayer times from cache or fetch if not available
   */
  async getPrayerTimes(city: string, date: Date): Promise<any> {
    try {
      const dateStr = date.toISOString().split('T')[0];

      // Check cache first
      const { data: cached, error } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('city', city)
        .eq('prayer_date', dateStr)
        .single();

      if (cached && !error) {
        return cached;
      }

      // Fetch from API if not cached
      const prayerData = await this.fetchPrayerTimes(city, date);
      if (!prayerData) {
        throw new AppError('Failed to fetch prayer times', 500);
      }

      // Convert prayer times to TIME format
      const prayerTimes = {
        city,
        prayer_date: dateStr,
        fajr: this.convertToTime(prayerData.Fajr),
        sunrise: this.convertToTime(prayerData.Sunrise),
        dhuhr: this.convertToTime(prayerData.Dhuhr),
        asr: this.convertToTime(prayerData.Asr),
        maghrib: this.convertToTime(prayerData.Maghrib),
        isha: this.convertToTime(prayerData.Isha),
        calculation_method: 'jordan',
        latitude: this.jordanCities.find(c => c.city === city)?.latitude,
        longitude: this.jordanCities.find(c => c.city === city)?.longitude,
      };

      // Cache the prayer times
      const { data: inserted, error: insertError } = await supabase
        .from('prayer_times')
        .insert(prayerTimes)
        .select()
        .single();

      if (insertError) {
        console.error('Error caching prayer times:', insertError);
        return prayerTimes; // Return even if caching fails
      }

      return inserted;
    } catch (error) {
      console.error('Error getting prayer times:', error);
      throw error;
    }
  }

  /**
   * Get prayer times for a date range
   */
  async getPrayerTimesRange(
    city: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any[]> {
    const prayerTimes = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      try {
        const times = await this.getPrayerTimes(city, currentDate);
        prayerTimes.push(times);
      } catch (error) {
        console.error(`Error getting prayer times for ${currentDate}:`, error);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return prayerTimes;
  }

  /**
   * Check if current date is in Ramadan
   */
  async isRamadan(date: Date): Promise<boolean> {
    try {
      // Fetch prayer times which includes Hijri date
      const prayerData = await this.fetchPrayerTimes('Amman', date);
      
      if (prayerData && prayerData.date?.hijri?.month?.number) {
        return prayerData.date.hijri.month.number === 9; // Ramadan is the 9th month
      }

      return false;
    } catch (error) {
      console.error('Error checking Ramadan:', error);
      return false;
    }
  }

  /**
   * Get Ramadan dates for a given year
   */
  async getRamadanDates(year: number): Promise<{ start: Date; end: Date } | null> {
    try {
      // Check each day of the year to find Ramadan start and end
      let ramadanStart: Date | null = null;
      let ramadanEnd: Date | null = null;

      for (let month = 0; month < 12; month++) {
        for (let day = 1; day <= 31; day++) {
          const date = new Date(year, month, day);
          if (date.getMonth() !== month) continue; // Skip invalid dates

          const isRamadanDay = await this.isRamadan(date);

          if (isRamadanDay && !ramadanStart) {
            ramadanStart = new Date(date);
          } else if (!isRamadanDay && ramadanStart && !ramadanEnd) {
            ramadanEnd = new Date(date);
            ramadanEnd.setDate(ramadanEnd.getDate() - 1); // Previous day was last day of Ramadan
            break;
          }
        }

        if (ramadanStart && ramadanEnd) break;
      }

      if (ramadanStart && ramadanEnd) {
        return { start: ramadanStart, end: ramadanEnd };
      }

      return null;
    } catch (error) {
      console.error('Error getting Ramadan dates:', error);
      return null;
    }
  }

  /**
   * Calculate prayer break times for a provider
   */
  async calculatePrayerBreaks(
    providerId: string,
    date: Date,
    city: string
  ): Promise<Array<{ name: string; start: string; end: string }>> {
    try {
      // Get provider settings
      const { data: settings, error } = await supabase
        .from('provider_availability_settings')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (error || !settings?.enable_prayer_breaks) {
        return [];
      }

      // Get prayer times
      const prayerTimes = await this.getPrayerTimes(city, date);
      const breaks: Array<{ name: string; start: string; end: string }> = [];

      // Calculate breaks for each prayer
      const prayers = ['dhuhr', 'asr', 'maghrib']; // Prayers during business hours
      
      for (const prayer of prayers) {
        const prayerTime = prayerTimes[prayer];
        if (prayerTime) {
          const startTime = this.subtractMinutes(
            prayerTime, 
            settings.prayer_time_flexibility_minutes || 15
          );
          const endTime = this.addMinutes(
            prayerTime, 
            30 + (settings.prayer_time_flexibility_minutes || 15)
          );

          breaks.push({
            name: prayer,
            start: startTime,
            end: endTime,
          });
        }
      }

      return breaks;
    } catch (error) {
      console.error('Error calculating prayer breaks:', error);
      return [];
    }
  }

  /**
   * Get all cities supported
   */
  getSupportedCities(): string[] {
    return this.jordanCities.map(city => city.city);
  }

  /**
   * Utility functions
   */
  private convertToTime(timeStr: string): string {
    // Convert "05:30 (GMT)" to "05:30:00"
    const match = timeStr.match(/(\d{2}:\d{2})/);
    return match ? `${match[1]}:00` : timeStr;
  }

  private addMinutes(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:00`;
  }

  private subtractMinutes(time: string, minutes: number): string {
    return this.addMinutes(time, -minutes);
  }
}

export const prayerTimeService = PrayerTimeService.getInstance();