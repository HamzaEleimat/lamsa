# Booking Management System

## Overview

The BeautyCort booking management system provides comprehensive booking functionality with proper fee calculations, availability validation, transaction management, and audit trails.

## Architecture

### Core Components

1. **FeeCalculationService** - JOD-based fee calculations
2. **BookingService** - Main business logic and transaction handling
3. **AvailabilityService** - Time slot validation (existing)
4. **BookingAuditService** - History tracking and audit trails
5. **Custom Error Types** - Specific error handling for booking scenarios

### Fee Structure

- **Services ≤25 JOD**: 2 JOD platform fee
- **Services >25 JOD**: 5 JOD platform fee
- Provider earnings = Service amount - Platform fee

## API Endpoints

### Create Booking
```http
POST /api/bookings
Content-Type: application/json
Authorization: Bearer <token>

{
  "providerId": "uuid",
  "serviceId": "uuid", 
  "date": "2024-01-15",
  "time": "14:00",
  "paymentMethod": "cash",
  "notes": "Optional notes"
}
```

### Get User Bookings
```http
GET /api/bookings/user?page=1&limit=20&status=confirmed
Authorization: Bearer <token>
```

### Get Provider Bookings
```http
GET /api/bookings/provider/{providerId}?page=1&limit=20&status=pending&date=2024-01-15
Authorization: Bearer <token>
```

### Get Booking Details
```http
GET /api/bookings/{bookingId}
Authorization: Bearer <token>
```

### Update Booking Status
```http
PATCH /api/bookings/{bookingId}/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "confirmed",
  "reason": "Optional reason"
}
```

### Cancel Booking
```http
POST /api/bookings/{bookingId}/cancel
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "Optional cancellation reason"
}
```

### Reschedule Booking
```http
POST /api/bookings/{bookingId}/reschedule
Content-Type: application/json
Authorization: Bearer <token>

{
  "date": "2024-01-16",
  "time": "15:00",
  "reason": "Optional reason"
}
```

### Get Booking History
```http
GET /api/bookings/{bookingId}/history?page=1&limit=50
Authorization: Bearer <token>
```

## Booking Lifecycle

### Status Transitions
```
pending → confirmed → completed
pending → cancelled
confirmed → cancelled  
confirmed → no_show
confirmed → completed
```

### Permissions
- **Customers**: Can create, cancel own bookings
- **Providers**: Can confirm, complete, cancel, mark as no-show
- **Admins**: Can perform all operations

## Database Updates

### Fee Calculation Trigger
Run the following SQL to update database fee calculations:

```sql
-- Apply new fee calculation rules
\i database/fee-calculation-update.sql
```

This updates:
- Database trigger functions to use JOD-based fees
- Adds preview function for fee calculations
- Maintains backward compatibility

### Preview Fee Calculation
```sql
-- Preview fees for a 20 JOD service (should return 2 JOD fee)
SELECT * FROM preview_booking_fees(20.00);

-- Preview fees for a 30 JOD service (should return 5 JOD fee)  
SELECT * FROM preview_booking_fees(30.00);
```

## Error Handling

### Custom Error Types
- `BookingConflictError` - Time slot already booked
- `InvalidTimeSlotError` - Invalid time selection
- `ProviderNotAvailableError` - Provider unavailable
- `ServiceNotActiveError` - Service not active
- `BookingNotFoundError` - Booking doesn't exist
- `InvalidBookingStatusError` - Invalid status transition
- `BookingPastDueError` - Cannot modify past bookings
- `PaymentFailedError` - Payment processing failed
- `InsufficientPermissionError` - Access denied

### Error Response Format
```json
{
  "success": false,
  "error": "BookingConflictError",
  "message": "Time slot is already booked",
  "code": "BOOKING_CONFLICT",
  "statusCode": 409
}
```

## Transaction Management

### Automatic Rollback
All booking operations use database transactions with automatic rollback on failure:

1. **Create Booking**: Validation → Booking creation → Audit entry → Notifications
2. **Update Status**: Permission check → Status update → Audit entry → Notifications  
3. **Reschedule**: Availability check → Booking update → Audit entry → Notifications

### Consistency Guarantees
- Atomic operations across multiple tables
- Availability conflicts prevented with database constraints
- Fee calculations always consistent
- Audit trail never lost

## Audit Trail

### Tracked Events
- `created` - Booking creation
- `status_changed` - Status updates
- `rescheduled` - Date/time changes
- `cancelled` - Cancellations
- `payment_processed` - Successful payments
- `payment_failed` - Failed payments
- `system_update` - Automated changes

### Audit Entry Format
```json
{
  "id": "audit_123",
  "bookingId": "booking_456", 
  "action": "status_changed",
  "userId": "user_789",
  "userRole": "provider",
  "timestamp": "2024-01-15T14:30:00Z",
  "details": {
    "previousStatus": "pending",
    "newStatus": "confirmed"
  }
}
```

## Usage Examples

### Service Integration
```typescript
import { bookingService } from './services/booking.service';
import { FeeCalculationService } from './services/fee-calculation.service';

// Preview fee calculation
const fees = FeeCalculationService.getCompleteCalculation(25.00);
console.log(fees); // { serviceAmount: 25, platformFee: 2, providerEarnings: 23, feePercentage: 8 }

// Create booking
const booking = await bookingService.createBooking({
  userId: 'user_123',
  providerId: 'provider_456', 
  serviceId: 'service_789',
  bookingDate: new Date('2024-01-15'),
  startTime: '14:00',
  notes: 'First time customer'
});

// Update status
await bookingService.updateBookingStatus({
  bookingId: booking.id,
  newStatus: 'confirmed',
  userId: 'provider_456',
  userRole: 'provider'
});
```

### Error Handling
```typescript
try {
  await bookingService.createBooking(bookingData);
} catch (error) {
  if (error instanceof BookingConflictError) {
    // Handle time slot conflict
  } else if (error instanceof ProviderNotAvailableError) {
    // Handle provider unavailability
  } else {
    // Handle general error
  }
}
```

## Testing

### Test Database Setup
1. Apply schema: `psql -f database/schema.sql`
2. Apply fee updates: `psql -f database/fee-calculation-update.sql`
3. Insert test data

### Key Test Scenarios
- Fee calculations for different price tiers
- Booking conflicts and availability validation
- Status transition permissions
- Transaction rollback on failures
- Audit trail completeness

## Monitoring

### Key Metrics to Track
- Booking success/failure rates
- Fee calculation accuracy
- Average booking lifecycle duration
- Error frequency by type
- Audit trail completeness

### Logging
All booking operations are logged with:
- User actions and permissions
- Transaction boundaries
- Error details and stack traces
- Performance metrics

## Future Enhancements

### Planned Features
1. **Real Audit Table** - Dedicated database table for audit entries
2. **Notification Service** - Real-time booking notifications
3. **Payment Integration** - Tap Payment Gateway integration
4. **Capacity Management** - Multi-booking support per time slot
5. **Advanced Scheduling** - Recurring bookings, buffer times

### Performance Optimizations
- Database query optimization
- Caching for frequently accessed data
- Background processing for notifications
- Batch operations for bulk updates

## Support

For questions or issues:
1. Check error logs for specific error codes
2. Verify database triggers are properly installed
3. Ensure proper authentication and permissions
4. Review audit trail for operation history