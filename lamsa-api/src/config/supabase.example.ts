/**
 * Supabase Client Usage Examples
 * 
 * This file demonstrates how to use the Supabase client configuration
 * with proper error handling and TypeScript types.
 */

import { db, auth, supabase } from './supabase';
import { BookingStatus } from '../types/database';

// Example 1: User Operations
async function userExamples() {
  // Find user by phone
  const { data: user, error } = await db.users.findByPhone('+966501234567');
  if (error) {
    console.error('Error finding user:', error.message);
    return;
  }
  console.log('User found:', user);

  // Create new user
  const { data: newUser, error: createError } = await db.users.create({
    phone: '+966501234567',
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    language: 'ar',
  });

  // Update user profile
  if (newUser) {
    const { data: updatedUser, error: updateError } = await db.users.update(
      newUser.id,
      { name: 'أحمد محمد الجديد' }
    );
  }
}

// Example 2: Provider Search and Details
async function providerExamples() {
  // Search nearby providers (Riyadh coordinates)
  const { data: nearbyProviders, error } = await db.providers.searchNearby(
    24.7136, // latitude
    46.6753, // longitude
    10       // radius in km
  );

  if (nearbyProviders && nearbyProviders.length > 0) {
    // Get provider with all services and availability
    const { data: providerDetails } = await db.providers.getWithServices(
      nearbyProviders[0].id
    );
    
    console.log('Provider:', providerDetails?.business_name_ar);
    console.log('Services:', providerDetails?.services);
    console.log('Availability:', providerDetails?.availability);
  }
}

// Example 3: Booking Flow
async function bookingExample() {
  const providerId = 'provider-uuid';
  const userId = 'user-uuid';
  const serviceId = 'service-uuid';
  
  // Step 1: Check availability
  const { data: isAvailable } = await db.bookings.checkAvailability(
    providerId,
    '2024-01-15',
    '14:00',
    '15:00'
  );

  if (!isAvailable) {
    console.log('Time slot not available');
    return;
  }

  // Step 2: Create booking
  const { data: booking, error } = await db.bookings.create({
    user_id: userId,
    provider_id: providerId,
    service_id: serviceId,
    booking_date: '2024-01-15',
    start_time: '14:00',
    end_time: '15:00',
    status: 'pending',
    payment_method: 'cash',
    amount: 150.00,
    notes: 'Please be gentle with my hair',
  });

  if (booking) {
    console.log('Booking created:', booking.id);
    console.log('Platform fee:', booking.platform_fee); // Automatically calculated
    console.log('Provider fee:', booking.provider_fee); // Automatically calculated
  }

  // Step 3: Update booking status
  if (booking) {
    const { data: updatedBooking } = await db.bookings.updateStatus(
      booking.id,
      'confirmed'
    );
  }
}

// Example 4: Reviews
async function reviewExample() {
  const bookingId = 'booking-uuid';
  const userId = 'user-uuid';
  const providerId = 'provider-uuid';

  // Create a review
  const { data: review, error } = await db.reviews.create({
    booking_id: bookingId,
    user_id: userId,
    provider_id: providerId,
    rating: 5,
    comment: 'خدمة ممتازة والموظفين محترمين',
  });

  // Provider rating is automatically updated by database trigger

  // Get provider reviews
  const { data: reviews } = await db.reviews.getProviderReviews(
    providerId,
    { limit: 10, offset: 0 }
  );
}

// Example 5: Service Categories and Services
async function serviceExamples() {
  // Get all categories
  const { data: categories } = await db.categories.getAll();
  
  if (categories && categories.length > 0) {
    // Get services in a category
    const { data: services } = await db.services.getByCategory(
      categories[0].id
    );
    
    services?.forEach(service => {
      console.log(`${service.name_ar} - ${service.price} SAR`);
      console.log(`Provider: ${(service as any).provider?.business_name_ar}`);
      console.log(`Rating: ${(service as any).provider?.rating} ⭐`);
    });
  }
}

// Example 6: Authentication
async function authExamples() {
  // Sign up a new provider
  const { data: providerData, error: signUpError } = await auth.signUpProvider({
    email: 'salon@example.com',
    password: 'securePassword123',
    phone: '+966501234567',
    business_name_ar: 'صالون الجمال',
    business_name_en: 'Beauty Salon',
    owner_name: 'فاطمة أحمد',
    latitude: 24.7136,
    longitude: 46.6753,
    address: {
      street: 'شارع الملك فهد',
      city: 'الرياض',
      district: 'العليا',
      country: 'السعودية',
    },
  });

  if (providerData) {
    console.log('Provider created:', providerData.provider.id);
  }

  // Sign in provider
  const { data: sessionData, error: signInError } = await auth.signInProvider(
    'salon@example.com',
    'securePassword123'
  );

  if (sessionData) {
    console.log('Provider signed in:', sessionData.provider.business_name_ar);
    console.log('Session:', sessionData.session);
  }

  // Get current session
  const { data: { session } } = await auth.getSession();
  if (session) {
    console.log('Active session found');
  }
}

// Example 7: Real-time Subscriptions
async function realtimeExample() {
  // Subscribe to new bookings for a provider
  const providerId = 'provider-uuid';
  
  const subscription = supabase
    .channel('provider-bookings')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings',
        filter: `provider_id=eq.${providerId}`,
      },
      (payload) => {
        console.log('New booking received:', payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `provider_id=eq.${providerId}`,
      },
      (payload) => {
        console.log('Booking updated:', payload.new);
      }
    )
    .subscribe();

  // Cleanup subscription when done
  // subscription.unsubscribe();
}

// Example 8: Settlements
async function settlementExample() {
  // Generate monthly settlements for all providers
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const { error } = await db.settlements.generateMonthly(
    currentMonth,
    currentYear
  );

  if (!error) {
    console.log('Monthly settlements generated successfully');
  }

  // Get provider settlements
  const providerId = 'provider-uuid';
  const { data: settlements } = await db.settlements.getProviderSettlements(
    providerId,
    currentYear
  );

  settlements?.forEach(settlement => {
    console.log(`Month ${settlement.month}/${settlement.year}`);
    console.log(`Total bookings: ${settlement.total_bookings}`);
    console.log(`Total amount: ${settlement.total_amount} SAR`);
    console.log(`Platform fees: ${settlement.total_fees} SAR`);
    console.log(`Net amount: ${settlement.total_amount - settlement.total_fees} SAR`);
  });
}

// Example 9: Complex Queries with Filters
async function complexQueryExample() {
  // Get user's completed bookings with reviews
  const userId = 'user-uuid';
  
  const { data: bookings } = await db.bookings.getUserBookings(
    userId,
    {
      status: 'completed',
      limit: 20,
      offset: 0,
    }
  );

  bookings?.forEach(booking => {
    console.log(`Booking on ${booking.booking_date} at ${booking.start_time}`);
    console.log(`Provider: ${booking.provider?.business_name_ar}`);
    console.log(`Service: ${booking.service?.name_ar}`);
    if (booking.review) {
      console.log(`Review: ${booking.review.rating} stars - ${booking.review.comment}`);
    }
  });
}

// Example 10: Error Handling Pattern
async function errorHandlingExample() {
  const { data, error } = await db.users.findByPhone('+966501234567');
  
  if (error) {
    // Log error for debugging
    console.error('Database error:', error);
    
    // Return user-friendly error response
    return {
      success: false,
      message: 'Unable to find user. Please try again.',
    };
  }
  
  // Process data
  return {
    success: true,
    data: data,
  };
}

// Export examples for testing
export {
  userExamples,
  providerExamples,
  bookingExample,
  reviewExample,
  serviceExamples,
  authExamples,
  realtimeExample,
  settlementExample,
  complexQueryExample,
  errorHandlingExample,
};