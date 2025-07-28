import { supabase } from './supabase';
import { validateUUID } from '../utils/validation';

export interface Employee {
  id: string;
  provider_id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  specialties: string[];
  is_active: boolean;
  hire_date: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeePerformance {
  employee_id: string;
  employee_name: string;
  total_bookings: number;
  completed_bookings: number;
  total_revenue: number;
  avg_rating: number;
  bookings_today: number;
  revenue_today: number;
}

export interface EmployeeMetrics {
  total_employees: number;
  active_employees: number;
  total_bookings_today: number;
  top_performer: EmployeePerformance | null;
}

export class EmployeeService {
  /**
   * Get all employees for a provider
   */
  async getEmployees(providerId: string): Promise<Employee[]> {
    try {
      let validatedProviderId = providerId;
      try {
        validatedProviderId = validateUUID(providerId, 'providerId');
      } catch (error) {
        console.log('Using non-UUID provider ID:', providerId);
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('provider_id', validatedProviderId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching employees:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getEmployees:', error);
      return [];
    }
  }

  /**
   * Get employee metrics for dashboard
   */
  async getEmployeeMetrics(providerId: string): Promise<EmployeeMetrics> {
    try {
      let validatedProviderId = providerId;
      try {
        validatedProviderId = validateUUID(providerId, 'providerId');
      } catch (error) {
        console.log('Using non-UUID provider ID:', providerId);
      }

      // Get all employees
      const employees = await this.getEmployees(validatedProviderId);
      const activeEmployees = employees.filter(emp => emp.is_active);

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Get today's bookings for all employees
      const { data: todayBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('employee_id, total_amount, status')
        .eq('provider_id', validatedProviderId)
        .eq('booking_date', today)
        .in('status', ['confirmed', 'completed']);

      if (bookingsError) {
        console.error('Error fetching employee bookings:', bookingsError);
      }

      // Calculate metrics per employee
      const employeePerformanceMap = new Map<string, any>();
      
      if (todayBookings) {
        todayBookings.forEach(booking => {
          if (booking.employee_id) {
            const current = employeePerformanceMap.get(booking.employee_id) || {
              bookings_today: 0,
              revenue_today: 0
            };
            current.bookings_today += 1;
            current.revenue_today += booking.total_amount || 0;
            employeePerformanceMap.set(booking.employee_id, current);
          }
        });
      }

      // Find top performer by today's revenue
      let topPerformer: EmployeePerformance | null = null;
      let maxRevenue = 0;

      for (const [employeeId, performance] of employeePerformanceMap.entries()) {
        if (performance.revenue_today > maxRevenue) {
          const employee = employees.find(e => e.id === employeeId);
          if (employee) {
            maxRevenue = performance.revenue_today;
            topPerformer = {
              employee_id: employeeId,
              employee_name: employee.name,
              total_bookings: 0, // Would need separate query
              completed_bookings: 0, // Would need separate query
              total_revenue: 0, // Would need separate query
              avg_rating: 0, // Would need separate query
              bookings_today: performance.bookings_today,
              revenue_today: performance.revenue_today
            };
          }
        }
      }

      return {
        total_employees: employees.length,
        active_employees: activeEmployees.length,
        total_bookings_today: todayBookings?.length || 0,
        top_performer: topPerformer
      };
    } catch (error) {
      console.error('Error in getEmployeeMetrics:', error);
      return {
        total_employees: 0,
        active_employees: 0,
        total_bookings_today: 0,
        top_performer: null
      };
    }
  }

  /**
   * Get detailed performance for a specific employee
   */
  async getEmployeePerformance(
    employeeId: string,
    dateRange?: { start: string; end: string }
  ): Promise<EmployeePerformance | null> {
    try {
      const validatedEmployeeId = validateUUID(employeeId, 'employeeId');

      // Get employee details
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('id', validatedEmployeeId)
        .single();

      if (empError || !employee) {
        console.error('Employee not found:', empError);
        return null;
      }

      // Build query for bookings
      let bookingsQuery = supabase
        .from('bookings')
        .select('id, total_amount, status, created_at')
        .eq('employee_id', validatedEmployeeId);

      if (dateRange) {
        bookingsQuery = bookingsQuery
          .gte('booking_date', dateRange.start)
          .lte('booking_date', dateRange.end);
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery;

      if (bookingsError) {
        console.error('Error fetching employee bookings:', bookingsError);
      }

      // Get ratings for the employee
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('employee_id', validatedEmployeeId);

      if (reviewsError) {
        console.error('Error fetching employee reviews:', reviewsError);
      }

      // Calculate metrics
      const totalBookings = bookings?.length || 0;
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
      const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Get today's metrics
      const today = new Date().toISOString().split('T')[0];
      const todayBookings = bookings?.filter(b => 
        b.created_at.split('T')[0] === today
      ) || [];

      return {
        employee_id: employee.id,
        employee_name: employee.name,
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        total_revenue: totalRevenue,
        avg_rating: avgRating,
        bookings_today: todayBookings.length,
        revenue_today: todayBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
      };
    } catch (error) {
      console.error('Error in getEmployeePerformance:', error);
      return null;
    }
  }
}

// Export singleton instance
export const employeeService = new EmployeeService();