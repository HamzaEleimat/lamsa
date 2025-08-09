import { supabase } from '../config/supabase';
import { format, addDays, startOfDay } from 'date-fns';

// Type definitions for joined queries
interface AppointmentWithRelations {
  id: string;
  start_time: string;
  end_time: string;
  total_price: string;
  status: string;
  user_notes: string | null;
  users: {
    id: string;
    name: string;
    phone: string;
    avatar_url: string | null;
  };
  services: {
    name_en: string;
    name_ar: string;
    duration_minutes: number;
  };
}

// Type for next appointment query
interface NextBookingType {
  id: string;
  start_time: string;
  booking_date: string;
  users: {
    id: string;
    name: string;
  };
  services: {
    name_en: string;
    duration_minutes: number;
  };
}

export interface TodayAppointment {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  serviceNameAr: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  status: string;
  notes?: string;
  isNewCustomer: boolean;
  customerAvatar?: string;
}

export interface TodayStats {
  appointmentsCount: number;
  completedCount: number;
  pendingCount: number;
  cancelledCount: number;
  totalRevenue: number;
  newCustomers: number;
  avgRating: number;
  occupancyRate: number;
}

export interface RealtimeMetrics {
  isOnline: boolean;
  todaysBookings: number;
  todaysRevenue: number;
  todaysNewCustomers: number;
  currentRating: number;
  nextBookingTime?: string;
  availableSlotsToday: number;
  currentOccupancyRate: number;
  lastUpdated: string;
}

export interface NextAppointment {
  id: string;
  customerName: string;
  serviceName: string;
  startTime: string;
  duration: number;
  timeUntil: string;
  preparationNeeded?: string[];
  isFirstTime: boolean;
}

export interface DailyGoals {
  date: string;
  goals: Array<{
    type: string;
    target: number;
    current: number;
    rewardPoints: number;
    completed: boolean;
    description: string;
  }>;
  streaks: {
    bookingStreak: number;
    perfectRatingStreak: number;
    responseStreak: number;
  };
  pointsEarnedToday: number;
  totalPoints: number;
  level: number;
}

export interface ReviewWithDetails {
  id: string;
  customerName: string;
  customerAvatar?: string;
  serviceName: string;
  rating: number;
  comment?: string;
  sentiment?: string;
  aspects?: string[];
  hasResponse: boolean;
  response?: string;
  createdAt: string;
  isVerified: boolean;
  helpfulCount: number;
}

export interface NotificationItem {
  id: string;
  type: 'booking' | 'review' | 'achievement' | 'system' | 'payment';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  actionRequired?: boolean;
}

export class DashboardService {

  // Get today's appointments with customer details
  async getTodayAppointments(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TodayAppointment[]> {
    const { data: appointments } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        total_price,
        status,
        user_notes,
        users!inner(id, name, phone, avatar_url),
        services!inner(name_en, name_ar, duration_minutes)
      `)
      .eq('provider_id', providerId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .lte('booking_date', format(endDate, 'yyyy-MM-dd'))
      .order('start_time', { ascending: true });

    if (!appointments) return [];

    // Type assertion for the query result
    const typedAppointments = appointments as unknown as AppointmentWithRelations[];

    // Check which customers are new (first booking with this provider)
    const customerIds = typedAppointments.map(apt => apt.users.id);
    // For now, we'll skip the new customer check as it requires raw SQL
    // TODO: Implement with raw SQL or RPC function
    const customerHistory: any[] = [];

    const newCustomerIds = new Set(
      customerHistory?.filter(ch => 
        new Date(ch.first_booking).toDateString() === startDate.toDateString()
      ).map(ch => ch.user_id) || []
    );

    return typedAppointments.map(apt => ({
      id: apt.id,
      customerName: apt.users.name || 'Unknown',
      customerPhone: apt.users.phone,
      serviceName: apt.services.name_en,
      serviceNameAr: apt.services.name_ar,
      startTime: apt.start_time,
      endTime: apt.end_time,
      duration: apt.services.duration_minutes,
      price: Number(apt.total_price),
      status: apt.status,
      notes: apt.user_notes || undefined,
      isNewCustomer: newCustomerIds.has(apt.users.id),
      customerAvatar: apt.users.avatar_url || undefined
    }));
  }

  // Get today's statistics
  async getTodayStats(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TodayStats> {
    // Get bookings for today
    const { data: bookings } = await supabase
      .from('bookings')
      .select('status, total_price, user_id')
      .eq('provider_id', providerId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .lte('booking_date', format(endDate, 'yyyy-MM-dd'));

    // Get today's reviews
    const { data: todayReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('provider_id', providerId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Calculate stats
    const appointmentsCount = bookings?.length || 0;
    const completedCount = bookings?.filter(b => b.status === 'completed').length || 0;
    const pendingCount = bookings?.filter(b => b.status === 'pending').length || 0;
    const cancelledCount = bookings?.filter(b => b.status === 'cancelled').length || 0;
    const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;
    
    // Count new customers (those with their first booking today)
    const uniqueCustomers = new Set(bookings?.map(b => b.user_id) || []);
    const newCustomersCount = await this.countNewCustomers(providerId, Array.from(uniqueCustomers), startDate);
    
    const avgRating = todayReviews && todayReviews.length > 0
      ? todayReviews.reduce((sum, r) => sum + r.rating, 0) / todayReviews.length
      : 0;

    // Calculate occupancy rate (simplified - would need availability data for accurate calculation)
    const occupancyRate = appointmentsCount > 0 ? (completedCount / appointmentsCount) * 100 : 0;

    return {
      appointmentsCount,
      completedCount,
      pendingCount,
      cancelledCount,
      totalRevenue,
      newCustomers: newCustomersCount,
      avgRating,
      occupancyRate
    };
  }

  private async countNewCustomers(
    providerId: string,
    customerIds: string[],
    todayDate: Date
  ): Promise<number> {
    if (customerIds.length === 0) return 0;

    // Get all bookings for these customers and find their first booking dates
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('user_id, booking_date')
      .eq('provider_id', providerId)
      .in('user_id', customerIds)
      .order('booking_date', { ascending: true });

    // Group by user and find first booking date
    const firstBookingByUser = new Map<string, string>();
    allBookings?.forEach(booking => {
      if (!firstBookingByUser.has(booking.user_id)) {
        firstBookingByUser.set(booking.user_id, booking.booking_date);
      }
    });

    // Count how many have their first booking today
    let newCustomerCount = 0;
    firstBookingByUser.forEach(firstDate => {
      if (firstDate === format(todayDate, 'yyyy-MM-dd')) {
        newCustomerCount++;
      }
    });

    return newCustomerCount;
  }

  // Get real-time metrics
  async getRealtimeMetrics(providerId: string): Promise<RealtimeMetrics> {
    const { data: metrics } = await supabase
      .from('provider_realtime_metrics')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (!metrics) {
      // Return default metrics if not found
      return {
        isOnline: false,
        todaysBookings: 0,
        todaysRevenue: 0,
        todaysNewCustomers: 0,
        currentRating: 0,
        availableSlotsToday: 0,
        currentOccupancyRate: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    return {
      isOnline: metrics.is_online,
      todaysBookings: metrics.todays_bookings,
      todaysRevenue: Number(metrics.todays_revenue),
      todaysNewCustomers: metrics.todays_new_customers,
      currentRating: metrics.todays_rating_count > 0 
        ? metrics.todays_rating_sum / metrics.todays_rating_count 
        : 0,
      nextBookingTime: metrics.next_booking_time,
      availableSlotsToday: metrics.available_slots_today,
      currentOccupancyRate: Number(metrics.current_occupancy_rate),
      lastUpdated: metrics.last_updated
    };
  }

  // Get next upcoming appointment
  async getNextAppointment(providerId: string): Promise<NextAppointment | null> {
    const now = new Date();
    
    const { data: nextBooking } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        booking_date,
        users!inner(id, name),
        services!inner(name_en, duration_minutes)
      `)
      .eq('provider_id', providerId)
      .eq('status', 'confirmed')
      .or(`booking_date.gt.${format(now, 'yyyy-MM-dd')},and(booking_date.eq.${format(now, 'yyyy-MM-dd')},start_time.gt.${format(now, 'HH:mm')})`)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    if (!nextBooking) return null;

    // Type assertion for the query result
    const typedNextBooking = nextBooking as unknown as NextBookingType;

    // Check if this is customer's first time
    const { data: customerHistory } = await supabase
      .from('bookings')
      .select('id')
      .eq('provider_id', providerId)
      .eq('user_id', typedNextBooking.users.id)
      .eq('status', 'completed')
      .limit(1);

    const isFirstTime = !customerHistory || customerHistory.length === 0;

    const appointmentDateTime = new Date(`${typedNextBooking.booking_date}T${typedNextBooking.start_time}`);
    const timeUntil = this.calculateTimeUntil(appointmentDateTime);

    return {
      id: typedNextBooking.id,
      customerName: typedNextBooking.users.name || 'Unknown',
      serviceName: typedNextBooking.services.name_en,
      startTime: typedNextBooking.start_time,
      duration: typedNextBooking.services.duration_minutes,
      timeUntil,
      isFirstTime
    };
  }

  private calculateTimeUntil(targetDate: Date): string {
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m`;
    } else {
      return 'Now';
    }
  }

  // Get daily goals and challenges
  async getDailyGoals(providerId: string, date: Date): Promise<DailyGoals> {
    const { data: goals } = await supabase
      .from('provider_daily_goals')
      .select('*')
      .eq('provider_id', providerId)
      .eq('goal_date', format(date, 'yyyy-MM-dd'))
      .single();

    if (!goals) {
      // Create default goals for the day
      return await this.createDefaultDailyGoals(providerId, date);
    }

    return {
      date: goals.goal_date,
      goals: goals.goals || [],
      streaks: {
        bookingStreak: goals.booking_streak || 0,
        perfectRatingStreak: goals.perfect_rating_streak || 0,
        responseStreak: goals.response_streak || 0
      },
      pointsEarnedToday: goals.points_earned_today || 0,
      totalPoints: goals.total_points || 0,
      level: goals.level || 1
    };
  }

  private async createDefaultDailyGoals(providerId: string, date: Date): Promise<DailyGoals> {
    const defaultGoals = [
      {
        type: 'bookings',
        target: 5,
        current: 0,
        rewardPoints: 50,
        completed: false,
        description: 'Complete 5 appointments today'
      },
      {
        type: 'revenue',
        target: 500,
        current: 0,
        rewardPoints: 100,
        completed: false,
        description: 'Earn 500 JOD in revenue today'
      },
      {
        type: 'rating',
        target: 4.8,
        current: 0,
        rewardPoints: 75,
        completed: false,
        description: 'Maintain 4.8+ average rating'
      }
    ];

    const newGoalsRecord = {
      provider_id: providerId,
      goal_date: format(date, 'yyyy-MM-dd'),
      goals: defaultGoals,
      booking_streak: 0,
      perfect_rating_streak: 0,
      response_streak: 0,
      points_earned_today: 0,
      total_points: 0,
      level: 1
    };

    await supabase
      .from('provider_daily_goals')
      .insert(newGoalsRecord);

    return {
      date: format(date, 'yyyy-MM-dd'),
      goals: defaultGoals,
      streaks: {
        bookingStreak: 0,
        perfectRatingStreak: 0,
        responseStreak: 0
      },
      pointsEarnedToday: 0,
      totalPoints: 0,
      level: 1
    };
  }

  // Get upcoming appointments with pagination
  async getUpcomingAppointments(
    providerId: string,
    startDate: Date,
    endDate: Date,
    page: number,
    limit: number
  ) {
    const offset = (page - 1) * limit;

    const { data: appointments, count } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        status,
        total_price,
        users!inner(name, phone, avatar_url),
        services!inner(name_en, name_ar)
      `, { count: 'exact' })
      .eq('provider_id', providerId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .lte('booking_date', format(endDate, 'yyyy-MM-dd'))
      .in('status', ['pending', 'confirmed'])
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);

    const totalPages = Math.ceil((count || 0) / limit);

    // Type assertion for appointments with joined data
    const typedAppointments = appointments as unknown as Array<{
      id: string;
      booking_date: string;
      start_time: string;
      end_time: string;
      status: string;
      total_price: string;
      users: {
        name: string;
        phone: string;
        avatar_url: string | null;
      };
      services: {
        name_en: string;
        name_ar: string;
      };
    }>;

    return {
      data: typedAppointments?.map(apt => ({
        id: apt.id,
        date: apt.booking_date,
        startTime: apt.start_time,
        endTime: apt.end_time,
        status: apt.status,
        price: Number(apt.total_price),
        customerName: apt.users.name,
        customerPhone: apt.users.phone,
        customerAvatar: apt.users.avatar_url,
        serviceName: apt.services.name_en,
        serviceNameAr: apt.services.name_ar
      })) || [],
      total: count || 0,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  // Get reviews with filters
  async getReviews(
    providerId: string,
    page: number,
    limit: number,
    filters: {
      sentiment?: string;
      rating?: number;
      needsResponse?: boolean;
    }
  ) {
    const offset = (page - 1) * limit;
    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        sentiment,
        aspects,
        response,
        created_at,
        is_verified,
        helpful_count,
        users!inner(name, avatar_url),
        services!inner(name_en)
      `, { count: 'exact' })
      .eq('provider_id', providerId);

    // Apply filters
    if (filters.sentiment) {
      query = query.eq('sentiment', filters.sentiment);
    }
    if (filters.rating) {
      query = query.eq('rating', filters.rating);
    }
    if (filters.needsResponse) {
      query = query.is('response', null);
    }

    const { data: reviews, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const totalPages = Math.ceil((count || 0) / limit);

    // Type assertion for reviews with joined data
    const typedReviews = reviews as unknown as Array<{
      id: string;
      rating: number;
      comment: string;
      sentiment: string;
      aspects: any;
      response: string | null;
      created_at: string;
      is_verified: boolean;
      helpful_count: number;
      users: {
        name: string;
        avatar_url: string | null;
      };
      services: {
        name_en: string;
      };
    }>;

    return {
      data: typedReviews?.map(review => ({
        id: review.id,
        customerName: review.users.name,
        customerAvatar: review.users.avatar_url,
        serviceName: review.services.name_en,
        rating: review.rating,
        comment: review.comment,
        sentiment: review.sentiment,
        aspects: review.aspects,
        hasResponse: !!review.response,
        response: review.response,
        createdAt: review.created_at,
        isVerified: review.is_verified,
        helpfulCount: review.helpful_count
      })) || [],
      total: count || 0,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  // Get notifications
  async getNotifications(
    providerId: string,
    unreadOnly: boolean,
    type?: string
  ): Promise<NotificationItem[]> {
    // This would typically come from a notifications table
    // For now, we'll return mock data structure
    const mockNotifications: NotificationItem[] = [
      {
        id: '1',
        type: 'booking',
        title: 'New Booking Request',
        message: 'Sarah Ahmad requested a haircut appointment for tomorrow at 2 PM',
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: 'high',
        actionRequired: true,
        data: { bookingId: 'booking-123' }
      },
      {
        id: '2',
        type: 'review',
        title: 'New 5-Star Review',
        message: 'Layla Hassan left a 5-star review for your makeup service',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        priority: 'medium',
        actionRequired: false,
        data: { reviewId: 'review-456' }
      }
    ];

    let filteredNotifications = mockNotifications;

    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.isRead);
    }

    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type);
    }

    return filteredNotifications;
  }
}