// Availability Management Types

export interface AvailabilitySettings {
  provider_id: string;
  advance_booking_days: number;
  min_advance_booking_hours: number;
  max_advance_booking_days: number;
  default_preparation_minutes: number;
  default_cleanup_minutes: number;
  between_appointments_minutes: number;
  enable_prayer_breaks: boolean;
  prayer_time_flexibility_minutes: number;
  auto_adjust_prayer_times: boolean;
  prayer_calculation_method: string;
  auto_switch_ramadan_schedule: boolean;
  allow_instant_booking: boolean;
  require_deposit: boolean;
  deposit_percentage: number;
  cancellation_notice_hours: number;
  women_only_hours_enabled: boolean;
  women_only_start_time?: string;
  women_only_end_time?: string;
  women_only_days?: number[];
}

export interface WorkingSchedule {
  id: string;
  provider_id: string;
  schedule_name?: string;
  is_active: boolean;
  priority: number;
  effective_from?: string;
  effective_to?: string;
  recurrence_rule?: 'yearly' | 'ramadan' | 'none';
  shifts?: ScheduleShift[];
  breaks?: ScheduleBreak[];
}

export interface ScheduleShift {
  id?: string;
  schedule_id?: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string;
  end_time: string;
  shift_type?: 'regular' | 'women_only' | 'vip';
  max_bookings?: number;
  notes?: string;
}

export interface ScheduleBreak {
  id?: string;
  schedule_id?: string;
  day_of_week: number;
  break_type: 'lunch' | 'prayer' | 'personal' | 'maintenance';
  break_name?: string;
  start_time?: string;
  end_time?: string;
  is_dynamic: boolean;
  prayer_name?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  duration_minutes?: number;
  is_flexible?: boolean;
  flexibility_minutes?: number;
}

export interface TimeOff {
  id?: string;
  provider_id: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason?: 'holiday' | 'vacation' | 'sick' | 'personal' | 'training';
  description?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  block_bookings?: boolean;
  auto_reschedule?: boolean;
  notification_sent?: boolean;
}

export interface PrayerTimes {
  city: string;
  prayer_date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  calculation_method?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  type: 'regular' | 'instant' | 'emergency' | 'women_only';
  reason?: string;
}

export interface RamadanSchedule {
  id?: string;
  provider_id: string;
  year: number;
  template_type: 'early_shift' | 'late_shift' | 'split_shift' | 'custom';
  early_start_time?: string;
  early_end_time?: string;
  late_start_time?: string;
  late_end_time?: string;
  iftar_break_minutes?: number;
  auto_adjust_maghrib?: boolean;
  offer_home_service_only?: boolean;
  special_ramadan_services?: string[];
}

export interface AvailabilityCheck {
  providerId: string;
  serviceId: string;
  date: string;
  time?: string;
  duration?: number;
  customerId?: string;
}

export interface AvailabilityCheckResult {
  available: boolean;
  reason?: string;
  alternativeSlots?: TimeSlot[];
}

export interface WeeklyScheduleView {
  schedule: WorkingSchedule;
  weeklySchedule: DaySchedule[];
  weekStart: string;
  weekEnd: string;
}

export interface DaySchedule {
  date: string;
  dayOfWeek: number;
  shifts: ScheduleShift[];
  breaks: ScheduleBreak[];
  timeOff: TimeOff[];
}

export interface PrayerSettings {
  enable_prayer_breaks: boolean;
  prayer_time_flexibility_minutes: number;
  auto_adjust_prayer_times: boolean;
  prayer_calculation_method: string;
}

export interface PrayerSettingsResponse {
  settings: PrayerSettings;
  todayPrayerTimes?: PrayerTimes;
  supportedCities: string[];
}

export interface RamadanInfo {
  schedule?: RamadanSchedule;
  ramadanDates?: {
    start: string;
    end: string;
  };
  isCurrentlyRamadan: boolean;
}

// Helper interfaces for UI components
export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  shifts: Omit<ScheduleShift, 'id' | 'schedule_id'>[];
  breaks: Omit<ScheduleBreak, 'id' | 'schedule_id'>[];
  isPopular?: boolean;
}

export interface QuickScheduleAction {
  type: 'copy_day' | 'apply_template' | 'clear_day' | 'toggle_day';
  fromDay?: number;
  toDay?: number | number[];
  templateId?: string;
}

export interface AvailabilityConflict {
  id: string;
  provider_id: string;
  original_booking_id?: string;
  conflict_type: 'time_off' | 'prayer_time' | 'schedule_change' | 'emergency';
  conflict_date: string;
  conflict_time: string;
  resolution_status: 'pending' | 'rescheduled' | 'cancelled' | 'override';
  new_date?: string;
  new_time?: string;
  customer_notified?: boolean;
  notification_sent_at?: string;
  customer_response?: 'accepted' | 'rejected' | 'no_response';
}

// Constants
export const DAYS_OF_WEEK = [
  { value: 0, label_en: 'Sunday', label_ar: 'الأحد' },
  { value: 1, label_en: 'Monday', label_ar: 'الإثنين' },
  { value: 2, label_en: 'Tuesday', label_ar: 'الثلاثاء' },
  { value: 3, label_en: 'Wednesday', label_ar: 'الأربعاء' },
  { value: 4, label_en: 'Thursday', label_ar: 'الخميس' },
  { value: 5, label_en: 'Friday', label_ar: 'الجمعة' },
  { value: 6, label_en: 'Saturday', label_ar: 'السبت' },
];

export const PRAYER_NAMES = [
  { value: 'fajr', label_en: 'Fajr', label_ar: 'الفجر' },
  { value: 'dhuhr', label_en: 'Dhuhr', label_ar: 'الظهر' },
  { value: 'asr', label_en: 'Asr', label_ar: 'العصر' },
  { value: 'maghrib', label_en: 'Maghrib', label_ar: 'المغرب' },
  { value: 'isha', label_en: 'Isha', label_ar: 'العشاء' },
];

export const BREAK_TYPES = [
  { value: 'lunch', label_en: 'Lunch Break', label_ar: 'استراحة الغداء' },
  { value: 'prayer', label_en: 'Prayer Break', label_ar: 'استراحة الصلاة' },
  { value: 'personal', label_en: 'Personal Break', label_ar: 'استراحة شخصية' },
  { value: 'maintenance', label_en: 'Maintenance', label_ar: 'صيانة' },
];

export const TIME_OFF_REASONS = [
  { value: 'holiday', label_en: 'Holiday', label_ar: 'عطلة' },
  { value: 'vacation', label_en: 'Vacation', label_ar: 'إجازة' },
  { value: 'sick', label_en: 'Sick Leave', label_ar: 'إجازة مرضية' },
  { value: 'personal', label_en: 'Personal', label_ar: 'شخصي' },
  { value: 'training', label_en: 'Training', label_ar: 'تدريب' },
];

export const RAMADAN_TEMPLATES = [
  {
    value: 'early_shift',
    label_en: 'Early Shift (Morning to Afternoon)',
    label_ar: 'الفترة الصباحية (صباحاً حتى الظهر)',
    description_en: 'Work from 9 AM to 3 PM',
    description_ar: 'العمل من 9 صباحاً حتى 3 مساءً',
  },
  {
    value: 'late_shift',
    label_en: 'Late Shift (After Iftar)',
    label_ar: 'الفترة المسائية (بعد الإفطار)',
    description_en: 'Work from 9 PM to 12 AM',
    description_ar: 'العمل من 9 مساءً حتى 12 منتصف الليل',
  },
  {
    value: 'split_shift',
    label_en: 'Split Shift',
    label_ar: 'فترة مقسمة',
    description_en: 'Morning and evening shifts',
    description_ar: 'فترات صباحية ومسائية',
  },
  {
    value: 'custom',
    label_en: 'Custom Schedule',
    label_ar: 'جدول مخصص',
    description_en: 'Create your own schedule',
    description_ar: 'أنشئ جدولك الخاص',
  },
];