import { supabase } from './supabase';
import { BusinessHours } from '../types';

export interface WeeklyAvailability {
  id?: string;
  provider_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  is_working_day: boolean;
  start_time?: string; // HH:MM format
  end_time?: string; // HH:MM format
  break_start?: string; // HH:MM format
  break_end?: string; // HH:MM format
}

export interface ExceptionDate {
  id?: string;
  provider_id: string;
  date: string; // YYYY-MM-DD
  is_working_day: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
  reason_ar?: string;
}

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
  reason?: string;
}

export interface AvailabilitySettings {
  max_advance_booking_days: number;
  min_advance_booking_hours: number;
  buffer_time_minutes: number;
  allow_same_day_booking: boolean;
  booking_time_increment: number; // in minutes (15, 30, 60)
}

export class AvailabilityService {
  /**
   * Get provider's weekly availability schedule
   */
  async getWeeklyAvailability(providerId: string): Promise<WeeklyAvailability[]> {
    try {
      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;

      // If no data, return default schedule
      if (!data || data.length === 0) {
        return this.getDefaultWeeklySchedule(providerId);
      }

      return data;
    } catch (error) {
      console.error('Error fetching weekly availability:', error);
      throw error;
    }
  }

  /**
   * Update provider's weekly availability
   */
  async updateWeeklyAvailability(
    providerId: string, 
    availability: WeeklyAvailability[]
  ): Promise<void> {
    try {
      // Delete existing availability
      const { error: deleteError } = await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', providerId);

      if (deleteError) throw deleteError;

      // Insert new availability
      const { error: insertError } = await supabase
        .from('provider_availability')
        .insert(
          availability.map(day => ({
            provider_id: providerId,
            day_of_week: day.day_of_week,
            is_working_day: day.is_working_day,
            start_time: day.start_time,
            end_time: day.end_time,
            break_start: day.break_start,
            break_end: day.break_end
          }))
        );

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error updating weekly availability:', error);
      throw error;
    }
  }

  /**
   * Get provider's exception dates (holidays, special hours, etc.)
   */
  async getExceptionDates(
    providerId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<ExceptionDate[]> {
    try {
      let query = supabase
        .from('provider_exceptions')
        .select('*')
        .eq('provider_id', providerId);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query.order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching exception dates:', error);
      throw error;
    }
  }

  /**
   * Add exception date
   */
  async addExceptionDate(exception: ExceptionDate): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_exceptions')
        .insert(exception);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding exception date:', error);
      throw error;
    }
  }

  /**
   * Remove exception date
   */
  async removeExceptionDate(exceptionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing exception date:', error);
      throw error;
    }
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlots(
    providerId: string, 
    serviceId: string, 
    date: string
  ): Promise<TimeSlot[]> {
    try {
      // Get service duration
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('duration_minutes, preparation_time_minutes, cleanup_time_minutes')
        .eq('id', serviceId)
        .single();

      if (serviceError) throw serviceError;

      const totalDuration = 
        (service.duration_minutes || 30) + 
        (service.preparation_time_minutes || 0) + 
        (service.cleanup_time_minutes || 0);

      // Get provider's schedule for the day
      const dayOfWeek = new Date(date).getDay();
      const { data: schedule, error: scheduleError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (scheduleError || !schedule || !schedule.is_working_day) {
        return [];
      }

      // Check for exception date
      const { data: exception } = await supabase
        .from('provider_exceptions')
        .select('*')
        .eq('provider_id', providerId)
        .eq('date', date)
        .single();

      let startTime = schedule.start_time;
      let endTime = schedule.end_time;
      let breakStart = schedule.break_start;
      let breakEnd = schedule.break_end;

      if (exception) {
        if (!exception.is_working_day) {
          return [];
        }
        startTime = exception.start_time || startTime;
        endTime = exception.end_time || endTime;
      }

      // Get existing bookings for the date
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('start_time, end_time, status')
        .eq('provider_id', providerId)
        .eq('booking_date', date)
        .in('status', ['confirmed', 'in_progress']);

      if (bookingsError) throw bookingsError;

      // Generate time slots
      const slots: TimeSlot[] = [];
      const increment = 30; // 30-minute slots
      
      let currentTime = this.timeToMinutes(startTime);
      const endMinutes = this.timeToMinutes(endTime);
      const breakStartMinutes = breakStart ? this.timeToMinutes(breakStart) : null;
      const breakEndMinutes = breakEnd ? this.timeToMinutes(breakEnd) : null;

      while (currentTime + totalDuration <= endMinutes) {
        const slotStart = this.minutesToTime(currentTime);
        const slotEnd = this.minutesToTime(currentTime + totalDuration);

        // Check if slot is during break time
        if (breakStartMinutes && breakEndMinutes) {
          if (currentTime >= breakStartMinutes && currentTime < breakEndMinutes) {
            currentTime += increment;
            continue;
          }
        }

        // Check if slot conflicts with existing bookings
        const hasConflict = bookings?.some(booking => {
          const bookingStart = this.timeToMinutes(booking.start_time);
          const bookingEnd = this.timeToMinutes(booking.end_time);
          const slotStartMinutes = currentTime;
          const slotEndMinutes = currentTime + totalDuration;

          return (slotStartMinutes < bookingEnd && slotEndMinutes > bookingStart);
        });

        slots.push({
          date,
          time: slotStart,
          available: !hasConflict,
          reason: hasConflict ? 'booked' : undefined
        });

        currentTime += increment;
      }

      return slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Get provider's availability settings
   */
  async getAvailabilitySettings(providerId: string): Promise<AvailabilitySettings> {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('max_advance_booking_days, min_advance_booking_hours, buffer_time_minutes, allow_same_day_booking')
        .eq('id', providerId)
        .single();

      if (error) throw error;

      return {
        max_advance_booking_days: data?.max_advance_booking_days || 30,
        min_advance_booking_hours: data?.min_advance_booking_hours || 2,
        buffer_time_minutes: data?.buffer_time_minutes || 0,
        allow_same_day_booking: data?.allow_same_day_booking ?? true,
        booking_time_increment: 30 // Default to 30 minutes
      };
    } catch (error) {
      console.error('Error fetching availability settings:', error);
      throw error;
    }
  }

  /**
   * Update provider's availability settings
   */
  async updateAvailabilitySettings(
    providerId: string, 
    settings: Partial<AvailabilitySettings>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('providers')
        .update({
          max_advance_booking_days: settings.max_advance_booking_days,
          min_advance_booking_hours: settings.min_advance_booking_hours,
          buffer_time_minutes: settings.buffer_time_minutes,
          allow_same_day_booking: settings.allow_same_day_booking,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating availability settings:', error);
      throw error;
    }
  }

  /**
   * Check if a specific time slot is available
   */
  async checkSlotAvailability(
    providerId: string,
    serviceId: string,
    date: string,
    time: string
  ): Promise<boolean> {
    try {
      const slots = await this.getAvailableSlots(providerId, serviceId, date);
      const slot = slots.find(s => s.time === time);
      return slot?.available || false;
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return false;
    }
  }

  // Helper methods
  private getDefaultWeeklySchedule(providerId: string): WeeklyAvailability[] {
    const defaultSchedule: WeeklyAvailability[] = [];
    
    for (let day = 0; day < 7; day++) {
      defaultSchedule.push({
        provider_id: providerId,
        day_of_week: day,
        is_working_day: day >= 1 && day <= 5, // Monday to Friday
        start_time: '09:00',
        end_time: '18:00',
        break_start: '13:00',
        break_end: '14:00'
      });
    }
    
    return defaultSchedule;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService();