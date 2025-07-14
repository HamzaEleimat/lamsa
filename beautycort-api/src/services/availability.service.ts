import { supabase } from '../config/supabase-simple';
import { prayerTimeService } from './prayer-time.service';
import { AppError } from '../middleware/error.middleware';
import { format, addMinutes, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  type: 'regular' | 'instant' | 'emergency' | 'women_only';
  reason?: string;
}

interface AvailabilityCheck {
  providerId: string;
  serviceId: string;
  date: Date;
  time?: string;
  duration?: number;
  customerId?: string;
}

interface WorkingShift {
  start_time: string;
  end_time: string;
  shift_type: string;
  max_bookings?: number;
}

interface Break {
  start_time?: string;
  end_time?: string;
  break_type: string;
  break_name?: string;
  is_dynamic: boolean;
  prayer_name?: string;
  duration_minutes?: number;
  is_flexible?: boolean;
  flexibility_minutes?: number;
}

export class AvailabilityService {
  private static instance: AvailabilityService;

  private constructor() {}

  static getInstance(): AvailabilityService {
    if (!AvailabilityService.instance) {
      AvailabilityService.instance = new AvailabilityService();
    }
    return AvailabilityService.instance;
  }

  /**
   * Get available time slots for a provider on a specific date
   */
  async getAvailableSlots(
    providerId: string,
    date: Date,
    serviceId?: string,
    options: {
      includeInstant?: boolean;
      includeEmergency?: boolean;
      customerGender?: 'male' | 'female';
    } = {}
  ): Promise<TimeSlot[]> {
    try {
      // Get provider settings
      const settings = await this.getProviderSettings(providerId);
      
      // Get active schedule for the date
      const schedule = await this.getActiveSchedule(providerId, date);
      if (!schedule) {
        return [];
      }

      // Get service details and buffer times
      const serviceDetails = serviceId ? await this.getServiceDetails(serviceId) : null;
      const duration = serviceDetails?.total_duration || 30;
      
      // Get shifts for the day
      const shifts = await this.getShiftsForDay(schedule.id, date);
      if (shifts.length === 0) {
        return [];
      }

      // Get all breaks (fixed and dynamic)
      const breaks = await this.getAllBreaks(providerId, schedule.id, date);
      
      // Get existing bookings
      const bookings = await this.getExistingBookings(providerId, date);
      
      // Get time off
      const timeOff = await this.getTimeOff(providerId, date);
      
      // Calculate available slots
      const slots: TimeSlot[] = [];
      
      for (const shift of shifts) {
        const shiftSlots = this.calculateSlotsForShift(
          shift,
          breaks,
          bookings,
          timeOff,
          duration,
          settings,
          options
        );
        slots.push(...shiftSlots);
      }

      // Filter slots based on advance booking rules
      const now = new Date();
      const minBookingTime = addMinutes(now, settings.min_advance_booking_hours * 60);
      const maxBookingDate = new Date(now);
      maxBookingDate.setDate(maxBookingDate.getDate() + settings.max_advance_booking_days);

      return slots.filter(slot => {
        const slotDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${slot.start}`);
        return isAfter(slotDateTime, minBookingTime) && isBefore(slotDateTime, maxBookingDate);
      });
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Check if a specific time slot is available
   */
  async checkSlotAvailability(check: AvailabilityCheck): Promise<{
    available: boolean;
    reason?: string;
    alternativeSlots?: TimeSlot[];
  }> {
    try {
      const { providerId, serviceId, date, time } = check;
      
      if (!time) {
        throw new AppError('Time is required for availability check', 400);
      }

      // Get available slots
      const slots = await this.getAvailableSlots(providerId, date, serviceId);
      
      // Check if requested time matches any available slot
      const requestedSlot = slots.find(slot => slot.start === time && slot.available);
      
      if (requestedSlot) {
        return { available: true };
      }

      // Find reason why slot is not available
      let reason = 'Time slot not available';
      
      // Check if it's during a break
      const settings = await this.getProviderSettings(providerId);
      const schedule = await this.getActiveSchedule(providerId, date);
      if (schedule) {
        const breaks = await this.getAllBreaks(providerId, schedule.id, date);
        for (const breakItem of breaks) {
          if (this.isTimeInBreak(time, breakItem)) {
            reason = `${breakItem.break_name || breakItem.break_type} break`;
            break;
          }
        }
      }

      // Get alternative slots
      const alternativeSlots = slots
        .filter(slot => slot.available)
        .slice(0, 5); // Return up to 5 alternatives

      return {
        available: false,
        reason,
        alternativeSlots,
      };
    } catch (error) {
      console.error('Error checking slot availability:', error);
      throw error;
    }
  }

  /**
   * Book a time slot
   */
  async bookSlot(
    providerId: string,
    serviceId: string,
    customerId: string,
    date: Date,
    time: string
  ): Promise<string> {
    try {
      // Double-check availability
      const availability = await this.checkSlotAvailability({
        providerId,
        serviceId,
        date,
        time,
        customerId,
      });

      if (!availability.available) {
        throw new AppError(
          `Slot not available: ${availability.reason}`,
          400
        );
      }

      // Get service details
      const serviceDetails = await this.getServiceDetails(serviceId);
      const endTime = this.addMinutesToTime(time, serviceDetails.total_duration);

      // Create booking
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          user_id: customerId,
          provider_id: providerId,
          service_id: serviceId,
          booking_date: format(date, 'yyyy-MM-dd'),
          start_time: time,
          end_time: endTime,
          status: 'pending',
          total_price: serviceDetails.price,
        })
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to create booking', 500);
      }

      // Update availability cache
      await this.updateAvailabilityCache(providerId, date);

      return booking.id;
    } catch (error) {
      console.error('Error booking slot:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  
  private async getProviderSettings(providerId: string): Promise<any> {
    const { data, error } = await supabase
      .from('provider_availability_settings')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (error || !data) {
      // Return default settings
      return {
        advance_booking_days: 30,
        min_advance_booking_hours: 2,
        max_advance_booking_days: 90,
        default_preparation_minutes: 0,
        default_cleanup_minutes: 0,
        between_appointments_minutes: 0,
        enable_prayer_breaks: true,
        prayer_time_flexibility_minutes: 15,
        auto_adjust_prayer_times: true,
        auto_switch_ramadan_schedule: true,
      };
    }

    return data;
  }

  private async getActiveSchedule(providerId: string, date: Date): Promise<any> {
    const { data, error } = await supabase
      .from('provider_working_schedules')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .or(`effective_from.is.null,effective_from.lte.${format(date, 'yyyy-MM-dd')}`)
      .or(`effective_to.is.null,effective_to.gte.${format(date, 'yyyy-MM-dd')}`)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  private async getShiftsForDay(scheduleId: string, date: Date): Promise<WorkingShift[]> {
    const dayOfWeek = date.getDay();
    
    const { data, error } = await supabase
      .from('provider_schedule_shifts')
      .select('*')
      .eq('schedule_id', scheduleId)
      .eq('day_of_week', dayOfWeek);

    return data || [];
  }

  private async getAllBreaks(
    providerId: string,
    scheduleId: string,
    date: Date
  ): Promise<Break[]> {
    const dayOfWeek = date.getDay();
    
    // Get fixed breaks
    const { data: fixedBreaks } = await supabase
      .from('provider_breaks')
      .select('*')
      .eq('schedule_id', scheduleId)
      .eq('day_of_week', dayOfWeek);

    const breaks: Break[] = fixedBreaks || [];

    // Get prayer breaks if enabled
    const settings = await this.getProviderSettings(providerId);
    if (settings.enable_prayer_breaks) {
      // Get provider city
      const { data: provider } = await supabase
        .from('providers')
        .select('city')
        .eq('id', providerId)
        .single();

      if (provider?.city) {
        const prayerBreaks = await prayerTimeService.calculatePrayerBreaks(
          providerId,
          date,
          provider.city
        );

        // Convert prayer breaks to Break format
        for (const prayerBreak of prayerBreaks) {
          breaks.push({
            break_type: 'prayer',
            break_name: `${prayerBreak.name} Prayer`,
            start_time: prayerBreak.start,
            end_time: prayerBreak.end,
            is_dynamic: true,
            prayer_name: prayerBreak.name,
            is_flexible: true,
            flexibility_minutes: settings.prayer_time_flexibility_minutes,
          });
        }
      }
    }

    return breaks;
  }

  private async getExistingBookings(providerId: string, date: Date): Promise<any[]> {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', providerId)
      .eq('booking_date', format(date, 'yyyy-MM-dd'))
      .in('status', ['pending', 'confirmed']);

    return data || [];
  }

  private async getTimeOff(providerId: string, date: Date): Promise<any[]> {
    const { data } = await supabase
      .from('provider_time_off')
      .select('*')
      .eq('provider_id', providerId)
      .lte('start_date', format(date, 'yyyy-MM-dd'))
      .gte('end_date', format(date, 'yyyy-MM-dd'))
      .eq('block_bookings', true);

    return data || [];
  }

  private async getServiceDetails(serviceId: string): Promise<any> {
    const { data: service } = await supabase
      .from('services')
      .select(`
        *,
        service_buffer_rules(*)
      `)
      .eq('id', serviceId)
      .single();

    if (!service) {
      throw new AppError('Service not found', 404);
    }

    const bufferRules = service.service_buffer_rules?.[0] || {};
    
    return {
      ...service,
      total_duration: 
        (bufferRules.preparation_minutes || 0) +
        (bufferRules.service_minutes || service.duration_minutes) +
        (bufferRules.cleanup_minutes || 0),
    };
  }

  private calculateSlotsForShift(
    shift: WorkingShift,
    breaks: Break[],
    bookings: any[],
    timeOff: any[],
    duration: number,
    settings: any,
    options: any
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotInterval = 15; // 15-minute intervals
    
    let currentTime = shift.start_time;
    
    while (this.isTimeBefore(currentTime, shift.end_time)) {
      const endTime = this.addMinutesToTime(currentTime, duration);
      
      // Check if slot extends beyond shift
      if (this.isTimeAfter(endTime, shift.end_time)) {
        break;
      }

      let available = true;
      let reason = '';
      let type: TimeSlot['type'] = shift.shift_type as TimeSlot['type'] || 'regular';

      // Check for time off
      for (const off of timeOff) {
        if (!off.start_time || !off.end_time) {
          // Full day off
          available = false;
          reason = off.reason || 'Time off';
          break;
        }
        // Check specific time range
        if (this.timeRangesOverlap(
          currentTime, endTime,
          off.start_time, off.end_time
        )) {
          available = false;
          reason = off.reason || 'Time off';
          break;
        }
      }

      // Check for breaks
      if (available) {
        for (const breakItem of breaks) {
          if (breakItem.start_time && breakItem.end_time) {
            if (this.timeRangesOverlap(
              currentTime, endTime,
              breakItem.start_time, breakItem.end_time
            )) {
              available = false;
              reason = breakItem.break_name || breakItem.break_type;
              break;
            }
          }
        }
      }

      // Check for existing bookings
      if (available) {
        for (const booking of bookings) {
          if (this.timeRangesOverlap(
            currentTime, endTime,
            booking.start_time, booking.end_time
          )) {
            available = false;
            reason = 'Already booked';
            break;
          }
        }
      }

      // Add slot
      slots.push({
        start: currentTime,
        end: endTime,
        available,
        type,
        reason: available ? undefined : reason,
      });

      // Move to next slot
      currentTime = this.addMinutesToTime(currentTime, slotInterval);
    }

    return slots;
  }

  private async updateAvailabilityCache(providerId: string, date: Date): Promise<void> {
    // Mark cached slots as expired
    await supabase
      .from('availability_slots')
      .update({ expires_at: new Date().toISOString() })
      .eq('provider_id', providerId)
      .eq('slot_date', format(date, 'yyyy-MM-dd'));
  }

  // Time utility methods
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:00`;
  }

  private isTimeBefore(time1: string, time2: string): boolean {
    return time1 < time2;
  }

  private isTimeAfter(time1: string, time2: string): boolean {
    return time1 > time2;
  }

  private timeRangesOverlap(
    start1: string, end1: string,
    start2: string, end2: string
  ): boolean {
    return (start1 < end2) && (end1 > start2);
  }

  private isTimeInBreak(time: string, breakItem: Break): boolean {
    if (!breakItem.start_time || !breakItem.end_time) {
      return false;
    }
    return time >= breakItem.start_time && time < breakItem.end_time;
  }
}

export const availabilityService = AvailabilityService.getInstance();