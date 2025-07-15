# BeautyCort API Documentation

## Overview

The BeautyCort API is a comprehensive booking system designed for the Jordan beauty services market. This REST API provides endpoints for managing beauty service bookings, user authentication, provider management, and business analytics.

**Base URL**: `http://localhost:3000/api`  
**Version**: 1.0  
**Authentication**: JWT Bearer Token  
**Content-Type**: `application/json`

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Handling](#error-handling)
4. [Data Formats](#data-formats)
5. [Booking Endpoints](#booking-endpoints)
6. [Business Logic](#business-logic)
7. [Mobile Integration](#mobile-integration)
8. [Testing Examples](#testing-examples)

---

## Authentication

### JWT Token Format
```
Authorization: Bearer <jwt-token>
```

### Token Payload
```typescript
{
  id: string;           // User ID
  type: 'customer' | 'provider';
  phone?: string;       // Jordanian phone number
  email?: string;
  iat: number;          // Issued at
  exp: number;          // Expires at
}
```

### Role-Based Access
- **Customer**: Can create, view own bookings, cancel own bookings
- **Provider**: Can view provider bookings, update booking status, bulk operations
- **Admin**: Full access to all operations

---

## Rate Limiting

All endpoints have rate limiting with specific headers returned:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1642694400
```

### Endpoint-Specific Limits
- **Booking Creation**: 5 requests per 15 minutes
- **Booking Cancellation**: 3 requests per hour
- **Booking Reschedule**: 3 requests per 30 minutes
- **Bulk Operations**: 10 requests per hour
- **General Booking**: 100 requests per 15 minutes

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (booking conflicts)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error

### Common Error Codes
- `BOOKING_CONFLICT`: Time slot already booked
- `INVALID_TIME_SLOT`: Past date or outside business hours
- `PROVIDER_NOT_AVAILABLE`: Provider unavailable
- `INVALID_STATUS_TRANSITION`: Invalid booking status change
- `MINIMUM_NOTICE_REQUIRED`: Insufficient advance notice
- `CAPACITY_EXCEEDED`: Provider capacity exceeded

---

## Data Formats

### Date and Time
- **Date**: ISO 8601 format (`YYYY-MM-DD`)
- **Time**: 24-hour format (`HH:mm`)
- **DateTime**: ISO 8601 format (`YYYY-MM-DDTHH:mm:ssZ`)

### Phone Numbers
Supports Jordanian phone number formats:
- `+962791234567` (international)
- `0791234567` (local with 0)
- `791234567` (local without 0)

### Currency
- All amounts in **JOD** (Jordanian Dinar)
- Decimal format with 2 places (`25.50`)

### Pagination
```json
{
  "success": true,
  "data": {
    "data": [],
    "total": 150,
    "page": 1,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Booking Endpoints

### 1. Create Booking

**POST** `/api/bookings`

Creates a new booking with the specified details.

**Authentication**: Required (any role)  
**Rate Limit**: 5 requests per 15 minutes

#### Request Body
```json
{
  "providerId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "serviceId": "service1-1111-1111-1111-111111111111",
  "date": "2024-07-20",
  "time": "14:30",
  "paymentMethod": "cash",
  "notes": "Please call before arriving"
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| providerId | UUID | Yes | Provider identifier |
| serviceId | UUID | Yes | Service identifier |
| date | Date | Yes | Booking date (YYYY-MM-DD) |
| time | Time | Yes | Booking time (HH:mm) |
| paymentMethod | String | No | `cash`, `card`, `online` |
| notes | String | No | Customer notes (max 500 chars) |
| customerPhone | String | No | Jordanian phone number |
| estimatedAmount | Number | No | Expected amount (0-1000 JOD) |

#### Validation Rules
- Date must be 2 hours to 90 days in the future
- Time must be within business hours (8:00-22:00)
- Online payment required for amounts > 100 JOD
- Provider and service must exist and be active

#### Success Response (201)
```json
{
  "success": true,
  "data": {
    "id": "booking1-1111-1111-1111-111111111111",
    "userId": "11111111-1111-1111-1111-111111111111",
    "providerId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "serviceId": "service1-1111-1111-1111-111111111111",
    "bookingDate": "2024-07-20",
    "startTime": "14:30",
    "endTime": "15:30",
    "status": "pending",
    "paymentMethod": "cash",
    "amount": 25.00,
    "platformFee": 2.00,
    "providerFee": 23.00,
    "notes": "Please call before arriving",
    "createdAt": "2024-07-15T10:00:00Z",
    "updatedAt": "2024-07-15T10:00:00Z",
    "userName": "أحمد محمد",
    "userPhone": "+962781234567",
    "providerName": "صالون الجمال",
    "serviceName": "قص الشعر",
    "serviceDuration": 60
  },
  "message": "Booking created successfully"
}
```

#### Error Responses
```json
// Time slot conflict (409)
{
  "success": false,
  "error": "Time slot is already booked"
}

// Invalid time (400)
{
  "success": false,
  "error": "Cannot book appointments in the past"
}

// Validation error (400)
{
  "success": false,
  "error": "Invalid phone number format. Please use Jordan format (e.g., 0791234567)"
}
```

---

### 2. Get User Bookings

**GET** `/api/bookings/user`

Retrieves paginated list of current user's bookings.

**Authentication**: Required (any role)  
**Cache**: 1 minute TTL

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | Number | No | Page number (1-1000, default: 1) |
| limit | Number | No | Items per page (1-100, default: 10) |
| status | String | No | Filter by status |
| dateFrom | Date | No | Start date filter |
| dateTo | Date | No | End date filter |
| sortBy | String | No | Sort field (`date`, `time`, `amount`, `status`) |
| sortOrder | String | No | Sort order (`asc`, `desc`) |

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "booking1-1111-1111-1111-111111111111",
        "providerId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "serviceId": "service1-1111-1111-1111-111111111111",
        "bookingDate": "2024-07-20",
        "startTime": "14:30",
        "endTime": "15:30",
        "status": "confirmed",
        "amount": 25.00,
        "providerName": "صالون الجمال",
        "serviceName": "قص الشعر",
        "createdAt": "2024-07-15T10:00:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 3. Get Provider Bookings

**GET** `/api/bookings/provider/:providerId`

Retrieves bookings for a specific provider.

**Authentication**: Required (provider owns bookings or admin)  
**Cache**: 1 minute TTL

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| providerId | UUID | Yes | Provider identifier |

#### Query Parameters
Same as user bookings endpoint.

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "booking1-1111-1111-1111-111111111111",
        "userId": "11111111-1111-1111-1111-111111111111",
        "serviceId": "service1-1111-1111-1111-111111111111",
        "bookingDate": "2024-07-20",
        "startTime": "14:30",
        "endTime": "15:30",
        "status": "pending",
        "amount": 25.00,
        "userName": "أحمد محمد",
        "userPhone": "+962781234567",
        "serviceName": "قص الشعر",
        "createdAt": "2024-07-15T10:00:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 4. Get Booking Details

**GET** `/api/bookings/:id`

Retrieves detailed information for a specific booking.

**Authentication**: Required (user involved in booking or admin)

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Booking identifier |

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "booking1-1111-1111-1111-111111111111",
    "userId": "11111111-1111-1111-1111-111111111111",
    "providerId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "serviceId": "service1-1111-1111-1111-111111111111",
    "bookingDate": "2024-07-20",
    "startTime": "14:30",
    "endTime": "15:30",
    "status": "confirmed",
    "paymentMethod": "cash",
    "amount": 25.00,
    "platformFee": 2.00,
    "providerFee": 23.00,
    "notes": "Customer notes",
    "createdAt": "2024-07-15T10:00:00Z",
    "updatedAt": "2024-07-15T11:00:00Z",
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "أحمد محمد",
      "phone": "+962781234567",
      "language": "ar"
    },
    "provider": {
      "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "businessNameAr": "صالون الجمال",
      "businessNameEn": "Beauty Salon",
      "phone": "+962781111111",
      "address": {
        "ar": "عمان، الأردن",
        "en": "Amman, Jordan"
      }
    },
    "service": {
      "id": "service1-1111-1111-1111-111111111111",
      "nameAr": "قص الشعر",
      "nameEn": "Hair Cut",
      "price": 25.00,
      "duration": 60
    }
  }
}
```

#### Error Response (404)
```json
{
  "success": false,
  "error": "Booking not found"
}
```

---

### 5. Update Booking Status

**PATCH** `/api/bookings/:id/status`

Updates the status of a booking.

**Authentication**: Required (provider or admin)  
**Authorized Roles**: Provider (for their bookings), Admin

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Booking identifier |

#### Request Body
```json
{
  "status": "confirmed",
  "reason": "Customer called to confirm",
  "providerNotes": "Customer requested specific time"
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | String | Yes | `pending`, `confirmed`, `completed`, `cancelled`, `no_show` |
| reason | String | No | Reason for status change (max 200 chars) |
| providerNotes | String | No | Provider notes (max 300 chars) |

#### Valid Status Transitions
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `completed`, `cancelled`, `no_show`
- `completed` → (final state)
- `cancelled` → (final state)
- `no_show` → (final state)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "booking1-1111-1111-1111-111111111111",
    "status": "confirmed",
    "updatedAt": "2024-07-15T12:00:00Z",
    "reason": "Customer called to confirm",
    "providerNotes": "Customer requested specific time"
  },
  "message": "Booking status updated successfully"
}
```

#### Error Responses
```json
// Invalid transition (400)
{
  "success": false,
  "error": "Cannot change status from 'completed' to 'pending'"
}

// Insufficient permissions (403)
{
  "success": false,
  "error": "Only providers can confirm bookings"
}
```

---

### 6. Cancel Booking

**POST** `/api/bookings/:id/cancel`

Cancels an existing booking.

**Authentication**: Required (any role)  
**Rate Limit**: 3 requests per hour

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Booking identifier |

#### Request Body
```json
{
  "reason": "Schedule conflict",
  "refundRequested": true,
  "notifyCustomer": true
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | String | No | Cancellation reason (10-200 chars) |
| refundRequested | Boolean | No | Whether refund is requested |
| notifyCustomer | Boolean | No | Send notification to customer |

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "booking1-1111-1111-1111-111111111111",
    "status": "cancelled",
    "cancelledAt": "2024-07-15T13:00:00Z",
    "reason": "Schedule conflict",
    "refundRequested": true
  },
  "message": "Booking cancelled successfully"
}
```

#### Error Responses
```json
// Cannot cancel (400)
{
  "success": false,
  "error": "Cancellation is not allowed for this booking"
}

// Past booking (400)
{
  "success": false,
  "error": "Cannot modify past bookings"
}
```

---

### 7. Reschedule Booking

**POST** `/api/bookings/:id/reschedule`

Reschedules a booking to a new date and time.

**Authentication**: Required (any role)  
**Rate Limit**: 3 requests per 30 minutes

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Booking identifier |

#### Request Body
```json
{
  "date": "2024-07-22",
  "time": "16:00",
  "reason": "Customer requested change"
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| date | Date | Yes | New booking date (YYYY-MM-DD) |
| time | Time | Yes | New booking time (HH:mm) |
| reason | String | No | Reschedule reason (max 200 chars) |

#### Validation Rules
- New date must be 2 hours to 90 days in the future
- New time must be within business hours (8:00-22:00)
- New time slot must be available
- Cannot reschedule completed or cancelled bookings

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "booking1-1111-1111-1111-111111111111",
    "bookingDate": "2024-07-22",
    "startTime": "16:00",
    "endTime": "17:00",
    "updatedAt": "2024-07-15T14:00:00Z",
    "reason": "Customer requested change"
  },
  "message": "Booking rescheduled successfully"
}
```

#### Error Responses
```json
// Time conflict (409)
{
  "success": false,
  "error": "New time slot is already booked"
}

// Invalid status (400)
{
  "success": false,
  "error": "Cannot reschedule completed bookings"
}
```

---

### 8. Check Availability

**POST** `/api/bookings/check-availability`

Checks if a specific time slot is available for booking.

**Authentication**: Required (any role)

#### Request Body
```json
{
  "providerId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "serviceId": "service1-1111-1111-1111-111111111111",
  "date": "2024-07-20",
  "time": "14:30",
  "duration": 60,
  "excludeBookingId": "booking2-2222-2222-2222-222222222222"
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| providerId | UUID | Yes | Provider identifier |
| serviceId | UUID | Yes | Service identifier |
| date | Date | Yes | Requested date (YYYY-MM-DD) |
| time | Time | Yes | Requested time (HH:mm) |
| duration | Number | No | Duration in minutes (15-480) |
| excludeBookingId | UUID | No | Exclude booking from conflict check |

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "available": false,
    "message": "Time slot conflicts with existing bookings",
    "conflictingBookings": [
      {
        "id": "booking3-3333-3333-3333-333333333333",
        "startTime": "14:00",
        "endTime": "15:00",
        "customerName": "Sara Ahmad",
        "serviceName": "مانيكير"
      }
    ],
    "suggestedTimes": [
      {
        "startTime": "16:00",
        "endTime": "17:00",
        "available": true
      },
      {
        "startTime": "17:30",
        "endTime": "18:30",
        "available": true
      }
    ]
  }
}
```

#### Available Response
```json
{
  "success": true,
  "data": {
    "available": true,
    "message": "Time slot is available",
    "estimatedAmount": 25.00,
    "duration": 60
  }
}
```

---

### 9. Search Bookings

**GET** `/api/bookings/search`

Advanced search for bookings with multiple filters.

**Authentication**: Required (role-based filtering)  
**Cache**: 5 minutes TTL

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | String | No | Search text (2-100 chars) |
| status | String | No | Booking status filter |
| providerId | UUID | No | Provider filter |
| serviceId | UUID | No | Service filter |
| dateFrom | Date | No | Start date filter |
| dateTo | Date | No | End date filter |
| minAmount | Number | No | Minimum amount filter |
| maxAmount | Number | No | Maximum amount filter |
| paymentMethod | String | No | Payment method filter |
| page | Number | No | Page number (default: 1) |
| limit | Number | No | Items per page (default: 10) |
| sortBy | String | No | Sort field |
| sortOrder | String | No | Sort order (`asc`, `desc`) |

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "booking1-1111-1111-1111-111111111111",
        "bookingDate": "2024-07-20",
        "startTime": "14:30",
        "status": "confirmed",
        "amount": 25.00,
        "userName": "أحمد محمد",
        "providerName": "صالون الجمال",
        "serviceName": "قص الشعر",
        "createdAt": "2024-07-15T10:00:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false,
    "filters": {
      "status": "confirmed",
      "dateFrom": "2024-07-15",
      "dateTo": "2024-07-25"
    }
  }
}
```

---

### 10. Bulk Operations

**POST** `/api/bookings/bulk`

Perform bulk operations on multiple bookings.

**Authentication**: Required (provider or admin)  
**Rate Limit**: 10 requests per hour

#### Request Body
```json
{
  "bookingIds": [
    "booking1-1111-1111-1111-111111111111",
    "booking2-2222-2222-2222-222222222222",
    "booking3-3333-3333-3333-333333333333"
  ],
  "operation": "confirm",
  "reason": "Bulk confirmation after payment processing",
  "newDate": "2024-07-22",
  "newTime": "10:00"
}
```

#### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bookingIds | Array | Yes | Array of booking UUIDs (1-50 items) |
| operation | String | Yes | `cancel`, `confirm`, `complete`, `reschedule` |
| reason | String | No | Operation reason (max 200 chars) |
| newDate | Date | Conditional | Required for reschedule operation |
| newTime | Time | Conditional | Required for reschedule operation |

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "successful": [
      {
        "bookingId": "booking1-1111-1111-1111-111111111111",
        "status": "confirmed",
        "updatedAt": "2024-07-15T15:00:00Z"
      },
      {
        "bookingId": "booking2-2222-2222-2222-222222222222",
        "status": "confirmed",
        "updatedAt": "2024-07-15T15:00:00Z"
      }
    ],
    "failed": [
      {
        "bookingId": "booking3-3333-3333-3333-333333333333",
        "error": "Booking already completed",
        "code": "INVALID_STATUS_TRANSITION"
      }
    ]
  },
  "message": "Bulk confirm completed: 2 successful, 1 failed"
}
```

---

### 11. Booking Analytics

**GET** `/api/bookings/analytics/stats`

Retrieve booking statistics and analytics.

**Authentication**: Required (provider for own data, admin for all)  
**Cache**: 15 minutes TTL

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | String | No | `day`, `week`, `month`, `quarter`, `year` |
| startDate | Date | No | Start date for custom period |
| endDate | Date | No | End date for custom period |
| providerId | UUID | No | Filter by provider (admin only) |
| groupBy | String | No | `day`, `week`, `month`, `service`, `provider`, `status` |
| includeRevenue | Boolean | No | Include revenue data |

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBookings": 150,
      "completedBookings": 120,
      "cancelledBookings": 20,
      "pendingBookings": 10,
      "totalRevenue": 3750.00,
      "averageBookingValue": 25.00,
      "completionRate": 0.80,
      "cancellationRate": 0.13
    },
    "periodData": [
      {
        "period": "2024-07-15",
        "bookings": 15,
        "revenue": 375.00,
        "completed": 12,
        "cancelled": 2,
        "pending": 1
      },
      {
        "period": "2024-07-16",
        "bookings": 18,
        "revenue": 450.00,
        "completed": 15,
        "cancelled": 1,
        "pending": 2
      }
    ],
    "topServices": [
      {
        "serviceId": "service1-1111-1111-1111-111111111111",
        "serviceName": "قص الشعر",
        "bookings": 45,
        "revenue": 1125.00
      }
    ],
    "period": "week",
    "dateRange": {
      "start": "2024-07-15",
      "end": "2024-07-21"
    }
  }
}
```

---

### 12. Export Bookings

**GET** `/api/bookings/export/csv`

Export filtered bookings to CSV format.

**Authentication**: Required (provider for own data, admin for all)

#### Query Parameters
Same as search endpoint for filtering.

#### Success Response (200)
Returns CSV file with headers:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="bookings-export-20240715.csv"
```

#### CSV Format
```csv
Booking ID,Date,Time,Customer Name,Provider Name,Service Name,Status,Amount,Payment Method,Created At
booking1-1111-1111-1111-111111111111,2024-07-20,14:30,أحمد محمد,صالون الجمال,قص الشعر,confirmed,25.00,cash,2024-07-15T10:00:00Z
```

---

### 13. Get Booking Reminders

**GET** `/api/bookings/reminders`

Get upcoming booking reminders.

**Authentication**: Required (role-based filtering)  
**Cache**: 1 minute TTL

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| days | Number | No | Days ahead (0-7, default: 1) |
| hours | Number | No | Hours ahead (1-72, default: 24) |
| includeConfirmed | Boolean | No | Include confirmed bookings |
| includePending | Boolean | No | Include pending bookings |
| limit | Number | No | Max results (1-100, default: 50) |

#### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "booking1-1111-1111-1111-111111111111",
      "bookingDate": "2024-07-16",
      "startTime": "14:30",
      "status": "confirmed",
      "userName": "أحمد محمد",
      "userPhone": "+962781234567",
      "providerName": "صالون الجمال",
      "serviceName": "قص الشعر",
      "timeUntilBooking": "2 hours",
      "reminderType": "2_hours_before"
    }
  ]
}
```

---

### 14. Booking Dashboard

**GET** `/api/bookings/dashboard`

Get role-specific dashboard data.

**Authentication**: Required (role-based data)  
**Cache**: 5 minutes TTL

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | String | No | Dashboard period (`today`, `week`, `month`) |

#### Success Response (200)

**Customer Dashboard:**
```json
{
  "success": true,
  "data": {
    "upcomingBookings": [
      {
        "id": "booking1-1111-1111-1111-111111111111",
        "bookingDate": "2024-07-20",
        "startTime": "14:30",
        "providerName": "صالون الجمال",
        "serviceName": "قص الشعر",
        "status": "confirmed"
      }
    ],
    "recentBookings": [],
    "stats": {
      "totalBookings": 15,
      "completedBookings": 12,
      "totalSpent": 375.00
    },
    "favoriteProviders": [
      {
        "providerId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "providerName": "صالون الجمال",
        "bookingCount": 8
      }
    ]
  }
}
```

**Provider Dashboard:**
```json
{
  "success": true,
  "data": {
    "todayBookings": [
      {
        "id": "booking1-1111-1111-1111-111111111111",
        "startTime": "14:30",
        "userName": "أحمد محمد",
        "serviceName": "قص الشعر",
        "status": "confirmed"
      }
    ],
    "pendingBookings": 5,
    "stats": {
      "todayRevenue": 175.00,
      "weeklyRevenue": 875.00,
      "monthlyRevenue": 3250.00,
      "completionRate": 0.85
    },
    "topServices": [
      {
        "serviceName": "قص الشعر",
        "bookings": 25,
        "revenue": 625.00
      }
    ]
  }
}
```

---

### 15. System Health Check

**GET** `/api/bookings/health`

Check booking system health and metrics.

**Authentication**: Not required

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-07-15T16:00:00Z",
    "version": "1.0.0",
    "database": {
      "status": "connected",
      "responseTime": "15ms"
    },
    "cache": {
      "status": "active",
      "hitRate": 0.85
    },
    "metrics": {
      "totalBookings": 1250,
      "activeBookings": 45,
      "avgResponseTime": "120ms"
    }
  }
}
```

---

## Business Logic

### Booking Status Lifecycle

```
pending → confirmed → completed
    ↓         ↓         (final)
cancelled   cancelled
    ↓         ↓
(final)   no_show
            ↓
         (final)
```

### Time Constraints

- **Business Hours**: 8:00 AM - 10:00 PM
- **Minimum Advance**: 2 hours before booking
- **Maximum Advance**: 90 days in the future  
- **Maximum Duration**: 8 hours (480 minutes)

### Payment Rules

- **Cash**: Default payment method
- **Card**: Available for all amounts
- **Online**: Required for bookings > 100 JOD

### Fee Structure

- **Platform Fee**: 8% of service amount
- **Provider Fee**: Service amount - Platform fee

### Jordan Market Rules

- **Phone Numbers**: Must be valid Jordanian format
- **Currency**: All amounts in JOD
- **Language**: Arabic (ar) is default, English (en) available
- **Working Days**: Sunday to Thursday (Middle East standard)

---

## Mobile Integration

### Complete Booking Flow Example

```javascript
// 1. Check availability
const availabilityResponse = await fetch('/api/bookings/check-availability', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceId: 'service1-1111-1111-1111-111111111111',
    date: '2024-07-20',
    time: '14:30'
  })
});

// 2. Create booking if available
if (availabilityResponse.data.available) {
  const bookingResponse = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      serviceId: 'service1-1111-1111-1111-111111111111',
      date: '2024-07-20',
      time: '14:30',
      paymentMethod: 'cash',
      notes: 'Mobile app booking'
    })
  });
}

// 3. Get user bookings for display
const userBookings = await fetch('/api/bookings/user?page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Error Handling in Mobile Apps

```javascript
try {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  });

  const result = await response.json();

  if (!result.success) {
    // Handle specific errors
    switch (result.error) {
      case 'Time slot is already booked':
        showTimeConflictDialog();
        break;
      case 'Invalid phone number format. Please use Jordan format (e.g., 0791234567)':
        showPhoneValidationError();
        break;
      default:
        showGenericError(result.error);
    }
  }
} catch (error) {
  showNetworkError();
}
```

### Rate Limiting Handling

```javascript
const handleRateLimit = (response) => {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  
  if (response.status === 429) {
    const resetTime = new Date(reset * 1000);
    showRateLimitMessage(`Too many requests. Try again at ${resetTime.toLocaleTimeString()}`);
  }
  
  // Update UI with remaining requests
  updateRateLimitDisplay(remaining);
};
```

---

## Testing Examples

### Creating Test Bookings

```javascript
// Test data for mobile app testing
const testBookings = {
  // Valid booking
  validBooking: {
    providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceId: 'service1-1111-1111-1111-111111111111',
    date: '2024-07-25', // Future date
    time: '14:30',
    paymentMethod: 'cash'
  },
  
  // Booking requiring online payment
  highAmountBooking: {
    providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceId: 'service4-4444-4444-4444-444444444444', // Premium service
    date: '2024-07-25',
    time: '10:00',
    paymentMethod: 'online' // Required for >100 JOD
  },
  
  // Invalid booking (past date)
  invalidBooking: {
    providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceId: 'service1-1111-1111-1111-111111111111',
    date: '2024-07-10', // Past date
    time: '14:30'
  }
};
```

### Testing Phone Number Validation

```javascript
const phoneTestCases = [
  '+962791234567', // Valid international
  '0791234567',    // Valid local with 0
  '791234567',     // Valid local without 0
  '962791234567',  // Valid without +
  '0781234567',    // Valid (78 prefix)
  '0771234567',    // Valid (77 prefix)
  '0701234567',    // Invalid (70 prefix)
  '79123456',      // Invalid (too short)
  '07912345678'    // Invalid (too long)
];
```

### Pagination Testing

```javascript
// Test pagination parameters
const paginationTests = [
  { page: 1, limit: 10 },   // Default
  { page: 1, limit: 100 },  // Max limit
  { page: 0, limit: 10 },   // Invalid page (should fail)
  { page: 1, limit: 101 },  // Invalid limit (should fail)
  { page: 1000, limit: 10 } // Edge case
];
```

---

This comprehensive documentation provides everything needed for mobile development teams to integrate with the BeautyCort booking API. For additional support or questions, contact the development team.