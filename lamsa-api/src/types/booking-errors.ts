/**
 * Custom error types for booking operations
 * Provides specific error handling for different booking scenarios
 */

import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';

export class BookingError extends BilingualAppError {
  constructor(message: string, statusCode: number = 400, code: string = 'BOOKING_ERROR') {
    super(code, statusCode, { en: message, ar: message });
    this.name = 'BookingError';
  }
}

export class BookingConflictError extends BookingError {
  constructor(message: string = 'Time slot is already booked') {
    super(message, 409, 'BOOKING_CONFLICT');
    this.name = 'BookingConflictError';
  }
}

export class InvalidTimeSlotError extends BookingError {
  constructor(message: string = 'Invalid time slot selected') {
    super(message, 400, 'INVALID_TIME_SLOT');
    this.name = 'InvalidTimeSlotError';
  }
}

export class ProviderNotAvailableError extends BookingError {
  constructor(message: string = 'Provider is not available at the requested time') {
    super(message, 400, 'PROVIDER_NOT_AVAILABLE');
    this.name = 'ProviderNotAvailableError';
  }
}

export class ServiceNotActiveError extends BookingError {
  constructor(message: string = 'The requested service is not currently active') {
    super(message, 400, 'SERVICE_NOT_ACTIVE');
    this.name = 'ServiceNotActiveError';
  }
}

export class BookingNotFoundError extends BookingError {
  constructor(message: string = 'Booking not found') {
    super(message, 404, 'BOOKING_NOT_FOUND');
    this.name = 'BookingNotFoundError';
  }
}

export class InvalidBookingStatusError extends BookingError {
  constructor(message: string = 'Invalid booking status transition') {
    super(message, 400, 'INVALID_STATUS_TRANSITION');
    this.name = 'InvalidBookingStatusError';
  }
}

export class BookingPastDueError extends BookingError {
  constructor(message: string = 'Cannot modify past bookings') {
    super(message, 400, 'BOOKING_PAST_DUE');
    this.name = 'BookingPastDueError';
  }
}

export class PaymentFailedError extends BookingError {
  constructor(message: string = 'Payment processing failed') {
    super(message, 402, 'PAYMENT_FAILED');
    this.name = 'PaymentFailedError';
  }
}

export class InsufficientPermissionError extends BookingError {
  constructor(message: string = 'Insufficient permissions for this operation') {
    super(message, 403, 'INSUFFICIENT_PERMISSION');
    this.name = 'InsufficientPermissionError';
  }
}

export class BookingCapacityExceededError extends BookingError {
  constructor(message: string = 'Provider capacity exceeded for this time slot') {
    super(message, 400, 'CAPACITY_EXCEEDED');
    this.name = 'BookingCapacityExceededError';
  }
}

export class CancellationNotAllowedError extends BookingError {
  constructor(message: string = 'Cancellation is not allowed for this booking') {
    super(message, 400, 'CANCELLATION_NOT_ALLOWED');
    this.name = 'CancellationNotAllowedError';
  }
}

export class ReschedulingNotAllowedError extends BookingError {
  constructor(message: string = 'Rescheduling is not allowed for this booking') {
    super(message, 400, 'RESCHEDULING_NOT_ALLOWED');
    this.name = 'ReschedulingNotAllowedError';
  }
}

export class InvalidBusinessHoursError extends BookingError {
  constructor(message: string = 'Booking time is outside business hours') {
    super(message, 400, 'INVALID_BUSINESS_HOURS');
    this.name = 'InvalidBusinessHoursError';
  }
}

export class MinimumNoticeError extends BookingError {
  constructor(message: string = 'Booking requires minimum advance notice') {
    super(message, 400, 'MINIMUM_NOTICE_REQUIRED');
    this.name = 'MinimumNoticeError';
  }
}

export class MaximumAdvanceError extends BookingError {
  constructor(message: string = 'Booking is too far in advance') {
    super(message, 400, 'MAXIMUM_ADVANCE_EXCEEDED');
    this.name = 'MaximumAdvanceError';
  }
}

/**
 * Booking status transition validation
 */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [], // Final state
  cancelled: [], // Final state
  no_show: [] // Final state
};

/**
 * Helper function to validate status transitions
 */
export function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions ? allowedTransitions.includes(newStatus) : false;
}

/**
 * Helper function to check if a status is final (no further transitions allowed)
 */
export function isFinalStatus(status: string): boolean {
  return ['completed', 'cancelled', 'no_show'].includes(status);
}

/**
 * Helper function to get allowed transitions for a status
 */
export function getAllowedTransitions(currentStatus: string): string[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Error factory for creating appropriate booking errors
 */
export class BookingErrorFactory {
  static createConflictError(providerId: string, date: string, time: string): BookingConflictError {
    return new BookingConflictError(
      `Time slot ${time} on ${date} is already booked for provider ${providerId}`
    );
  }

  static createInvalidTimeSlotError(reason: string): InvalidTimeSlotError {
    return new InvalidTimeSlotError(`Invalid time slot: ${reason}`);
  }

  static createProviderNotAvailableError(providerId: string, date: string, time: string): ProviderNotAvailableError {
    return new ProviderNotAvailableError(
      `Provider ${providerId} is not available on ${date} at ${time}`
    );
  }

  static createInvalidStatusTransitionError(currentStatus: string, newStatus: string): InvalidBookingStatusError {
    const allowedTransitions = getAllowedTransitions(currentStatus).join(', ');
    return new InvalidBookingStatusError(
      `Cannot change status from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions}`
    );
  }

  static createPastDueError(operation: string): BookingPastDueError {
    return new BookingPastDueError(`Cannot ${operation} a booking that has already passed`);
  }

  static createPermissionError(operation: string, userRole: string): InsufficientPermissionError {
    return new InsufficientPermissionError(
      `User with role '${userRole}' does not have permission to ${operation}`
    );
  }
}