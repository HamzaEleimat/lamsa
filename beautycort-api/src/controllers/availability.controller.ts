import { Request, Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { supabase } from '../config/supabase-simple';
import { availabilityService } from '../services/availability.service';
import { prayerTimeService } from '../services/prayer-time.service';
import { format, parseISO, addDays, startOfWeek, endOfWeek } from 'date-fns/index.js';

export class AvailabilityController {
  /**
   * Get provider availability settings
   * GET /api/providers/:id/availability/settings
   */
  async getAvailabilitySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('Unauthorized to view these settings', 403);
      }

      const { data: settings, error } = await supabase
        .from('provider_availability_settings')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw new AppError('Failed to fetch settings', 500);
      }

      // Return settings or defaults
      const response: ApiResponse = {
        success: true,
        data: settings || {
          provider_id: providerId,
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
          allow_instant_booking: false,
          require_deposit: false,
          deposit_percentage: 0,
          cancellation_notice_hours: 24,
          women_only_hours_enabled: false,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update provider availability settings
   * PUT /api/providers/:id/availability/settings
   */
  async updateAvailabilitySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('Unauthorized to update these settings', 403);
      }

      const settings = req.body;

      const { data, error } = await supabase
        .from('provider_availability_settings')
        .upsert({
          provider_id: providerId,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to update settings', 500);
      }

      const response: ApiResponse = {
        success: true,
        data,
        message: 'Settings updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available time slots
   * GET /api/providers/:id/availability/slots
   */
  async getAvailableSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      const { date, serviceId, includeInstant, customerGender } = req.query;

      if (!date) {
        throw new AppError('Date is required', 400);
      }

      const slots = await availabilityService.getAvailableSlots(
        providerId,
        parseISO(date as string),
        serviceId as string,
        {
          includeInstant: includeInstant === 'true',
          customerGender: customerGender as 'male' | 'female',
        }
      );

      const response: ApiResponse = {
        success: true,
        data: slots,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check specific slot availability
   * POST /api/providers/:id/availability/check
   */
  async checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      const { serviceId, date, time } = req.body;

      if (!serviceId || !date || !time) {
        throw new AppError('Service ID, date, and time are required', 400);
      }

      const availability = await availabilityService.checkSlotAvailability({
        providerId,
        serviceId,
        date: parseISO(date),
        time,
      });

      const response: ApiResponse = {
        success: true,
        data: availability,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add time off
   * POST /api/providers/:id/availability/time-off
   */
  async addTimeOff(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('Unauthorized to add time off', 403);
      }

      const timeOffData = req.body;

      const { data, error } = await supabase
        .from('provider_time_off')
        .insert({
          provider_id: providerId,
          ...timeOffData,
        })
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to add time off', 500);
      }

      // Handle existing bookings if needed
      if (timeOffData.auto_reschedule) {
        // TODO: Implement auto-rescheduling logic
      }

      const response: ApiResponse = {
        success: true,
        data,
        message: 'Time off added successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete time off
   * DELETE /api/providers/:id/availability/time-off/:timeOffId
   */
  async deleteTimeOff(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId, timeOffId } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('Unauthorized to delete time off', 403);
      }

      const { error } = await supabase
        .from('provider_time_off')
        .delete()
        .eq('id', timeOffId)
        .eq('provider_id', providerId);

      if (error) {
        throw new AppError('Failed to delete time off', 500);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Time off deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get prayer settings
   * GET /api/providers/:id/availability/prayer-settings
   */
  async getPrayerSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('Unauthorized to view prayer settings', 403);
      }

      const { data: settings } = await supabase
        .from('provider_availability_settings')
        .select('enable_prayer_breaks, prayer_time_flexibility_minutes, auto_adjust_prayer_times, prayer_calculation_method')
        .eq('provider_id', providerId)
        .single();

      // Get provider city for prayer times
      const { data: provider } = await supabase
        .from('providers')
        .select('city')
        .eq('id', providerId)
        .single();

      // Get today's prayer times
      let prayerTimes = null;
      if (provider?.city) {
        try {
          prayerTimes = await prayerTimeService.getPrayerTimes(provider.city, new Date());
        } catch (error) {
          console.error('Error fetching prayer times:', error);
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          settings: settings || {
            enable_prayer_breaks: true,
            prayer_time_flexibility_minutes: 15,
            auto_adjust_prayer_times: true,
            prayer_calculation_method: 'jordan',
          },
          todayPrayerTimes: prayerTimes,
          supportedCities: prayerTimeService.getSupportedCities(),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update prayer settings
   * PUT /api/providers/:id/availability/prayer-settings
   */
  async updatePrayerSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('Unauthorized to update prayer settings', 403);
      }

      const prayerSettings = req.body;

      const { data, error } = await supabase
        .from('provider_availability_settings')
        .upsert({
          provider_id: providerId,
          ...prayerSettings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to update prayer settings', 500);
      }

      const response: ApiResponse = {
        success: true,
        data,
        message: 'Prayer settings updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Ramadan schedule
   * GET /api/providers/:id/availability/ramadan-schedule
   */
  async getRamadanSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      const { year } = req.query;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('Unauthorized to view Ramadan schedule', 403);
      }

      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

      const { data: schedule } = await supabase
        .from('ramadan_schedules')
        .select('*')
        .eq('provider_id', providerId)
        .eq('year', currentYear)
        .single();

      // Get Ramadan dates for the year
      const ramadanDates = await prayerTimeService.getRamadanDates(currentYear);

      const response: ApiResponse = {
        success: true,
        data: {
          schedule: schedule || {
            provider_id: providerId,
            year: currentYear,
            template_type: 'standard',
            early_start_time: '09:00:00',
            early_end_time: '15:00:00',
            late_start_time: '21:00:00',
            late_end_time: '00:00:00',
            iftar_break_minutes: 60,
            auto_adjust_maghrib: true,
            offer_home_service_only: false,
          },
          ramadanDates,
          isCurrentlyRamadan: await prayerTimeService.isRamadan(new Date()),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Ramadan schedule
   * PUT /api/providers/:id/availability/ramadan-schedule
   */
  async updateRamadanSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('Unauthorized to update Ramadan schedule', 403);
      }

      const scheduleData = req.body;

      const { data, error } = await supabase
        .from('ramadan_schedules')
        .upsert({
          provider_id: providerId,
          ...scheduleData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to update Ramadan schedule', 500);
      }

      const response: ApiResponse = {
        success: true,
        data,
        message: 'Ramadan schedule updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get weekly schedule
   * GET /api/providers/:id/availability/weekly-schedule
   */
  async getWeeklySchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      const { date } = req.query;
      
      const targetDate = date ? parseISO(date as string) : new Date();
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 }); // Sunday
      const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });

      // Get active schedule
      const { data: schedule } = await supabase
        .from('provider_working_schedules')
        .select(`
          *,
          provider_schedule_shifts(*),
          provider_breaks(*)
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      // Get time off for the week
      const { data: timeOff } = await supabase
        .from('provider_time_off')
        .select('*')
        .eq('provider_id', providerId)
        .gte('start_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('end_date', format(weekEnd, 'yyyy-MM-dd'));

      // Build weekly view
      const weeklySchedule = [];
      for (let i = 0; i < 7; i++) {
        const currentDate = addDays(weekStart, i);
        const dayOfWeek = currentDate.getDay();
        
        const daySchedule = {
          date: format(currentDate, 'yyyy-MM-dd'),
          dayOfWeek,
          shifts: schedule?.provider_schedule_shifts?.filter(s => s.day_of_week === dayOfWeek) || [],
          breaks: schedule?.provider_breaks?.filter(b => b.day_of_week === dayOfWeek) || [],
          timeOff: timeOff?.filter(t => 
            currentDate >= parseISO(t.start_date) && 
            currentDate <= parseISO(t.end_date)
          ) || [],
        };
        
        weeklySchedule.push(daySchedule);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          schedule,
          weeklySchedule,
          weekStart: format(weekStart, 'yyyy-MM-dd'),
          weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update working schedule
   * POST /api/providers/:id/availability/schedules
   */
  async createSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: providerId } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('Unauthorized to create schedule', 403);
      }

      const { schedule, shifts, breaks } = req.body;

      // Create schedule
      const { data: newSchedule, error: scheduleError } = await supabase
        .from('provider_working_schedules')
        .insert({
          provider_id: providerId,
          ...schedule,
        })
        .select()
        .single();

      if (scheduleError) {
        throw new AppError('Failed to create schedule', 500);
      }

      // Create shifts
      if (shifts && shifts.length > 0) {
        const shiftsData = shifts.map((shift: any) => ({
          schedule_id: newSchedule.id,
          ...shift,
        }));

        const { error: shiftsError } = await supabase
          .from('provider_schedule_shifts')
          .insert(shiftsData);

        if (shiftsError) {
          // Rollback
          await supabase.from('provider_working_schedules').delete().eq('id', newSchedule.id);
          throw new AppError('Failed to create shifts', 500);
        }
      }

      // Create breaks
      if (breaks && breaks.length > 0) {
        const breaksData = breaks.map((breakItem: any) => ({
          schedule_id: newSchedule.id,
          ...breakItem,
        }));

        const { error: breaksError } = await supabase
          .from('provider_breaks')
          .insert(breaksData);

        if (breaksError) {
          // Rollback
          await supabase.from('provider_working_schedules').delete().eq('id', newSchedule.id);
          throw new AppError('Failed to create breaks', 500);
        }
      }

      const response: ApiResponse = {
        success: true,
        data: newSchedule,
        message: 'Schedule created successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const availabilityController = new AvailabilityController();