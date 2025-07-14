import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { supabase } from '../config/supabase-simple';
import { RevenueService } from './revenue.service';
import { GamificationService } from './gamification.service';
import { CustomerAnalyticsService } from './customer-analytics.service';

export interface WebSocketClient {
  ws: WebSocket;
  providerId: string;
  subscriptions: Set<string>;
  lastHeartbeat: Date;
}

export interface RealtimeEvent {
  type: string;
  providerId: string;
  data: any;
  timestamp: string;
}

export interface NotificationPayload {
  id: string;
  type: 'booking' | 'review' | 'achievement' | 'goal_completed' | 'system';
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  data?: any;
  priority: 'low' | 'medium' | 'high';
  actionRequired?: boolean;
  timestamp: string;
}

export class RealtimeService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private revenueService: RevenueService;
  private gamificationService: GamificationService;
  private customerAnalyticsService: CustomerAnalyticsService;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.revenueService = new RevenueService();
    this.gamificationService = new GamificationService();
    this.customerAnalyticsService = new CustomerAnalyticsService();
  }

  // Initialize WebSocket server
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
    
    console.log('WebSocket server initialized on /ws');
  }

  private verifyClient(info: any): boolean {
    // Add authentication verification here
    // For now, allow all connections
    return true;
  }

  private handleConnection(ws: WebSocket, request: any): void {
    console.log('New WebSocket connection');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        this.handleMessage(ws, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to BeautyCort real-time service',
      timestamp: new Date().toISOString()
    }));
  }

  private handleMessage(ws: WebSocket, data: any): void {
    switch (data.type) {
      case 'authenticate':
        this.authenticateClient(ws, data);
        break;
      case 'subscribe':
        this.subscribeToEvents(ws, data);
        break;
      case 'unsubscribe':
        this.unsubscribeFromEvents(ws, data);
        break;
      case 'heartbeat':
        this.updateHeartbeat(ws);
        break;
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }

  private authenticateClient(ws: WebSocket, data: { providerId: string; token?: string }): void {
    // TODO: Verify JWT token here
    const { providerId, token } = data;

    if (!providerId) {
      ws.send(JSON.stringify({ error: 'Provider ID required' }));
      return;
    }

    // Store client information
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      ws,
      providerId,
      subscriptions: new Set(),
      lastHeartbeat: new Date()
    };

    this.clients.set(clientId, client);

    ws.send(JSON.stringify({
      type: 'authenticated',
      clientId,
      providerId,
      timestamp: new Date().toISOString()
    }));

    console.log(`Client authenticated: ${providerId}`);
  }

  private subscribeToEvents(ws: WebSocket, data: { events: string[] }): void {
    const client = this.findClientByWebSocket(ws);
    if (!client) {
      ws.send(JSON.stringify({ error: 'Client not authenticated' }));
      return;
    }

    data.events.forEach(eventType => {
      client.subscriptions.add(eventType);
    });

    ws.send(JSON.stringify({
      type: 'subscribed',
      events: data.events,
      timestamp: new Date().toISOString()
    }));

    console.log(`Client subscribed to: ${data.events.join(', ')}`);
  }

  private unsubscribeFromEvents(ws: WebSocket, data: { events: string[] }): void {
    const client = this.findClientByWebSocket(ws);
    if (!client) return;

    data.events.forEach(eventType => {
      client.subscriptions.delete(eventType);
    });

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      events: data.events,
      timestamp: new Date().toISOString()
    }));
  }

  private updateHeartbeat(ws: WebSocket): void {
    const client = this.findClientByWebSocket(ws);
    if (client) {
      client.lastHeartbeat = new Date();
      ws.send(JSON.stringify({
        type: 'heartbeat_ack',
        timestamp: new Date().toISOString()
      }));
    }
  }

  private handleDisconnection(ws: WebSocket): void {
    const clientEntry = Array.from(this.clients.entries())
      .find(([, client]) => client.ws === ws);
    
    if (clientEntry) {
      this.clients.delete(clientEntry[0]);
      console.log(`Client disconnected: ${clientEntry[1].providerId}`);
    }
  }

  private findClientByWebSocket(ws: WebSocket): WebSocketClient | undefined {
    return Array.from(this.clients.values()).find(client => client.ws === ws);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 60000; // 1 minute

      // Remove stale connections
      for (const [clientId, client] of this.clients.entries()) {
        if (now.getTime() - client.lastHeartbeat.getTime() > staleThreshold) {
          client.ws.terminate();
          this.clients.delete(clientId);
          console.log(`Removed stale client: ${client.providerId}`);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // Broadcast event to subscribed clients
  broadcast(event: RealtimeEvent): void {
    for (const client of this.clients.values()) {
      if (client.providerId === event.providerId && 
          client.subscriptions.has(event.type) &&
          client.ws.readyState === WebSocket.OPEN) {
        
        client.ws.send(JSON.stringify(event));
      }
    }
  }

  // Send notification to specific provider
  sendNotification(providerId: string, notification: NotificationPayload): void {
    const event: RealtimeEvent = {
      type: 'notification',
      providerId,
      data: notification,
      timestamp: new Date().toISOString()
    };

    this.broadcast(event);
  }

  // Send live metrics update
  async sendMetricsUpdate(providerId: string): Promise<void> {
    try {
      // Get current real-time metrics
      const { data: metrics } = await supabase
        .from('provider_realtime_metrics')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (metrics) {
        const event: RealtimeEvent = {
          type: 'metrics_update',
          providerId,
          data: {
            todaysBookings: metrics.todays_bookings,
            todaysRevenue: Number(metrics.todays_revenue),
            todaysNewCustomers: metrics.todays_new_customers,
            currentRating: metrics.todays_rating_count > 0 
              ? metrics.todays_rating_sum / metrics.todays_rating_count 
              : 0,
            isOnline: metrics.is_online,
            currentOccupancyRate: Number(metrics.current_occupancy_rate),
            availableSlotsToday: metrics.available_slots_today,
            lastUpdated: metrics.last_updated
          },
          timestamp: new Date().toISOString()
        };

        this.broadcast(event);
      }
    } catch (error) {
      console.error('Error sending metrics update:', error);
    }
  }

  // Handle new booking event
  async handleNewBooking(bookingData: any): Promise<void> {
    const providerId = bookingData.provider_id;
    
    // Update real-time metrics
    await this.updateRealtimeMetrics(providerId);
    
    // Send notification
    const notification: NotificationPayload = {
      id: `booking_${bookingData.id}`,
      type: 'booking',
      title: 'New Booking Request',
      titleAr: 'طلب حجز جديد',
      message: `New booking request for ${bookingData.service_name}`,
      messageAr: `طلب حجز جديد لخدمة ${bookingData.service_name_ar}`,
      data: {
        bookingId: bookingData.id,
        customerName: bookingData.customer_name,
        serviceName: bookingData.service_name,
        bookingDate: bookingData.booking_date,
        startTime: bookingData.start_time
      },
      priority: 'high',
      actionRequired: true,
      timestamp: new Date().toISOString()
    };

    this.sendNotification(providerId, notification);
    await this.sendMetricsUpdate(providerId);
  }

  // Handle booking completion
  async handleBookingCompletion(bookingData: any): Promise<void> {
    const providerId = bookingData.provider_id;
    
    // Update real-time metrics
    await this.updateRealtimeMetrics(providerId);
    
    // Update revenue
    await this.revenueService.updateRealtimeRevenue(
      providerId,
      Number(bookingData.total_price),
      bookingData.payment_method
    );

    // Check for goal completion
    await this.checkDailyGoalCompletion(providerId, 'bookings');
    await this.checkDailyGoalCompletion(providerId, 'revenue');

    // Send completion notification
    const notification: NotificationPayload = {
      id: `completion_${bookingData.id}`,
      type: 'booking',
      title: 'Booking Completed',
      titleAr: 'تم إكمال الحجز',
      message: `Booking completed successfully. Revenue: ${bookingData.total_price} JOD`,
      messageAr: `تم إكمال الحجز بنجاح. الإيرادات: ${bookingData.total_price} دينار`,
      data: {
        bookingId: bookingData.id,
        revenue: Number(bookingData.total_price)
      },
      priority: 'medium',
      timestamp: new Date().toISOString()
    };

    this.sendNotification(providerId, notification);
    await this.sendMetricsUpdate(providerId);
  }

  // Handle new review
  async handleNewReview(reviewData: any): Promise<void> {
    const providerId = reviewData.provider_id;
    
    // Update real-time metrics
    await this.updateRealtimeMetrics(providerId);
    
    // Check for achievements
    if (reviewData.rating === 5) {
      await this.checkRatingAchievements(providerId);
    }

    const notification: NotificationPayload = {
      id: `review_${reviewData.id}`,
      type: 'review',
      title: `New ${reviewData.rating}-Star Review`,
      titleAr: `تقييم جديد ${reviewData.rating} نجوم`,
      message: `${reviewData.customer_name} left a ${reviewData.rating}-star review`,
      messageAr: `${reviewData.customer_name} ترك تقييم ${reviewData.rating} نجوم`,
      data: {
        reviewId: reviewData.id,
        rating: reviewData.rating,
        customerName: reviewData.customer_name,
        serviceName: reviewData.service_name,
        needsResponse: !reviewData.response
      },
      priority: reviewData.rating <= 3 ? 'high' : 'medium',
      actionRequired: !reviewData.response,
      timestamp: new Date().toISOString()
    };

    this.sendNotification(providerId, notification);
    await this.sendMetricsUpdate(providerId);
  }

  // Handle achievement earned
  async handleAchievementEarned(providerId: string, achievementData: any): Promise<void> {
    const notification: NotificationPayload = {
      id: `achievement_${achievementData.id}`,
      type: 'achievement',
      title: 'Achievement Unlocked!',
      titleAr: 'تم فتح إنجاز!',
      message: `You earned: ${achievementData.name}`,
      messageAr: `حصلت على: ${achievementData.name_ar}`,
      data: {
        achievementId: achievementData.id,
        name: achievementData.name,
        points: achievementData.points,
        level: achievementData.level
      },
      priority: 'medium',
      timestamp: new Date().toISOString()
    };

    this.sendNotification(providerId, notification);

    // Also send updated level info
    const level = await this.gamificationService.getProviderLevel(providerId);
    const event: RealtimeEvent = {
      type: 'level_update',
      providerId,
      data: level,
      timestamp: new Date().toISOString()
    };

    this.broadcast(event);
  }

  // Update real-time metrics in database
  private async updateRealtimeMetrics(providerId: string): Promise<void> {
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // Get today's bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_price, status, user_id')
        .eq('provider_id', providerId)
        .gte('booking_date', startOfToday.toISOString().split('T')[0])
        .lte('booking_date', endOfToday.toISOString().split('T')[0]);

      // Get today's reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', providerId)
        .gte('created_at', startOfToday.toISOString())
        .lte('created_at', endOfToday.toISOString());

      const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
      const todaysRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
      const uniqueCustomers = new Set(completedBookings.map(b => b.user_id)).size;
      
      const ratingSum = reviews?.reduce((sum, r) => sum + r.rating, 0) || 0;
      const ratingCount = reviews?.length || 0;

      // Update real-time metrics
      await supabase
        .from('provider_realtime_metrics')
        .upsert({
          provider_id: providerId,
          todays_bookings: completedBookings.length,
          todays_revenue: todaysRevenue,
          todays_new_customers: uniqueCustomers,
          todays_rating_sum: ratingSum,
          todays_rating_count: ratingCount,
          last_updated: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error updating real-time metrics:', error);
    }
  }

  // Check if daily goals are completed
  private async checkDailyGoalCompletion(providerId: string, goalType: string): Promise<void> {
    try {
      const goals = await this.gamificationService.getDailyGoals(providerId);
      const goal = goals.find(g => g.type === goalType);
      
      if (goal && !goal.completed && goal.current >= goal.target) {
        // Complete the goal
        const pointsEarned = await this.gamificationService.completeGoal(providerId, goalType);
        
        if (pointsEarned > 0) {
          // Send goal completion notification
          const notification: NotificationPayload = {
            id: `goal_${goalType}_${Date.now()}`,
            type: 'goal_completed',
            title: 'Goal Completed!',
            titleAr: 'تم إكمال الهدف!',
            message: `You completed your ${goal.description} goal and earned ${pointsEarned} points!`,
            messageAr: `أكملت هدف ${goal.descriptionAr} وحصلت على ${pointsEarned} نقطة!`,
            data: {
              goalType,
              pointsEarned,
              description: goal.description
            },
            priority: 'medium',
            timestamp: new Date().toISOString()
          };

          this.sendNotification(providerId, notification);
        }
      }
    } catch (error) {
      console.error('Error checking goal completion:', error);
    }
  }

  // Check for rating-based achievements
  private async checkRatingAchievements(providerId: string): Promise<void> {
    try {
      // Get recent reviews to check for achievements
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!reviews) return;

      const fiveStarReviews = reviews.filter(r => r.rating === 5);
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      // Check for 5-star achievement milestones
      if (fiveStarReviews.length >= 10 && fiveStarReviews.length % 10 === 0) {
        await this.gamificationService.awardAchievement(
          providerId,
          'rating',
          `${fiveStarReviews.length} Five-Star Reviews`,
          Math.floor(fiveStarReviews.length / 10),
          fiveStarReviews.length * 10,
          fiveStarReviews.length,
          fiveStarReviews.length
        );
      }

      // Check for high average rating
      if (avgRating >= 4.8 && reviews.length >= 20) {
        await this.gamificationService.awardAchievement(
          providerId,
          'rating',
          'Excellence Champion',
          1,
          500,
          avgRating,
          4.8
        );
      }

    } catch (error) {
      console.error('Error checking rating achievements:', error);
    }
  }

  // Send system-wide announcements
  broadcastSystemAnnouncement(announcement: {
    title: string;
    titleAr: string;
    message: string;
    messageAr: string;
    priority: 'low' | 'medium' | 'high';
  }): void {
    const notification: NotificationPayload = {
      id: `system_${Date.now()}`,
      type: 'system',
      title: announcement.title,
      titleAr: announcement.titleAr,
      message: announcement.message,
      messageAr: announcement.messageAr,
      priority: announcement.priority,
      timestamp: new Date().toISOString()
    };

    // Send to all connected clients
    for (const client of this.clients.values()) {
      if (client.subscriptions.has('system') && client.ws.readyState === WebSocket.OPEN) {
        const event: RealtimeEvent = {
          type: 'notification',
          providerId: client.providerId,
          data: notification,
          timestamp: new Date().toISOString()
        };
        
        client.ws.send(JSON.stringify(event));
      }
    }
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  // Get clients by provider
  getProviderClients(providerId: string): WebSocketClient[] {
    return Array.from(this.clients.values()).filter(client => client.providerId === providerId);
  }

  // Cleanup on shutdown
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const client of this.clients.values()) {
      client.ws.terminate();
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    console.log('Realtime service shut down');
  }
}

export const realtimeService = new RealtimeService();