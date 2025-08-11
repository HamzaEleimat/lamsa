import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';
import { uploadImage } from '../services/upload.service';
import { normalizePhoneNumber } from '../utils/phone.utils';

class EmployeeController {
  // Get all employees for a provider
  async getProviderEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerId } = req.params;
      const { service_id, active_only = 'true' } = req.query;

      let query = supabase
        .from('employees')
        .select(`
          *,
          employee_services!left(
            service_id,
            is_primary,
            services!inner(
              id,
              name_ar,
              name_en,
              category_id,
              price,
              duration_minutes
            )
          )
        `)
        .eq('provider_id', providerId)
        .order('name_en');

      // Filter by active status
      if (active_only === 'true') {
        query = query.eq('is_active', true);
      }

      // Filter by service if specified
      if (service_id) {
        query = query.eq('employee_services.service_id', service_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data: data || []
      });
    } catch (error) {
      next(error);
    }
  }

  // Get employee by ID
  async getEmployeeById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          provider:providers!inner(
            id,
            business_name_ar,
            business_name_en,
            rating,
            address
          ),
          employee_services!left(
            service_id,
            is_primary,
            services!inner(
              id,
              name_ar,
              name_en,
              category_id,
              price,
              duration_minutes
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Employee not found', 404);
        }
        throw error;
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  // Get employee availability
  async getEmployeeAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { date, service_id } = req.query;

      // Check if employee can perform the service if specified
      if (service_id) {
        const { data: canPerform } = await supabase
          .from('employee_services')
          .select('employee_id')
          .eq('employee_id', id)
          .eq('service_id', service_id as string)
          .single();

        if (!canPerform) {
          throw new AppError('Employee cannot perform this service', 400);
        }
      }

      // Get the day of week for the date
      const dateObj = new Date(date as string);
      const dayOfWeek = dateObj.getDay();

      // Check for special dates first
      const { data: specialDate } = await supabase
        .from('employee_special_dates')
        .select('*')
        .eq('employee_id', id)
        .eq('date', date as string)
        .single();

      if (specialDate) {
        if (!specialDate.is_available) {
          return res.json({
            success: true,
            data: {
              available: false,
              reason: specialDate.reason || 'Employee unavailable'
            }
          });
        }
        // Use special date hours
        return res.json({
          success: true,
          data: {
            available: true,
            starts_at: specialDate.starts_at,
            ends_at: specialDate.ends_at
          }
        });
      }

      // Get regular weekly availability
      const { data: availability, error } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('employee_id', id)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (error || !availability || !availability.is_available) {
        return res.json({
          success: true,
          data: {
            available: false,
            reason: 'Employee not available on this day'
          }
        });
      }

      // Get existing bookings for this employee on this date
      const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('employee_id', id)
        .eq('booking_date', date as string)
        .in('status', ['pending', 'confirmed']);

      res.json({
        success: true,
        data: {
          available: true,
          starts_at: availability.starts_at,
          ends_at: availability.ends_at,
          break_start: availability.break_start,
          break_end: availability.break_end,
          booked_slots: bookings || []
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new employee
  async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = (req as any).user.provider_id;
      if (!providerId) {
        throw new AppError('Provider ID not found', 403);
      }

      const employeeData = { ...req.body, provider_id: providerId };
      
      // Normalize phone number if provided
      if (employeeData.phone) {
        employeeData.phone = normalizePhoneNumber(employeeData.phone);
      }

      // Handle avatar upload if provided
      if (req.file) {
        const avatarUrl = await uploadImage(req.file.buffer, 'avatars');
        employeeData.avatar_url = avatarUrl;
      }

      const { data, error } = await supabase
        .from('employees')
        .insert(employeeData)
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data,
        message: 'Employee created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update employee
  async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const providerId = (req as any).user.provider_id;
      
      if (!providerId) {
        throw new AppError('Provider ID not found', 403);
      }

      // Verify ownership
      const { data: employee } = await supabase
        .from('employees')
        .select('provider_id')
        .eq('id', id)
        .single();

      if (!employee || employee.provider_id !== providerId) {
        throw new AppError('Unauthorized to update this employee', 403);
      }

      const updateData = { ...req.body };
      
      // Normalize phone number if provided
      if (updateData.phone) {
        updateData.phone = normalizePhoneNumber(updateData.phone);
      }

      // Handle avatar upload if provided
      if (req.file) {
        const avatarUrl = await uploadImage(req.file.buffer, 'avatars');
        updateData.avatar_url = avatarUrl;
      }

      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: 'Employee updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete employee (soft delete)
  async deleteEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const providerId = (req as any).user.provider_id;
      
      if (!providerId) {
        throw new AppError('Provider ID not found', 403);
      }

      // Verify ownership
      const { data: employee } = await supabase
        .from('employees')
        .select('provider_id')
        .eq('id', id)
        .single();

      if (!employee || employee.provider_id !== providerId) {
        throw new AppError('Unauthorized to delete this employee', 403);
      }

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Employee deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Assign services to employee
  async assignServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { service_ids, primary_service_id } = req.body;
      const providerId = (req as any).user.provider_id;
      
      if (!providerId) {
        throw new AppError('Provider ID not found', 403);
      }

      // Verify employee ownership
      const { data: employee } = await supabase
        .from('employees')
        .select('provider_id')
        .eq('id', id)
        .single();

      if (!employee || employee.provider_id !== providerId) {
        throw new AppError('Unauthorized to modify this employee', 403);
      }

      // Verify all services belong to the provider
      const { data: services } = await supabase
        .from('services')
        .select('id')
        .eq('provider_id', providerId)
        .in('id', service_ids);

      if (!services || services.length !== service_ids.length) {
        throw new AppError('Some services do not belong to this provider', 400);
      }

      // Prepare insert data
      const assignmentData = service_ids.map((serviceId: string) => ({
        employee_id: id,
        service_id: serviceId,
        is_primary: serviceId === primary_service_id
      }));

      // Insert new assignments (upsert to handle existing assignments)
      const { error } = await supabase
        .from('employee_services')
        .upsert(assignmentData, { onConflict: 'employee_id,service_id' });

      if (error) throw error;

      res.json({
        success: true,
        message: 'Services assigned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove service from employee
  async removeService(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, serviceId } = req.params;
      const providerId = (req as any).user.provider_id;
      
      if (!providerId) {
        throw new AppError('Provider ID not found', 403);
      }

      // Verify employee ownership
      const { data: employee } = await supabase
        .from('employees')
        .select('provider_id')
        .eq('id', id)
        .single();

      if (!employee || employee.provider_id !== providerId) {
        throw new AppError('Unauthorized to modify this employee', 403);
      }

      const { error } = await supabase
        .from('employee_services')
        .delete()
        .eq('employee_id', id)
        .eq('service_id', serviceId);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Service removed from employee'
      });
    } catch (error) {
      next(error);
    }
  }

  // Set weekly availability
  async setWeeklyAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { availability } = req.body;
      const providerId = (req as any).user.provider_id;
      
      if (!providerId) {
        throw new AppError('Provider ID not found', 403);
      }

      // Verify employee ownership
      const { data: employee } = await supabase
        .from('employees')
        .select('provider_id')
        .eq('id', id)
        .single();

      if (!employee || employee.provider_id !== providerId) {
        throw new AppError('Unauthorized to modify this employee', 403);
      }

      // Prepare availability data
      const availabilityData = availability.map((slot: any) => ({
        ...slot,
        employee_id: id
      }));

      // Upsert availability (replace existing)
      const { error } = await supabase
        .from('employee_availability')
        .upsert(availabilityData, { onConflict: 'employee_id,day_of_week' });

      if (error) throw error;

      res.json({
        success: true,
        message: 'Weekly availability updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Set special date
  async setSpecialDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const providerId = (req as any).user.provider_id;
      
      if (!providerId) {
        throw new AppError('Provider ID not found', 403);
      }

      // Verify employee ownership
      const { data: employee } = await supabase
        .from('employees')
        .select('provider_id')
        .eq('id', id)
        .single();

      if (!employee || employee.provider_id !== providerId) {
        throw new AppError('Unauthorized to modify this employee', 403);
      }

      const specialDateData = {
        ...req.body,
        employee_id: id
      };

      const { error } = await supabase
        .from('employee_special_dates')
        .upsert(specialDateData, { onConflict: 'employee_id,date' });

      if (error) throw error;

      res.json({
        success: true,
        message: 'Special date set successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove special date
  async removeSpecialDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, date } = req.params;
      const providerId = (req as any).user.provider_id;
      
      if (!providerId) {
        throw new AppError('Provider ID not found', 403);
      }

      // Verify employee ownership
      const { data: employee } = await supabase
        .from('employees')
        .select('provider_id')
        .eq('id', id)
        .single();

      if (!employee || employee.provider_id !== providerId) {
        throw new AppError('Unauthorized to modify this employee', 403);
      }

      const { error } = await supabase
        .from('employee_special_dates')
        .delete()
        .eq('employee_id', id)
        .eq('date', date);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Special date removed'
      });
    } catch (error) {
      next(error);
    }
  }

  // Add to favorites
  async addToFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const { error } = await supabase
        .from('user_favorite_employees')
        .insert({
          user_id: userId,
          employee_id: id
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new AppError('Employee already in favorites', 400);
        }
        throw error;
      }

      res.json({
        success: true,
        message: 'Employee added to favorites'
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove from favorites
  async removeFromFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const { error } = await supabase
        .from('user_favorite_employees')
        .delete()
        .eq('user_id', userId)
        .eq('employee_id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Employee removed from favorites'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's favorite employees
  async getUserFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const { data, error } = await supabase
        .from('user_favorite_employees')
        .select(`
          employee_id,
          employees!inner(
            *,
            provider:providers!inner(
              id,
              business_name_ar,
              business_name_en
            )
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const favorites = data?.map(item => item.employees) || [];

      res.json({
        success: true,
        data: favorites
      });
    } catch (error) {
      next(error);
    }
  }
}

export const employeeController = new EmployeeController();