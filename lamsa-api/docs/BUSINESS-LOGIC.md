# Lamsa Business Logic Documentation

## Overview

This document details the business rules, validation logic, and constraints that govern the Lamsa booking system. It provides developers with a comprehensive understanding of the domain-specific requirements for the Jordan beauty services market.

## Table of Contents

1. [Booking Lifecycle](#booking-lifecycle)
2. [Time and Date Constraints](#time-and-date-constraints)
3. [Payment Rules](#payment-rules)
4. [User Roles and Permissions](#user-roles-and-permissions)
5. [Jordan Market Specifications](#jordan-market-specifications)
6. [Validation Rules](#validation-rules)
7. [Business Constraints](#business-constraints)
8. [Fee Structure](#fee-structure)
9. [Conflict Resolution](#conflict-resolution)
10. [Notification Rules](#notification-rules)

---

## Booking Lifecycle

### Status States
The booking system uses a finite state machine with the following states:

```
┌─────────┐    confirm    ┌───────────┐    complete    ┌───────────┐
│ pending │──────────────→│ confirmed │──────────────→│ completed │
└─────────┘                └───────────┘                └───────────┘
     │                          │                           │
     │ cancel                   │ cancel                    │ (final)
     ↓                          ↓                           │
┌───────────┐              ┌───────────┐                   │
│ cancelled │              │ cancelled │                   │
└───────────┘              └───────────┘                   │
     │                          │                           │
   (final)                    (final)                      │
                                │                           │
                                │ no_show                   │
                                ↓                           │
                           ┌─────────┐                      │
                           │ no_show │                      │
                           └─────────┘                      │
                                │                           │
                             (final)                       │
                                                           │
                              All final states ────────────┘
```

### Status Transitions

| From Status | Valid Next States | Who Can Change | Business Rules |
|-------------|-------------------|----------------|----------------|
| `pending` | `confirmed`, `cancelled` | Provider, Admin | Customer can cancel |
| `confirmed` | `completed`, `cancelled`, `no_show` | Provider, Admin | Customer can cancel with restrictions |
| `completed` | (none) | (none) | Final state |
| `cancelled` | (none) | (none) | Final state |
| `no_show` | (none) | (none) | Final state |

### State Change Rules

#### Pending to Confirmed
- **Who**: Provider or Admin
- **When**: After provider accepts booking
- **Restrictions**: Service must be active, provider must be verified
- **Side Effects**: Customer notification sent

#### Confirmed to Completed
- **Who**: Provider or Admin
- **When**: After service is delivered
- **Restrictions**: Must be on or after booking date
- **Side Effects**: Payment processed, review invitation sent

#### Any to Cancelled
- **Who**: Customer (own bookings), Provider (their bookings), Admin
- **When**: Before service completion
- **Restrictions**: 
  - Customers: Can cancel up to 2 hours before booking
  - Providers: Can cancel with valid reason
  - Past bookings cannot be cancelled
- **Side Effects**: Refund processing (if applicable), notification sent

#### Confirmed to No Show
- **Who**: Provider or Admin
- **When**: Customer doesn't appear for confirmed booking
- **Restrictions**: Can only be set after booking time has passed
- **Side Effects**: No refund, affects customer rating

---

## Time and Date Constraints

### Business Hours
```javascript
const BUSINESS_HOURS = {
  start: '08:00',  // 8:00 AM
  end: '22:00',    // 10:00 PM
  timezone: 'Asia/Amman'
};
```

### Booking Time Windows

#### Advance Booking Rules
- **Minimum Advance**: 2 hours from current time
- **Maximum Advance**: 90 days from current date
- **Buffer Time**: 15 minutes between consecutive bookings

#### Example Validation
```javascript
const now = new Date();
const bookingDateTime = new Date(`${date}T${time}`);

// Minimum advance check
const minAdvanceTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
if (bookingDateTime < minAdvanceTime) {
  throw new Error('Booking must be at least 2 hours in advance');
}

// Maximum advance check
const maxAdvanceTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
if (bookingDateTime > maxAdvanceTime) {
  throw new Error('Booking cannot be more than 90 days in advance');
}

// Business hours check
const hour = parseInt(time.split(':')[0]);
if (hour < 8 || hour >= 22) {
  throw new Error('Booking must be within business hours (8:00-22:00)');
}
```

### Working Days
- **Standard Week**: Sunday to Thursday
- **Weekend**: Friday and Saturday
- **Holiday Handling**: System maintains Jordan public holiday calendar
- **Provider Schedule**: Individual providers can set custom availability

### Time Slot Management
```javascript
const TIME_SLOT_RULES = {
  minimumDuration: 15,      // 15 minutes
  maximumDuration: 480,     // 8 hours
  defaultDuration: 60,      // 1 hour
  slotIncrement: 15,        // 15-minute increments
  bufferTime: 15            // 15 minutes between bookings
};
```

---

## Payment Rules

### Payment Methods

#### Cash Payment
- **Default Method**: Available for all booking amounts
- **Collection**: At service location
- **Restrictions**: None
- **Processing**: Manual confirmation by provider

#### Card Payment
- **Availability**: All amounts
- **Processing**: Through payment gateway integration
- **Restrictions**: Valid card required
- **Timing**: Can be processed at booking or service time

#### Online Payment
- **Mandatory For**: Bookings over 100 JOD
- **Processing**: Immediate through payment gateway
- **Restrictions**: Requires internet connection
- **Refunds**: Automatic for cancellations

### Amount Thresholds
```javascript
const PAYMENT_RULES = {
  highValueThreshold: 100.00,  // JOD
  requireOnlinePayment: true,  // For amounts > threshold
  maxBookingAmount: 1000.00,   // JOD
  minBookingAmount: 5.00       // JOD
};
```

### Payment Validation Logic
```javascript
function validatePaymentMethod(amount, paymentMethod) {
  if (amount > 100.00 && paymentMethod !== 'online') {
    throw new ValidationError(
      'Online payment required for bookings over 100 JOD',
      'PAYMENT_METHOD_REQUIRED'
    );
  }
  
  if (amount < 5.00) {
    throw new ValidationError(
      'Minimum booking amount is 5 JOD',
      'AMOUNT_TOO_LOW'
    );
  }
  
  if (amount > 1000.00) {
    throw new ValidationError(
      'Maximum booking amount is 1000 JOD',
      'AMOUNT_TOO_HIGH'
    );
  }
}
```

---

## User Roles and Permissions

### Customer Role
**Capabilities:**
- Create bookings for any active provider/service
- View own booking history
- Cancel own bookings (with time restrictions)
- Reschedule own bookings (pending status only)
- Leave reviews for completed bookings

**Restrictions:**
- Cannot modify other customers' bookings
- Cannot change booking status (except cancel)
- Cannot access provider analytics
- Cannot perform bulk operations

### Provider Role
**Capabilities:**
- View all bookings for their services
- Update booking status (confirm, complete, no-show)
- Cancel bookings with valid reason
- Access booking analytics for their business
- Perform bulk operations on their bookings
- Manage service availability

**Restrictions:**
- Cannot view other providers' bookings
- Cannot modify customer information
- Cannot access system-wide analytics
- Cannot change platform fees

### Admin Role
**Capabilities:**
- Full access to all bookings
- System-wide analytics and reporting
- User management and moderation
- Platform configuration
- Dispute resolution
- Data export and backup

**Restrictions:**
- Should follow audit trail requirements
- Cannot impersonate users for bookings
- Must document administrative actions

### Permission Matrix
| Action | Customer | Provider | Admin |
|--------|----------|----------|-------|
| Create Booking | ✅ Own | ❌ | ✅ Any |
| View Booking | ✅ Own | ✅ Own Provider | ✅ Any |
| Confirm Booking | ❌ | ✅ Own | ✅ Any |
| Cancel Booking | ✅ Own | ✅ Own Provider | ✅ Any |
| Complete Booking | ❌ | ✅ Own | ✅ Any |
| Mark No-Show | ❌ | ✅ Own | ✅ Any |
| View Analytics | ❌ | ✅ Own | ✅ System-wide |
| Bulk Operations | ❌ | ✅ Own | ✅ Any |
| Export Data | ❌ | ✅ Own | ✅ Any |

---

## Jordan Market Specifications

### Phone Number Format
**Supported Formats:**
```javascript
const JORDAN_PHONE_PATTERNS = [
  /^\+962[789]\d{8}$/,      // +962791234567
  /^962[789]\d{8}$/,        // 962791234567
  /^0[789]\d{8}$/,          // 0791234567
  /^[789]\d{8}$/            // 791234567
];

const VALID_PREFIXES = ['77', '78', '79']; // Jordanian mobile prefixes
```

**Validation Logic:**
```javascript
function validateJordanianPhone(phone) {
  // Normalize to international format
  let normalized = phone.replace(/\s+/g, '');
  
  if (normalized.startsWith('00962')) {
    normalized = '+' + normalized.substring(2);
  } else if (normalized.startsWith('962')) {
    normalized = '+' + normalized;
  } else if (normalized.startsWith('0')) {
    normalized = '+962' + normalized.substring(1);
  } else if (/^[789]\d{8}$/.test(normalized)) {
    normalized = '+962' + normalized;
  }
  
  // Validate final format
  if (!/^\+962[789]\d{8}$/.test(normalized)) {
    throw new ValidationError(
      'Invalid phone number format. Please use Jordan format (e.g., 0791234567)',
      'INVALID_PHONE_FORMAT'
    );
  }
  
  return normalized;
}
```

### Currency and Localization
```javascript
const JORDAN_LOCALE = {
  currency: 'JOD',
  currencySymbol: 'د.أ',
  decimalPlaces: 2,
  thousandsSeparator: ',',
  decimalSeparator: '.',
  defaultLanguage: 'ar',
  supportedLanguages: ['ar', 'en'],
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h'
};
```

### Business Calendar
- **Weekend**: Friday and Saturday
- **Working Week**: Sunday to Thursday
- **Public Holidays**: Integrated with Jordan public holiday calendar
- **Ramadan Hours**: Adjusted business hours during Ramadan month

### Cultural Considerations
- **Default Language**: Arabic (right-to-left)
- **Name Format**: Arabic names have different structure
- **Service Names**: Bilingual (Arabic primary, English secondary)
- **Religious Observances**: System respects prayer times and religious holidays

---

## Validation Rules

### Data Type Validations

#### UUID Validation
```javascript
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value, fieldName) {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(
      `${fieldName} must be a valid UUID`,
      'INVALID_UUID'
    );
  }
}
```

#### Date Validation
```javascript
function validateBookingDate(dateString) {
  // Check format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new ValidationError(
      'Date must be in YYYY-MM-DD format',
      'INVALID_DATE_FORMAT'
    );
  }
  
  const date = new Date(dateString);
  const now = new Date();
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    throw new ValidationError(
      'Invalid date provided',
      'INVALID_DATE'
    );
  }
  
  // Check future date
  if (date < now.setHours(0, 0, 0, 0)) {
    throw new ValidationError(
      'Date must be in the future',
      'DATE_IN_PAST'
    );
  }
  
  // Check maximum advance
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  if (date > maxDate) {
    throw new ValidationError(
      'Date cannot be more than 90 days in the future',
      'DATE_TOO_FAR'
    );
  }
}
```

#### Time Validation
```javascript
function validateBookingTime(timeString, date) {
  // Check format (HH:mm)
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeString)) {
    throw new ValidationError(
      'Time must be in HH:mm format',
      'INVALID_TIME_FORMAT'
    );
  }
  
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Check business hours
  if (hours < 8 || hours >= 22) {
    throw new ValidationError(
      'Time must be within business hours (8:00-22:00)',
      'TIME_OUTSIDE_HOURS'
    );
  }
  
  // Check minimum advance time
  const bookingDateTime = new Date(`${date}T${timeString}:00`);
  const minTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
  
  if (bookingDateTime < minTime) {
    throw new ValidationError(
      'Booking must be at least 2 hours in advance',
      'INSUFFICIENT_ADVANCE'
    );
  }
}
```

### Business Rule Validations

#### Service Availability
```javascript
async function validateServiceAvailability(providerId, serviceId) {
  const service = await Service.findOne({
    where: { id: serviceId, providerId, active: true }
  });
  
  if (!service) {
    throw new ValidationError(
      'The requested service is not currently active',
      'SERVICE_INACTIVE'
    );
  }
  
  const provider = await Provider.findOne({
    where: { id: providerId, verified: true }
  });
  
  if (!provider) {
    throw new ValidationError(
      'The provider is not currently available',
      'PROVIDER_INACTIVE'
    );
  }
  
  return { service, provider };
}
```

#### Booking Conflict Detection
```javascript
async function validateBookingConflict(providerId, date, startTime, endTime, excludeBookingId = null) {
  const conflictingBookings = await Booking.findAll({
    where: {
      providerId,
      bookingDate: date,
      status: ['pending', 'confirmed'],
      ...(excludeBookingId && { id: { [Op.ne]: excludeBookingId } }),
      [Op.or]: [
        // New booking starts during existing booking
        {
          startTime: { [Op.lte]: startTime },
          endTime: { [Op.gt]: startTime }
        },
        // New booking ends during existing booking
        {
          startTime: { [Op.lt]: endTime },
          endTime: { [Op.gte]: endTime }
        },
        // New booking encompasses existing booking
        {
          startTime: { [Op.gte]: startTime },
          endTime: { [Op.lte]: endTime }
        }
      ]
    }
  });
  
  if (conflictingBookings.length > 0) {
    throw new ConflictError(
      'Time slot is already booked',
      'BOOKING_CONFLICT',
      { conflictingBookings }
    );
  }
}
```

---

## Business Constraints

### Capacity Management
```javascript
const CAPACITY_RULES = {
  maxConcurrentBookings: 1,     // One booking per time slot per provider
  maxDailyBookings: 20,         // Maximum bookings per day per provider
  maxWeeklyBookings: 100,       // Maximum bookings per week per provider
  overbookingAllowed: false     // No overbooking allowed
};
```

### Booking Limits
```javascript
const BOOKING_LIMITS = {
  customer: {
    maxPendingBookings: 5,      // Maximum pending bookings per customer
    maxDailyBookings: 3,        // Maximum bookings per day per customer
    maxMonthlyBookings: 20      // Maximum bookings per month per customer
  },
  provider: {
    maxDailyCapacity: 20,       // Maximum appointments per day
    minBreakBetween: 15,        // Minimum minutes between bookings
    maxWorkingHours: 12         // Maximum working hours per day
  }
};
```

### Modification Restrictions

#### Cancellation Rules
```javascript
function validateCancellation(booking, userRole, userId) {
  // Check if booking can be cancelled
  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new ValidationError(
      'Cannot cancel completed or already cancelled booking',
      'CANCELLATION_NOT_ALLOWED'
    );
  }
  
  // Check time restrictions for customers
  if (userRole === 'customer' && userId === booking.userId) {
    const bookingTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
    const now = new Date();
    const timeDiff = bookingTime - now;
    const hoursUntilBooking = timeDiff / (1000 * 60 * 60);
    
    if (hoursUntilBooking < 2) {
      throw new ValidationError(
        'Cannot cancel booking less than 2 hours before appointment',
        'CANCELLATION_TOO_LATE'
      );
    }
  }
  
  // Providers and admins can cancel anytime with reason
  if (userRole === 'provider' && userId !== booking.providerId) {
    throw new ValidationError(
      'Providers can only cancel their own bookings',
      'INSUFFICIENT_PERMISSIONS'
    );
  }
}
```

#### Reschedule Rules
```javascript
function validateReschedule(booking, newDate, newTime, userRole) {
  // Only pending bookings can be rescheduled
  if (booking.status !== 'pending') {
    throw new ValidationError(
      'Only pending bookings can be rescheduled',
      'RESCHEDULE_NOT_ALLOWED'
    );
  }
  
  // Customer can only reschedule their own bookings
  if (userRole === 'customer') {
    const originalTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
    const now = new Date();
    const hoursUntilBooking = (originalTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilBooking < 4) {
      throw new ValidationError(
        'Cannot reschedule booking less than 4 hours before appointment',
        'RESCHEDULE_TOO_LATE'
      );
    }
  }
  
  // Validate new time slot
  validateBookingDate(newDate);
  validateBookingTime(newTime, newDate);
}
```

---

## Fee Structure

### Platform Fees
Lamsa uses a fixed-fee structure based on service amount:

```javascript
const FEE_STRUCTURE = {
  lowTierThreshold: 25.00,      // 25 JOD threshold
  lowTierFee: 2.00,             // 2 JOD fee for services ≤25 JOD
  highTierFee: 5.00,            // 5 JOD fee for services >25 JOD
  paymentProcessingFee: 0.025,  // 2.5% for online payments (future)
  refundFee: 2.00              // 2 JOD refund processing fee
};
```

### Fee Calculation
```javascript
function calculateFees(serviceAmount, paymentMethod) {
  // Calculate platform fee based on fixed tiers
  let platformFee;
  if (serviceAmount <= FEE_STRUCTURE.lowTierThreshold) {
    platformFee = FEE_STRUCTURE.lowTierFee;
  } else {
    platformFee = FEE_STRUCTURE.highTierFee;
  }
  
  // Calculate payment processing fee (future implementation)
  let processingFee = 0;
  if (paymentMethod === 'online') {
    processingFee = serviceAmount * FEE_STRUCTURE.paymentProcessingFee;
  }
  
  // Calculate provider earnings
  const providerEarnings = serviceAmount - platformFee - processingFee;
  
  // Ensure provider earnings are not negative
  if (providerEarnings < 0) {
    throw new Error('Platform fee cannot exceed service amount');
  }
  
  return {
    serviceAmount: Number(serviceAmount.toFixed(2)),
    platformFee: Number(platformFee.toFixed(2)),
    processingFee: Number(processingFee.toFixed(2)),
    providerEarnings: Number(providerEarnings.toFixed(2)),
    totalFees: Number((platformFee + processingFee).toFixed(2)),
    feePercentage: Number(((platformFee / serviceAmount) * 100).toFixed(2))
  };
}
```

### Fee Examples
- Service cost: 20 JOD → Platform fee: 2 JOD → Provider earnings: 18 JOD (10% effective rate)
- Service cost: 25 JOD → Platform fee: 2 JOD → Provider earnings: 23 JOD (8% effective rate)
- Service cost: 30 JOD → Platform fee: 5 JOD → Provider earnings: 25 JOD (16.67% effective rate)
- Service cost: 100 JOD → Platform fee: 5 JOD → Provider earnings: 95 JOD (5% effective rate)

### Refund Policies
```javascript
const REFUND_POLICIES = {
  fullRefund: {
    condition: 'Cancellation more than 24 hours before booking',
    refundRate: 1.0,
    processingFee: 0
  },
  partialRefund: {
    condition: 'Cancellation 2-24 hours before booking',
    refundRate: 0.5,
    processingFee: 2.00
  },
  noRefund: {
    condition: 'Cancellation less than 2 hours before booking',
    refundRate: 0,
    processingFee: 0
  },
  providerCancellation: {
    condition: 'Provider cancels booking',
    refundRate: 1.0,
    processingFee: 0,
    compensation: 5.00  // Additional compensation
  }
};
```

---

## Conflict Resolution

### Booking Conflicts
When booking conflicts occur, the system follows these resolution strategies:

#### Temporal Conflicts
1. **Detection**: Check for overlapping time slots
2. **Prevention**: Block conflicting bookings
3. **Resolution**: Suggest alternative time slots

#### Overbooking Scenarios
1. **Prevention**: Strict capacity enforcement
2. **Detection**: Real-time availability checking
3. **Resolution**: Queue system for high-demand slots

#### System Conflicts
1. **Data Consistency**: Use database transactions
2. **Race Conditions**: Implement optimistic locking
3. **Recovery**: Automatic rollback and retry mechanisms

### Dispute Resolution Process
```javascript
const DISPUTE_PROCESS = {
  autoResolution: {
    providerNoShow: 'Full refund + compensation',
    customerNoShow: 'No refund',
    serviceIssue: 'Partial refund based on severity'
  },
  manualReview: {
    trigger: 'Disputed auto-resolution',
    timeline: '2 business days',
    escalation: 'Admin review after 2 disputes'
  },
  compensation: {
    providerFault: 'Full refund + 10 JOD credit',
    systemFault: 'Full refund + service credit',
    customerFault: 'Standard cancellation policy'
  }
};
```

---

## Notification Rules

### Notification Triggers
```javascript
const NOTIFICATION_RULES = {
  bookingCreated: {
    recipients: ['customer', 'provider'],
    timing: 'immediate',
    channels: ['sms', 'push', 'email']
  },
  bookingConfirmed: {
    recipients: ['customer'],
    timing: 'immediate',
    channels: ['sms', 'push']
  },
  bookingReminder: {
    recipients: ['customer', 'provider'],
    timing: ['24h_before', '2h_before'],
    channels: ['sms', 'push']
  },
  bookingCancelled: {
    recipients: ['customer', 'provider'],
    timing: 'immediate',
    channels: ['sms', 'push', 'email']
  },
  statusUpdate: {
    recipients: ['customer'],
    timing: 'immediate',
    channels: ['push']
  }
};
```

### Message Templates
```javascript
const MESSAGE_TEMPLATES = {
  ar: {
    bookingCreated: 'تم إنشاء حجزك لخدمة {serviceName} في {providerName} بتاريخ {date} الساعة {time}',
    bookingConfirmed: 'تم تأكيد حجزك لخدمة {serviceName} في {providerName}',
    reminder24h: 'تذكير: لديك موعد غداً الساعة {time} لخدمة {serviceName}',
    reminder2h: 'تذكير: لديك موعد خلال ساعتين لخدمة {serviceName}'
  },
  en: {
    bookingCreated: 'Your booking for {serviceName} at {providerName} on {date} at {time} has been created',
    bookingConfirmed: 'Your booking for {serviceName} at {providerName} has been confirmed',
    reminder24h: 'Reminder: You have an appointment tomorrow at {time} for {serviceName}',
    reminder2h: 'Reminder: You have an appointment in 2 hours for {serviceName}'
  }
};
```

---

This business logic documentation provides a comprehensive understanding of the Lamsa booking system's domain rules and constraints. It serves as a reference for developers to implement features that comply with business requirements and Jordan market specifications.