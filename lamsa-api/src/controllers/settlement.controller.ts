import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';
// import { Parser } from 'json2csv';  // TODO: Install json2csv for CSV export
// import PDFDocument from 'pdfkit';   // TODO: Install pdfkit for PDF export

class SettlementController {
  // Get provider's settlements
  async getProviderSettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerId } = req.params;
      const { year, month, status, page = 1, limit = 20 } = req.query;
      const user = (req as any).user;

      // Verify access rights
      if (user.role === 'provider' && user.provider_id !== providerId) {
        throw new AppError('Unauthorized to view these settlements', 403);
      }

      let query = supabase
        .from('settlements')
        .select('*, provider:providers!inner(business_name_ar, business_name_en)', { count: 'exact' })
        .eq('provider_id', providerId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (year) query = query.eq('year', year);
      if (month) query = query.eq('month', month);
      if (status) query = query.eq('status', status);

      // Pagination
      const offset = (Number(page) - 1) * Number(limit);
      query = query.range(offset, offset + Number(limit) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get settlement by ID
  async getSettlementById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const { data, error } = await supabase
        .from('settlements')
        .select(`
          *,
          provider:providers!inner(
            id,
            business_name_ar,
            business_name_en,
            owner_name,
            phone,
            email,
            address
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Settlement not found', 404);
        }
        throw error;
      }

      // Verify access rights
      if (user.role === 'provider' && user.provider_id !== data.provider_id) {
        throw new AppError('Unauthorized to view this settlement', 403);
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  // Get pending settlement for current month
  async getPendingSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerId } = req.params;
      const user = (req as any).user;

      // Verify access rights
      if (user.role === 'provider' && user.provider_id !== providerId) {
        throw new AppError('Unauthorized to view this information', 403);
      }

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Calculate pending amount from completed bookings
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('total_amount, provider_fee, platform_fee')
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .gte('completed_at', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
        .lt('completed_at', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);

      if (error) throw error;

      const pendingAmount = bookings?.reduce((total, booking) => {
        return total + (booking.provider_fee || 0);
      }, 0) || 0;

      const platformFees = bookings?.reduce((total, booking) => {
        return total + (booking.platform_fee || 0);
      }, 0) || 0;

      res.json({
        success: true,
        data: {
          month: currentMonth,
          year: currentYear,
          total_bookings: bookings?.length || 0,
          gross_amount: pendingAmount + platformFees,
          platform_fee: platformFees,
          net_amount: pendingAmount,
          status: 'pending'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get settlement breakdown
  async getSettlementBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const user = (req as any).user;

      // Get settlement first to verify access
      const { data: settlement } = await supabase
        .from('settlements')
        .select('provider_id, month, year')
        .eq('id', id)
        .single();

      if (!settlement) {
        throw new AppError('Settlement not found', 404);
      }

      // Verify access rights
      if (user.role === 'provider' && user.provider_id !== settlement.provider_id) {
        throw new AppError('Unauthorized to view this settlement', 403);
      }

      // Get bookings for this settlement period
      const startDate = `${settlement.year}-${String(settlement.month).padStart(2, '0')}-01`;
      const endDate = settlement.month === 12 
        ? `${settlement.year + 1}-01-01`
        : `${settlement.year}-${String(settlement.month + 1).padStart(2, '0')}-01`;

      const offset = (Number(page) - 1) * Number(limit);

      const { data: bookings, error, count } = await supabase
        .from('bookings')
        .select(`
          *,
          user:users!inner(name, phone),
          service:services!inner(name_ar, name_en),
          employee:employees(name_ar, name_en)
        `, { count: 'exact' })
        .eq('provider_id', settlement.provider_id)
        .eq('status', 'completed')
        .gte('completed_at', startDate)
        .lt('completed_at', endDate)
        .order('completed_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (error) throw error;

      res.json({
        success: true,
        data: bookings || [],
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Export settlement
  async exportSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { format = 'csv' } = req.query;
      const user = (req as any).user;

      // Get settlement with full details
      const { data: settlement, error: settlementError } = await supabase
        .from('settlements')
        .select(`
          *,
          provider:providers!inner(
            business_name_ar,
            business_name_en,
            owner_name,
            phone,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (settlementError) throw settlementError;

      // Verify access rights
      if (user.role === 'provider' && user.provider_id !== settlement.provider_id) {
        throw new AppError('Unauthorized to export this settlement', 403);
      }

      // Get all bookings for this settlement
      const startDate = `${settlement.year}-${String(settlement.month).padStart(2, '0')}-01`;
      const endDate = settlement.month === 12 
        ? `${settlement.year + 1}-01-01`
        : `${settlement.year}-${String(settlement.month + 1).padStart(2, '0')}-01`;

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          user:users!inner(name, phone),
          service:services!inner(name_ar, name_en)
        `)
        .eq('provider_id', settlement.provider_id)
        .eq('status', 'completed')
        .gte('completed_at', startDate)
        .lt('completed_at', endDate)
        .order('completed_at');

      if (bookingsError) throw bookingsError;

      if (format === 'csv') {
        // Generate CSV
        const fields = [
          'booking_id',
          'booking_date',
          'customer_name',
          'service_name',
          'service_amount',
          'platform_fee',
          'provider_earnings',
          'completed_at'
        ];

        const data = bookings?.map(booking => ({
          booking_id: booking.id,
          booking_date: booking.booking_date,
          customer_name: booking.user.name,
          service_name: booking.service.name_en,
          service_amount: booking.service_amount,
          platform_fee: booking.platform_fee,
          provider_earnings: booking.provider_fee,
          completed_at: booking.completed_at
        })) || [];

        const parser = new Parser({ fields });
        const csv = parser.parse(data);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=settlement-${settlement.year}-${settlement.month}.csv`);
        res.send(csv);
      } else {
        // Generate PDF
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=settlement-${settlement.year}-${settlement.month}.pdf`);
        
        doc.pipe(res);
        
        // Add content to PDF
        doc.fontSize(20).text('Settlement Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Provider: ${settlement.provider.business_name_en}`);
        doc.text(`Period: ${settlement.month}/${settlement.year}`);
        doc.text(`Total Bookings: ${settlement.total_bookings}`);
        doc.text(`Gross Amount: ${settlement.gross_amount} JOD`);
        doc.text(`Platform Fee: ${settlement.platform_fee} JOD`);
        doc.text(`Net Amount: ${settlement.net_amount} JOD`);
        doc.text(`Status: ${settlement.status}`);
        
        if (settlement.paid_at) {
          doc.text(`Paid On: ${new Date(settlement.paid_at).toLocaleDateString()}`);
          doc.text(`Reference: ${settlement.payment_reference}`);
        }
        
        doc.end();
      }
    } catch (error) {
      next(error);
    }
  }

  // Get all settlements (admin)
  async getAllSettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month, status, provider_id, page = 1, limit = 20 } = req.query;

      let query = supabase
        .from('settlements')
        .select(`
          *,
          provider:providers!inner(
            business_name_ar,
            business_name_en,
            owner_name
          )
        `, { count: 'exact' })
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (year) query = query.eq('year', year);
      if (month) query = query.eq('month', month);
      if (status) query = query.eq('status', status);
      if (provider_id) query = query.eq('provider_id', provider_id);

      // Pagination
      const offset = (Number(page) - 1) * Number(limit);
      query = query.range(offset, offset + Number(limit) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Generate monthly settlements
  async generateMonthlySettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year, provider_ids } = req.body;

      // Get all active providers or specific ones
      let providersQuery = supabase
        .from('providers')
        .select('id')
        .eq('status', 'active');

      if (provider_ids && provider_ids.length > 0) {
        providersQuery = providersQuery.in('id', provider_ids);
      }

      const { data: providers, error: providersError } = await providersQuery;

      if (providersError) throw providersError;

      const settlements = [];
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = month === 12 
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      for (const provider of providers || []) {
        // Check if settlement already exists
        const { data: existing } = await supabase
          .from('settlements')
          .select('id')
          .eq('provider_id', provider.id)
          .eq('month', month)
          .eq('year', year)
          .single();

        if (existing) continue;

        // Calculate settlement amounts
        const { data: bookings } = await supabase
          .from('bookings')
          .select('total_amount, provider_fee, platform_fee')
          .eq('provider_id', provider.id)
          .eq('status', 'completed')
          .gte('completed_at', startDate)
          .lt('completed_at', endDate);

        if (bookings && bookings.length > 0) {
          const grossAmount = bookings.reduce((sum, b) => sum + b.total_amount, 0);
          const platformFee = bookings.reduce((sum, b) => sum + (b.platform_fee || 0), 0);
          const netAmount = bookings.reduce((sum, b) => sum + (b.provider_fee || 0), 0);

          const settlementData = {
            provider_id: provider.id,
            month,
            year,
            total_bookings: bookings.length,
            gross_amount: grossAmount,
            platform_fee: platformFee,
            net_amount: netAmount,
            status: 'pending'
          };

          const { data: settlement, error: settlementError } = await supabase
            .from('settlements')
            .insert(settlementData)
            .select()
            .single();

          if (settlementError) throw settlementError;
          settlements.push(settlement);
        }
      }

      res.json({
        success: true,
        data: settlements,
        message: `Generated ${settlements.length} settlements for ${month}/${year}`
      });
    } catch (error) {
      next(error);
    }
  }

  // Process settlement payment
  async processSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { payment_method, payment_reference, notes } = req.body;

      const { data, error } = await supabase
        .from('settlements')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          payment_reference,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Settlement not found or already processed', 404);
        }
        throw error;
      }

      // TODO: Send notification to provider about payment

      res.json({
        success: true,
        data,
        message: 'Settlement processed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark settlement as failed
  async failSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const { data, error } = await supabase
        .from('settlements')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .in('status', ['pending', 'processing'])
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Settlement not found or cannot be failed', 404);
        }
        throw error;
      }

      // TODO: Send notification to provider about failure

      res.json({
        success: true,
        data,
        message: 'Settlement marked as failed'
      });
    } catch (error) {
      next(error);
    }
  }

  // Recalculate settlement
  async recalculateSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Get settlement details
      const { data: settlement, error: settlementError } = await supabase
        .from('settlements')
        .select('*')
        .eq('id', id)
        .single();

      if (settlementError) {
        if (settlementError.code === 'PGRST116') {
          throw new AppError('Settlement not found', 404);
        }
        throw settlementError;
      }

      // Only allow recalculation for pending settlements
      if (settlement.status !== 'pending') {
        throw new AppError('Can only recalculate pending settlements', 400);
      }

      // Recalculate amounts
      const startDate = `${settlement.year}-${String(settlement.month).padStart(2, '0')}-01`;
      const endDate = settlement.month === 12 
        ? `${settlement.year + 1}-01-01`
        : `${settlement.year}-${String(settlement.month + 1).padStart(2, '0')}-01`;

      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_amount, provider_fee, platform_fee')
        .eq('provider_id', settlement.provider_id)
        .eq('status', 'completed')
        .gte('completed_at', startDate)
        .lt('completed_at', endDate);

      const grossAmount = bookings?.reduce((sum, b) => sum + b.total_amount, 0) || 0;
      const platformFee = bookings?.reduce((sum, b) => sum + (b.platform_fee || 0), 0) || 0;
      const netAmount = bookings?.reduce((sum, b) => sum + (b.provider_fee || 0), 0) || 0;

      const { data: updated, error: updateError } = await supabase
        .from('settlements')
        .update({
          total_bookings: bookings?.length || 0,
          gross_amount: grossAmount,
          platform_fee: platformFee,
          net_amount: netAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      res.json({
        success: true,
        data: updated,
        message: 'Settlement recalculated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get settlement statistics
  async getSettlementStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { year } = req.query;
      const currentYear = year || new Date().getFullYear();

      // Get yearly statistics
      const { data: settlements, error } = await supabase
        .from('settlements')
        .select('month, status, gross_amount, platform_fee, net_amount')
        .eq('year', currentYear);

      if (error) throw error;

      // Calculate statistics
      const monthlyStats = Array.from({ length: 12 }, (_, i) => {
        const monthSettlements = settlements?.filter(s => s.month === i + 1) || [];
        return {
          month: i + 1,
          total_settlements: monthSettlements.length,
          gross_amount: monthSettlements.reduce((sum, s) => sum + s.gross_amount, 0),
          platform_fee: monthSettlements.reduce((sum, s) => sum + s.platform_fee, 0),
          net_amount: monthSettlements.reduce((sum, s) => sum + s.net_amount, 0),
          pending: monthSettlements.filter(s => s.status === 'pending').length,
          completed: monthSettlements.filter(s => s.status === 'completed').length,
          failed: monthSettlements.filter(s => s.status === 'failed').length
        };
      });

      const yearlyTotal = {
        total_settlements: settlements?.length || 0,
        gross_amount: settlements?.reduce((sum, s) => sum + s.gross_amount, 0) || 0,
        platform_fee: settlements?.reduce((sum, s) => sum + s.platform_fee, 0) || 0,
        net_amount: settlements?.reduce((sum, s) => sum + s.net_amount, 0) || 0,
        pending: settlements?.filter(s => s.status === 'pending').length || 0,
        completed: settlements?.filter(s => s.status === 'completed').length || 0,
        failed: settlements?.filter(s => s.status === 'failed').length || 0
      };

      res.json({
        success: true,
        data: {
          year: currentYear,
          monthly: monthlyStats,
          yearly: yearlyTotal
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const settlementController = new SettlementController();