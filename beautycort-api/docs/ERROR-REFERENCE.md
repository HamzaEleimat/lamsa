# BeautyCort API Error Reference

## Overview

This document provides a comprehensive reference for all error codes, status codes, and error handling patterns in the BeautyCort API. This guide helps developers understand and handle errors effectively in their applications.

## Table of Contents

1. [HTTP Status Codes](#http-status-codes)
2. [Error Response Format](#error-response-format)
3. [Authentication Errors](#authentication-errors)
4. [Validation Errors](#validation-errors)
5. [Business Logic Errors](#business-logic-errors)
6. [Resource Errors](#resource-errors)
7. [System Errors](#system-errors)
8. [Rate Limiting Errors](#rate-limiting-errors)
9. [Error Handling Best Practices](#error-handling-best-practices)
10. [Mobile App Error Handling](#mobile-app-error-handling)

---

## HTTP Status Codes

| Status Code | Meaning | When Used |
|-------------|---------|-----------|
| **200** | OK | Successful GET, PATCH requests |
| **201** | Created | Successful POST requests (resource created) |
| **400** | Bad Request | Validation errors, invalid input |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | Valid token but insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Business logic conflicts (booking conflicts) |
| **422** | Unprocessable Entity | Valid JSON but business rule violations |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server errors |
| **502** | Bad Gateway | External service errors |
| **503** | Service Unavailable | Database/service temporarily down |

---

## Error Response Format

### Standard Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-07-15T16:00:00Z",
  "path": "/api/bookings",
  "method": "POST"
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "phone",
      "message": "Invalid phone number format. Please use Jordan format (e.g., 0791234567)",
      "code": "INVALID_PHONE_FORMAT"
    },
    {
      "field": "date",
      "message": "Date must be in the future",
      "code": "INVALID_DATE"
    }
  ]
}
```

### Rate Limit Error Response
```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900,
  "limit": 5,
  "remaining": 0,
  "resetTime": "2024-07-15T16:15:00Z"
}
```

---

## Authentication Errors

### 401 Unauthorized

| Error Code | Message | Cause | Solution |
|------------|---------|--------|----------|
| `TOKEN_MISSING` | Authentication token is required | No Authorization header | Add `Authorization: Bearer <token>` header |
| `TOKEN_INVALID` | Invalid authentication token | Malformed JWT token | Refresh authentication token |
| `TOKEN_EXPIRED` | Authentication token has expired | JWT token expired | Refresh authentication token |
| `TOKEN_MALFORMED` | Malformed authentication token | Invalid JWT format | Obtain new authentication token |

#### Example
```json
{
  "success": false,
  "error": "Authentication token has expired",
  "code": "TOKEN_EXPIRED"
}
```

### 403 Forbidden

| Error Code | Message | Cause | Solution |
|------------|---------|--------|----------|
| `INSUFFICIENT_PERMISSIONS` | Insufficient permissions for this operation | Wrong user role | Use account with proper permissions |
| `PROVIDER_ONLY` | Only providers can perform this action | Customer trying provider action | Switch to provider account |
| `ADMIN_ONLY` | Only administrators can perform this action | Non-admin trying admin action | Contact administrator |
| `RESOURCE_ACCESS_DENIED` | Access denied for this resource | Accessing other user's data | Use own user ID |

#### Example
```json
{
  "success": false,
  "error": "Only providers can confirm bookings",
  "code": "PROVIDER_ONLY"
}
```

---

## Validation Errors

### 400 Bad Request - Field Validation

| Field | Error Code | Message | Validation Rule |
|-------|------------|---------|-----------------|
| `phone` | `INVALID_PHONE_FORMAT` | Invalid phone number format. Please use Jordan format (e.g., 0791234567) | Must match Jordanian format |
| `date` | `INVALID_DATE` | Date must be in YYYY-MM-DD format | ISO 8601 date format |
| `date` | `DATE_IN_PAST` | Date must be in the future | Must be at least 2 hours from now |
| `date` | `DATE_TOO_FAR` | Date cannot be more than 90 days in the future | Within 90-day booking window |
| `time` | `INVALID_TIME` | Time must be in HH:mm format | 24-hour format |
| `time` | `TIME_OUTSIDE_HOURS` | Time must be within business hours (8:00-22:00) | 8:00 AM - 10:00 PM |
| `time` | `INSUFFICIENT_ADVANCE` | Booking must be at least 2 hours in advance | Minimum 2-hour notice |
| `providerId` | `INVALID_UUID` | Provider ID must be a valid UUID | Valid UUID format |
| `serviceId` | `INVALID_UUID` | Service ID must be a valid UUID | Valid UUID format |
| `amount` | `INVALID_AMOUNT` | Amount must be between 0 and 1000 JOD | 0-1000 range |
| `paymentMethod` | `INVALID_PAYMENT_METHOD` | Payment method must be cash, card, or online | Valid enum value |
| `status` | `INVALID_STATUS` | Status must be pending, confirmed, completed, cancelled, or no_show | Valid enum value |
| `notes` | `NOTES_TOO_LONG` | Notes cannot exceed 500 characters | Maximum 500 characters |
| `reason` | `REASON_TOO_SHORT` | Reason must be at least 10 characters | Minimum 10 characters |
| `page` | `INVALID_PAGE` | Page must be between 1 and 1000 | Valid page range |
| `limit` | `INVALID_LIMIT` | Limit must be between 1 and 100 | Valid limit range |

#### Example
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "phone",
      "message": "Invalid phone number format. Please use Jordan format (e.g., 0791234567)",
      "code": "INVALID_PHONE_FORMAT",
      "value": "123456789"
    }
  ]
}
```

---

## Business Logic Errors

### 400 Bad Request - Business Rules

| Error Code | Message | Description | Solution |
|------------|---------|-------------|----------|
| `PAYMENT_METHOD_REQUIRED` | Online payment required for bookings over 100 JOD | High-value bookings need online payment | Use online payment method |
| `SERVICE_INACTIVE` | The requested service is not currently active | Service disabled by provider | Choose active service |
| `PROVIDER_INACTIVE` | The provider is not currently available | Provider account disabled | Choose different provider |
| `INVALID_STATUS_TRANSITION` | Cannot change status from 'completed' to 'pending' | Invalid booking status change | Check valid status transitions |
| `BOOKING_PAST_DUE` | Cannot modify past bookings | Trying to modify expired booking | Only modify future bookings |
| `CANCELLATION_NOT_ALLOWED` | Cancellation is not allowed for this booking | Business rule prevents cancellation | Contact support |
| `RESCHEDULE_NOT_ALLOWED` | Rescheduling is not allowed for this booking | Business rule prevents reschedule | Contact support |
| `CAPACITY_EXCEEDED` | Provider capacity exceeded for this time slot | Provider fully booked | Choose different time |
| `MINIMUM_NOTICE_REQUIRED` | Booking requires minimum advance notice | Insufficient notice period | Book with more advance notice |
| `MAXIMUM_DURATION_EXCEEDED` | Booking duration cannot exceed 8 hours | Duration too long | Split into multiple bookings |

#### Example
```json
{
  "success": false,
  "error": "Online payment required for bookings over 100 JOD",
  "code": "PAYMENT_METHOD_REQUIRED",
  "details": {
    "amount": 150.00,
    "requiredPaymentMethod": "online",
    "currentPaymentMethod": "cash"
  }
}
```

### 409 Conflict - Booking Conflicts

| Error Code | Message | Description | Solution |
|------------|---------|-------------|----------|
| `BOOKING_CONFLICT` | Time slot is already booked | Another booking exists at same time | Choose different time slot |
| `PROVIDER_CONFLICT` | Provider is not available at the requested time | Provider has conflicting appointment | Check availability first |
| `USER_CONFLICT` | User already has a booking at this time | Customer double-booking | Cancel existing booking first |

#### Example
```json
{
  "success": false,
  "error": "Time slot is already booked",
  "code": "BOOKING_CONFLICT",
  "conflictingBooking": {
    "id": "booking2-2222-2222-2222-222222222222",
    "startTime": "14:00",
    "endTime": "15:00",
    "customerName": "Sara Ahmad"
  },
  "suggestedTimes": [
    {
      "startTime": "16:00",
      "endTime": "17:00",
      "available": true
    }
  ]
}
```

---

## Resource Errors

### 404 Not Found

| Error Code | Message | Cause | Solution |
|------------|---------|--------|----------|
| `BOOKING_NOT_FOUND` | Booking not found | Invalid booking ID | Verify booking ID exists |
| `USER_NOT_FOUND` | User not found | Invalid user ID | Verify user exists |
| `PROVIDER_NOT_FOUND` | Provider not found | Invalid provider ID | Verify provider exists |
| `SERVICE_NOT_FOUND` | Service not found | Invalid service ID | Verify service exists |

#### Example
```json
{
  "success": false,
  "error": "Booking not found",
  "code": "BOOKING_NOT_FOUND",
  "requestedId": "invalid-booking-id"
}
```

---

## System Errors

### 500 Internal Server Error

| Error Code | Message | Cause | Solution |
|------------|---------|--------|----------|
| `DATABASE_ERROR` | Database operation failed | Database connectivity issue | Retry request, contact support |
| `TRANSACTION_FAILED` | Failed to complete transaction | Database transaction error | Retry request |
| `EXTERNAL_SERVICE_ERROR` | External service unavailable | Third-party service down | Retry later |
| `NOTIFICATION_FAILED` | Failed to send notification | Notification service error | Notification may not be sent |
| `CACHE_ERROR` | Cache operation failed | Redis/cache service error | Request still processed |

#### Example
```json
{
  "success": false,
  "error": "Database operation failed",
  "code": "DATABASE_ERROR",
  "requestId": "req_123456789"
}
```

### 502 Bad Gateway

| Error Code | Message | Cause | Solution |
|------------|---------|--------|----------|
| `PAYMENT_GATEWAY_ERROR` | Payment service unavailable | Payment processor down | Try different payment method |
| `SMS_SERVICE_ERROR` | SMS service unavailable | SMS service down | Notification may not be sent |

### 503 Service Unavailable

| Error Code | Message | Cause | Solution |
|------------|---------|--------|----------|
| `SERVICE_MAINTENANCE` | Service temporarily unavailable | Scheduled maintenance | Wait and retry |
| `DATABASE_UNAVAILABLE` | Database temporarily unavailable | Database maintenance | Wait and retry |

---

## Rate Limiting Errors

### 429 Too Many Requests

| Error Code | Message | Rate Limit | Reset Period |
|------------|---------|------------|---------------|
| `BOOKING_CREATION_LIMIT` | Too many booking creation attempts | 5 per 15 minutes | 15 minutes |
| `BOOKING_CANCELLATION_LIMIT` | Too many cancellation attempts | 3 per hour | 1 hour |
| `BOOKING_RESCHEDULE_LIMIT` | Too many reschedule attempts | 3 per 30 minutes | 30 minutes |
| `BULK_OPERATION_LIMIT` | Too many bulk operations | 10 per hour | 1 hour |
| `GENERAL_BOOKING_LIMIT` | Too many booking requests | 100 per 15 minutes | 15 minutes |
| `SUSPICIOUS_ACTIVITY` | Suspicious activity detected | Varies | Contact support |

#### Example
```json
{
  "success": false,
  "error": "Too many booking creation attempts",
  "code": "BOOKING_CREATION_LIMIT",
  "limit": 5,
  "remaining": 0,
  "retryAfter": 900,
  "resetTime": "2024-07-15T16:15:00Z"
}
```

---

## Error Handling Best Practices

### 1. Client-Side Error Handling

```javascript
async function makeAPIRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data.error, data.code, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      handleAPIError(error);
    } else {
      handleNetworkError(error);
    }
  }
}

class APIError extends Error {
  constructor(message, code, status, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
```

### 2. Error Recovery Strategies

```javascript
function handleAPIError(error) {
  switch (error.code) {
    case 'TOKEN_EXPIRED':
      return refreshTokenAndRetry();
    
    case 'BOOKING_CONFLICT':
      return showTimeSlotConflictDialog(error.details);
    
    case 'RATE_LIMIT_EXCEEDED':
      return showRateLimitMessage(error.details.retryAfter);
    
    case 'VALIDATION_ERROR':
      return showValidationErrors(error.details);
    
    default:
      return showGenericError(error.message);
  }
}
```

### 3. Retry Logic

```javascript
async function retryWithBackoff(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      // Don't retry client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Retry server errors with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Mobile App Error Handling

### React Native Error Handling

```javascript
import { Alert } from 'react-native';

class BookingService {
  async createBooking(bookingData) {
    try {
      const response = await this.apiClient.post('/bookings', bookingData);
      return response.data;
    } catch (error) {
      this.handleBookingError(error);
      throw error;
    }
  }

  handleBookingError(error) {
    const { code, message, details } = error;

    switch (code) {
      case 'BOOKING_CONFLICT':
        Alert.alert(
          'Time Conflict',
          'This time slot is already booked. Please choose a different time.',
          [
            { text: 'OK' },
            { text: 'View Available Times', onPress: () => this.showAvailableTimes(details) }
          ]
        );
        break;

      case 'INVALID_PHONE_FORMAT':
        Alert.alert(
          'Invalid Phone Number',
          'Please enter a valid Jordanian phone number (e.g., 0791234567)',
          [{ text: 'OK' }]
        );
        break;

      case 'PAYMENT_METHOD_REQUIRED':
        Alert.alert(
          'Payment Method Required',
          `Online payment is required for bookings over 100 JOD. Your booking amount is ${details.amount} JOD.`,
          [
            { text: 'Cancel' },
            { text: 'Pay Online', onPress: () => this.switchToOnlinePayment() }
          ]
        );
        break;

      case 'RATE_LIMIT_EXCEEDED':
        const retryTime = new Date(details.resetTime).toLocaleTimeString();
        Alert.alert(
          'Too Many Attempts',
          `Please wait until ${retryTime} before trying again.`,
          [{ text: 'OK' }]
        );
        break;

      default:
        Alert.alert('Error', message || 'An unexpected error occurred');
    }
  }
}
```

### Error State Management

```javascript
// Redux error slice
const errorSlice = createSlice({
  name: 'errors',
  initialState: {
    bookingErrors: [],
    globalError: null,
    rateLimitInfo: null
  },
  reducers: {
    addBookingError: (state, action) => {
      state.bookingErrors.push(action.payload);
    },
    clearBookingErrors: (state) => {
      state.bookingErrors = [];
    },
    setGlobalError: (state, action) => {
      state.globalError = action.payload;
    },
    setRateLimitInfo: (state, action) => {
      state.rateLimitInfo = action.payload;
    }
  }
});
```

### Error Toast Messages

```javascript
// Custom hook for error handling
function useErrorHandler() {
  const showToast = useToast();

  const handleError = useCallback((error) => {
    const errorMessages = {
      BOOKING_CONFLICT: 'Time slot unavailable. Please choose another time.',
      INVALID_PHONE_FORMAT: 'Please enter a valid Jordanian phone number.',
      PAYMENT_METHOD_REQUIRED: 'Online payment required for this booking amount.',
      RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait before trying again.',
      NETWORK_ERROR: 'Network error. Please check your connection.',
      DEFAULT: 'An unexpected error occurred. Please try again.'
    };

    const message = errorMessages[error.code] || errorMessages.DEFAULT;
    
    showToast({
      type: 'error',
      message,
      duration: 5000,
      action: error.code === 'BOOKING_CONFLICT' ? {
        label: 'View Times',
        onPress: () => navigateToAvailability()
      } : null
    });
  }, [showToast]);

  return { handleError };
}
```

---

This error reference provides comprehensive guidance for handling all possible error scenarios in the BeautyCort API. Use this reference to implement robust error handling in your applications and provide better user experiences.