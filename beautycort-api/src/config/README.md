# Supabase Configuration

This directory contains the Supabase client configuration and helper functions for the BeautyCort API.

## Files

- `supabase.ts` - Main Supabase client configuration with typed helpers
- `supabase.example.ts` - Usage examples for all helper functions

## Setup

1. Add these environment variables to your `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Optional, needed for admin operations
```

2. Import and use the client:

```typescript
import { db, auth, supabase } from './config/supabase';
```

## Features

### 🔐 Typed Supabase Clients

- **Regular client** (`supabase`) - For authenticated operations
- **Admin client** (`supabaseAdmin`) - For elevated privileges (requires service key)

### 🛠️ Helper Functions

The configuration exports organized helper functions for all database operations:

#### Database Helpers (`db`)

**Users**
- `db.users.findByPhone(phone)` - Find user by phone number
- `db.users.create(userData)` - Create new user
- `db.users.update(userId, updates)` - Update user profile

**Providers**
- `db.providers.findByEmail(email)` - Find provider by email
- `db.providers.findByPhone(phone)` - Find provider by phone
- `db.providers.searchNearby(lat, lng, radius)` - Search providers by location
- `db.providers.getWithServices(providerId)` - Get provider with all services

**Services**
- `db.services.getByProvider(providerId)` - Get provider's services
- `db.services.getByCategory(categoryId)` - Get services in category

**Bookings**
- `db.bookings.checkAvailability(...)` - Check time slot availability
- `db.bookings.create(bookingData)` - Create new booking
- `db.bookings.getWithDetails(bookingId)` - Get booking with relations
- `db.bookings.updateStatus(bookingId, status)` - Update booking status
- `db.bookings.getUserBookings(userId, options)` - Get user's bookings

**Reviews**
- `db.reviews.create(reviewData)` - Create review
- `db.reviews.getProviderReviews(providerId, options)` - Get provider reviews

**Categories**
- `db.categories.getAll()` - Get all service categories

**Settlements**
- `db.settlements.generateMonthly(month, year)` - Generate monthly settlements
- `db.settlements.getProviderSettlements(providerId, year)` - Get provider settlements

#### Authentication Helpers (`auth`)

- `auth.signUpUser(phone, name, email)` - Register new customer
- `auth.signUpProvider(providerData)` - Register new provider
- `auth.signInProvider(email, password)` - Provider login
- `auth.signOut()` - Sign out current user
- `auth.getSession()` - Get current session
- `auth.getUser()` - Get current user

### 🔍 Error Handling

All helper functions return a consistent response format:

```typescript
type SupabaseResponse<T> = {
  data: T | null;
  error: Error | null;
};
```

Example usage:

```typescript
const { data, error } = await db.users.findByPhone('+966501234567');

if (error) {
  console.error('Error:', error.message);
  return;
}

// Use data safely
console.log('User:', data);
```

### 📊 Real-time Subscriptions

Use the raw Supabase client for real-time features:

```typescript
const subscription = supabase
  .channel('bookings')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'bookings' 
    },
    payload => {
      console.log('New booking:', payload.new);
    }
  )
  .subscribe();
```

### 🔒 Security Features

- Row Level Security (RLS) is enforced at the database level
- Admin client only available when service key is provided
- All operations respect RLS policies
- Automatic session management

## Usage Examples

Check `supabase.example.ts` for comprehensive examples of:

- User authentication and profile management
- Provider registration and search
- Booking creation and management
- Review system
- Real-time subscriptions
- Error handling patterns
- Complex queries with relations

## Best Practices

1. **Always handle errors** - Check for errors in every response
2. **Use typed helpers** - Prefer `db.*` helpers over raw queries
3. **Batch operations** - Use Supabase's select with relations
4. **Clean up subscriptions** - Unsubscribe when components unmount
5. **Use transactions** - For multi-step operations (bookings, payments)

## Common Patterns

### Fetching with Relations

```typescript
// Get booking with all related data
const { data: booking } = await db.bookings.getWithDetails(bookingId);

// Access nested data safely
booking?.provider?.business_name_ar
booking?.service?.price
booking?.review?.rating
```

### Pagination

```typescript
const { data: bookings } = await db.bookings.getUserBookings(userId, {
  limit: 20,
  offset: 40, // Skip first 40 records
  status: 'completed'
});
```

### Location-based Search

```typescript
const { data: providers } = await db.providers.searchNearby(
  24.7136,  // latitude
  46.6753,  // longitude
  10        // radius in km
);
```

## Troubleshooting

### Missing Environment Variables
If you see "Missing required Supabase environment variables", ensure:
- `.env` file exists in project root
- Variables are properly named (SUPABASE_URL, not NEXT_PUBLIC_SUPABASE_URL)
- Server is restarted after adding variables

### Type Errors
Run `npm run build` to ensure TypeScript types are in sync with database schema.

### RLS Errors
If operations fail with "new row violates row-level security policy":
- Check user authentication
- Verify RLS policies in Supabase dashboard
- Use admin client for elevated operations