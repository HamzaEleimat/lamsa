/**
 * Unit Tests for Availability Configuration
 * Tests Jordan work week, prayer times integration, and scheduling
 */

import { Request, Response } from 'express';
import {
  updateProviderAvailability,
  getAvailabilitySchedule,
  updatePrayerTimeSettings,
  setSpecialHours,
  getAvailableSlots
} from '../../../src/controllers/availability.controller';
import * as prayerTimeService from '../../../src/services/prayer-time.service';
import * as supabaseSimple from '../../../src/config/supabase-simple';

// Mock dependencies
jest.mock('../../../src/services/prayer-time.service');
jest.mock('../../../src/config/supabase-simple');

const mockPrayerTimeService = prayerTimeService as jest.Mocked<typeof prayerTimeService>;
const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;

describe('Availability Configuration', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  const mockProviderUser = {
    userId: 'provider-123',
    role: 'provider',
    phone: '+962771234567'
  };

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: mockProviderUser
    };
    
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy
    };

    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('Jordan Work Week Configuration', () => {
    const jordanWorkWeekSchedule = {
      workingDays: {
        sunday: {
          isWorking: true,
          shifts: [
            { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
            { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
          ],
          breakTimes: [
            { start: '13:00', end: '15:00', name: 'Lunch Break', nameAr: 'استراحة الغداء' }
          ]
        },
        monday: {
          isWorking: true,
          shifts: [
            { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
            { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
          ]
        },
        tuesday: {
          isWorking: true,
          shifts: [
            { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
            { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
          ]
        },
        wednesday: {
          isWorking: true,
          shifts: [
            { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
            { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
          ]
        },
        thursday: {
          isWorking: true,
          shifts: [
            { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
            { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
          ]
        },
        friday: {
          isWorking: false, // Friday is typically a day off in Jordan
          note: 'Day off - Friday prayer day',
          noteAr: 'يوم عطلة - يوم صلاة الجمعة'
        },
        saturday: {
          isWorking: true,
          shifts: [
            { start: '10:00', end: '16:00', name: 'Weekend Hours', nameAr: 'ساعات نهاية الأسبوع' }
          ]
        }
      },
      timezone: 'Asia/Amman',
      slotDuration: 30, // 30-minute slots
      bufferTime: 15, // 15-minute buffer between appointments
      maxAdvanceBooking: 30 // 30 days in advance
    };

    test('should set Jordan work week schedule', async () => {
      mockSupabase.updateProviderAvailability.mockResolvedValue({
        success: true,
        availability: jordanWorkWeekSchedule
      });

      mockReq.body = jordanWorkWeekSchedule;

      await updateProviderAvailability(mockReq as Request, mockRes as Response);

      expect(mockSupabase.updateProviderAvailability).toHaveBeenCalledWith(
        'provider-123',
        expect.objectContaining(jordanWorkWeekSchedule)
      );

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Provider availability updated successfully',
        messageAr: 'تم تحديث توفر مقدم الخدمة بنجاح',
        availability: jordanWorkWeekSchedule
      });
    });

    test('should validate working hours format', async () => {
      const invalidTimeFormat = {
        workingDays: {
          sunday: {
            isWorking: true,
            shifts: [
              { start: '9:00', end: '17:00' }, // Invalid format (should be 09:00)
              { start: '25:00', end: '18:00' } // Invalid hour
            ]
          }
        }
      };

      mockReq.body = invalidTimeFormat;

      await updateProviderAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TIME_FORMAT',
        message: 'Working hours must be in HH:MM format (24-hour)',
        messageAr: 'ساعات العمل يجب أن تكون بتنسيق HH:MM (24 ساعة)',
        invalidTimes: ['9:00', '25:00']
      });
    });

    test('should validate shift logic (end after start)', async () => {
      const invalidShiftLogic = {
        workingDays: {
          sunday: {
            isWorking: true,
            shifts: [
              { start: '18:00', end: '09:00' } // End before start
            ]
          }
        }
      };

      mockReq.body = invalidShiftLogic;

      await updateProviderAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_SHIFT_TIMES',
        message: 'Shift end time must be after start time',
        messageAr: 'وقت انتهاء الوردية يجب أن يكون بعد وقت البداية',
        invalidShifts: [{ day: 'sunday', shift: { start: '18:00', end: '09:00' } }]
      });
    });

    test('should validate overlapping shifts', async () => {
      const overlappingShifts = {
        workingDays: {
          sunday: {
            isWorking: true,
            shifts: [
              { start: '09:00', end: '13:00' },
              { start: '12:00', end: '16:00' } // Overlaps with previous shift
            ]
          }
        }
      };

      mockReq.body = overlappingShifts;

      await updateProviderAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'OVERLAPPING_SHIFTS',
        message: 'Working shifts cannot overlap',
        messageAr: 'وردايات العمل لا يمكن أن تتداخل',
        overlappingShifts: expect.arrayContaining([
          expect.objectContaining({ day: 'sunday' })
        ])
      });
    });

    test('should validate slot duration and buffer time', async () => {
      const invalidSlotConfig = {
        slotDuration: 5, // Too short
        bufferTime: 60, // Too long
        maxAdvanceBooking: 0 // Invalid
      };

      mockReq.body = invalidSlotConfig;

      await updateProviderAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_SLOT_CONFIGURATION',
        message: 'Invalid slot duration, buffer time, or advance booking settings',
        messageAr: 'إعدادات مدة الفترة أو وقت الانتظار أو الحجز المسبق غير صحيحة',
        validationErrors: {
          slotDuration: 'Must be between 15 and 120 minutes',
          bufferTime: 'Must be between 0 and 30 minutes',
          maxAdvanceBooking: 'Must be between 1 and 90 days'
        }
      });
    });
  });

  describe('Prayer Times Integration', () => {
    const prayerTimeSettings = {
      enabled: true,
      autoBlock: true, // Automatically block appointment slots during prayer times
      blockDuration: 30, // Block 30 minutes for each prayer
      prayerTimes: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'],
      customSettings: {
        fajr: { enabled: false }, // Don't block for Fajr (too early)
        dhuhr: { enabled: true, blockBefore: 10, blockAfter: 20 }, // 10 min before, 20 min after
        asr: { enabled: true, blockBefore: 5, blockAfter: 15 },
        maghrib: { enabled: true, blockBefore: 15, blockAfter: 30 },
        isha: { enabled: false } // Don't block for Isha (too late)
      },
      location: {
        city: 'Amman',
        cityAr: 'عمان',
        coordinates: { lat: 31.9566, lng: 35.9457 }
      },
      calculationMethod: 'IslamicSocietyOfNorthAmerica' // ISNA method commonly used in Jordan
    };

    test('should configure prayer time integration', async () => {
      mockPrayerTimeService.validatePrayerTimeSettings.mockReturnValue({ isValid: true });
      mockSupabase.updatePrayerTimeSettings.mockResolvedValue({
        success: true,
        settings: prayerTimeSettings
      });

      mockReq.body = prayerTimeSettings;

      await updatePrayerTimeSettings(mockReq as Request, mockRes as Response);

      expect(mockPrayerTimeService.validatePrayerTimeSettings).toHaveBeenCalledWith(prayerTimeSettings);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Prayer time settings updated successfully',
        messageAr: 'تم تحديث إعدادات أوقات الصلاة بنجاح',
        settings: prayerTimeSettings
      });
    });

    test('should validate prayer time calculation method', async () => {
      const invalidMethodSettings = {
        ...prayerTimeSettings,
        calculationMethod: 'InvalidMethod'
      };

      mockReq.body = invalidMethodSettings;

      await updatePrayerTimeSettings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_CALCULATION_METHOD',
        message: 'Invalid prayer time calculation method',
        messageAr: 'طريقة حساب أوقات الصلاة غير صحيحة',
        allowedMethods: expect.arrayContaining([
          'IslamicSocietyOfNorthAmerica',
          'MuslimWorldLeague',
          'EgyptianGeneralAuthorityOfSurvey',
          'Jordan' // Jordan-specific method
        ])
      });
    });

    test('should validate prayer time block durations', async () => {
      const invalidBlockSettings = {
        ...prayerTimeSettings,
        customSettings: {
          dhuhr: { enabled: true, blockBefore: -5, blockAfter: 120 } // Invalid values
        }
      };

      mockReq.body = invalidBlockSettings;

      await updatePrayerTimeSettings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_BLOCK_DURATION',
        message: 'Prayer time block durations must be between 0 and 60 minutes',
        messageAr: 'مدة حجب أوقات الصلاة يجب أن تكون بين 0 و 60 دقيقة',
        invalidSettings: {
          dhuhr: { blockBefore: 'Must be 0-60 minutes', blockAfter: 'Must be 0-60 minutes' }
        }
      });
    });

    test('should get today prayer times for Amman', async () => {
      const todayPrayerTimes = {
        date: '2024-07-17',
        location: 'Amman, Jordan',
        times: {
          fajr: '04:32',
          sunrise: '05:59',
          dhuhr: '12:37',
          asr: '16:13',
          maghrib: '19:15',
          isha: '20:41'
        },
        timezone: 'Asia/Amman'
      };

      mockPrayerTimeService.getTodayPrayerTimes.mockResolvedValue(todayPrayerTimes);
      mockReq.query = { date: '2024-07-17' };

      await getAvailabilitySchedule(mockReq as Request, mockRes as Response);

      expect(mockPrayerTimeService.getTodayPrayerTimes).toHaveBeenCalledWith(
        { lat: 31.9566, lng: 35.9457 },
        '2024-07-17'
      );
    });
  });

  describe('Special Hours and Holidays', () => {
    test('should set Ramadan special hours', async () => {
      const ramadanHours = {
        type: 'ramadan',
        period: {
          start: '2024-03-11', // Ramadan start
          end: '2024-04-09' // Ramadan end
        },
        workingDays: {
          sunday: {
            isWorking: true,
            shifts: [
              { start: '10:00', end: '14:00', name: 'Ramadan Hours', nameAr: 'ساعات رمضان' },
              { start: '20:00', end: '23:00', name: 'Evening Hours', nameAr: 'ساعات المساء' }
            ]
          },
          monday: {
            isWorking: true,
            shifts: [
              { start: '10:00', end: '14:00', name: 'Ramadan Hours', nameAr: 'ساعات رمضان' },
              { start: '20:00', end: '23:00', name: 'Evening Hours', nameAr: 'ساعات المساء' }
            ]
          },
          // ... other days with Ramadan-adjusted hours
          friday: {
            isWorking: true, // Special Friday hours during Ramadan
            shifts: [
              { start: '14:30', end: '17:00', name: 'After Jummah', nameAr: 'بعد صلاة الجمعة' }
            ]
          }
        },
        description: 'Special working hours during Ramadan',
        descriptionAr: 'ساعات عمل خاصة خلال شهر رمضان',
        autoApply: true
      };

      mockSupabase.setSpecialHours.mockResolvedValue({
        success: true,
        specialHours: ramadanHours
      });

      mockReq.body = ramadanHours;

      await setSpecialHours(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Special hours set successfully',
        messageAr: 'تم تعيين الساعات الخاصة بنجاح',
        specialHours: ramadanHours
      });
    });

    test('should set Eid holiday periods', async () => {
      const eidHoliday = {
        type: 'eid_holiday',
        period: {
          start: '2024-07-17', // Eid Al-Adha
          end: '2024-07-19'
        },
        workingDays: {
          // All days marked as not working during Eid
          sunday: { isWorking: false },
          monday: { isWorking: false },
          tuesday: { isWorking: false }
        },
        description: 'Eid Al-Adha holiday',
        descriptionAr: 'عطلة عيد الأضحى المبارك',
        autoReschedule: true, // Automatically offer to reschedule existing appointments
        notificationMessage: 'Salon closed for Eid celebrations',
        notificationMessageAr: 'الصالون مغلق لاحتفالات العيد'
      };

      mockSupabase.setSpecialHours.mockResolvedValue({
        success: true,
        specialHours: eidHoliday
      });

      mockReq.body = eidHoliday;

      await setSpecialHours(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Holiday period set successfully',
        messageAr: 'تم تعيين فترة العطلة بنجاح',
        specialHours: eidHoliday
      });
    });

    test('should validate special hours date range', async () => {
      const invalidDateRange = {
        type: 'custom',
        period: {
          start: '2024-07-20',
          end: '2024-07-15' // End before start
        }
      };

      mockReq.body = invalidDateRange;

      await setSpecialHours(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_DATE_RANGE',
        message: 'End date must be after start date',
        messageAr: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية'
      });
    });

    test('should handle conflicting special hours periods', async () => {
      const conflictingPeriod = {
        type: 'custom',
        period: {
          start: '2024-07-10',
          end: '2024-07-20'
        }
      };

      mockSupabase.setSpecialHours.mockResolvedValue({
        success: false,
        error: 'CONFLICTING_SPECIAL_HOURS',
        message: 'Special hours period conflicts with existing period',
        conflictingPeriods: [
          { type: 'ramadan', start: '2024-07-15', end: '2024-07-25' }
        ]
      });

      mockReq.body = conflictingPeriod;

      await setSpecialHours(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'CONFLICTING_SPECIAL_HOURS',
        message: 'Special hours period conflicts with existing period',
        messageAr: 'فترة الساعات الخاصة تتعارض مع فترة موجودة',
        conflictingPeriods: expect.any(Array)
      });
    });
  });

  describe('Available Slots Generation', () => {
    test('should generate available slots for a specific date', async () => {
      const testDate = '2024-07-17';
      const mockAvailableSlots = {
        date: testDate,
        dayOfWeek: 'wednesday',
        totalSlots: 16,
        availableSlots: [
          { time: '09:00', duration: 30, available: true },
          { time: '09:30', duration: 30, available: true },
          { time: '10:00', duration: 30, available: false, reason: 'Booked' },
          { time: '12:30', duration: 30, available: false, reason: 'Prayer time (Dhuhr)', reasonAr: 'وقت الصلاة (الظهر)' },
          { time: '15:00', duration: 30, available: true },
          { time: '15:30', duration: 30, available: true }
        ],
        prayerTimes: {
          dhuhr: '12:37',
          asr: '16:13',
          maghrib: '19:15'
        },
        workingHours: {
          shifts: [
            { start: '09:00', end: '13:00' },
            { start: '15:00', end: '19:00' }
          ]
        }
      };

      mockPrayerTimeService.getTodayPrayerTimes.mockResolvedValue({
        times: { dhuhr: '12:37', asr: '16:13', maghrib: '19:15' }
      });

      mockSupabase.getAvailableSlots.mockResolvedValue({
        success: true,
        slots: mockAvailableSlots
      });

      mockReq.query = { date: testDate, duration: '30' };

      await getAvailableSlots(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        slots: mockAvailableSlots
      });
    });

    test('should consider prayer times when generating slots', async () => {
      const testDate = '2024-07-17';
      mockReq.query = { date: testDate, respectPrayerTimes: 'true' };

      mockPrayerTimeService.getTodayPrayerTimes.mockResolvedValue({
        times: {
          dhuhr: '12:37',
          asr: '16:13',
          maghrib: '19:15'
        }
      });

      await getAvailableSlots(mockReq as Request, mockRes as Response);

      expect(mockPrayerTimeService.getTodayPrayerTimes).toHaveBeenCalledWith(
        expect.any(Object),
        testDate
      );
    });

    test('should validate date format for slot generation', async () => {
      mockReq.query = { date: 'invalid-date' };

      await getAvailableSlots(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_DATE_FORMAT',
        message: 'Date must be in YYYY-MM-DD format',
        messageAr: 'التاريخ يجب أن يكون بتنسيق YYYY-MM-DD'
      });
    });

    test('should not allow booking too far in advance', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 100); // 100 days in future

      mockReq.query = { date: futureDate.toISOString().split('T')[0] };

      await getAvailableSlots(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'DATE_TOO_FAR_IN_ADVANCE',
        message: 'Cannot book more than 90 days in advance',
        messageAr: 'لا يمكن الحجز أكثر من 90 يوماً مقدماً',
        maxAdvanceDays: 90
      });
    });

    test('should not allow booking in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      mockReq.query = { date: pastDate.toISOString().split('T')[0] };

      await getAvailableSlots(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'PAST_DATE_NOT_ALLOWED',
        message: 'Cannot book appointments for past dates',
        messageAr: 'لا يمكن حجز مواعيد لتواريخ سابقة'
      });
    });
  });

  describe('Timezone and Localization', () => {
    test('should handle Jordan timezone correctly', async () => {
      const jordanTimezone = 'Asia/Amman';
      const scheduleWithTimezone = {
        timezone: jordanTimezone,
        workingDays: {
          sunday: {
            isWorking: true,
            shifts: [{ start: '09:00', end: '17:00' }]
          }
        }
      };

      mockSupabase.updateProviderAvailability.mockResolvedValue({
        success: true,
        availability: scheduleWithTimezone
      });

      mockReq.body = scheduleWithTimezone;

      await updateProviderAvailability(mockReq as Request, mockRes as Response);

      expect(mockSupabase.updateProviderAvailability).toHaveBeenCalledWith(
        'provider-123',
        expect.objectContaining({ timezone: jordanTimezone })
      );
    });

    test('should validate timezone format', async () => {
      const invalidTimezone = {
        timezone: 'Invalid/Timezone'
      };

      mockReq.body = invalidTimezone;

      await updateProviderAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TIMEZONE',
        message: 'Invalid timezone format',
        messageAr: 'تنسيق المنطقة الزمنية غير صحيح',
        supportedTimezones: expect.arrayContaining(['Asia/Amman'])
      });
    });

    test('should handle daylight saving time transitions', async () => {
      // Jordan observes daylight saving time
      const dstTransitionDate = '2024-03-29'; // Example DST transition date
      mockReq.query = { date: dstTransitionDate };

      await getAvailableSlots(mockReq as Request, mockRes as Response);

      // Should handle DST transition gracefully without errors
      expect(statusSpy).not.toHaveBeenCalledWith(500);
    });
  });

  describe('Error Handling', () => {
    test('should handle prayer time service failures', async () => {
      mockPrayerTimeService.getTodayPrayerTimes.mockRejectedValue(new Error('Prayer time service unavailable'));

      mockReq.query = { date: '2024-07-17' };

      await getAvailableSlots(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200); // Should continue without prayer times
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        slots: expect.any(Object),
        warning: 'Prayer times unavailable',
        warningAr: 'أوقات الصلاة غير متوفرة'
      });
    });

    test('should handle database errors during availability update', async () => {
      mockSupabase.updateProviderAvailability.mockRejectedValue(new Error('Database connection failed'));

      mockReq.body = {
        workingDays: {
          sunday: { isWorking: true, shifts: [{ start: '09:00', end: '17:00' }] }
        }
      };

      await updateProviderAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to update availability settings',
        messageAr: 'فشل في تحديث إعدادات التوفر'
      });
    });

    test('should handle malformed request data', async () => {
      const malformedData = {
        workingDays: 'not-an-object',
        slotDuration: 'not-a-number'
      };

      mockReq.body = malformedData;

      await updateProviderAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'MALFORMED_REQUEST_DATA',
        message: 'Request data is malformed',
        messageAr: 'بيانات الطلب مشوهة'
      });
    });
  });
});