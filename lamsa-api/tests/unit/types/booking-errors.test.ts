/**
 * Unit tests for Booking Error Types and State Machine
 * Critical for booking flow integrity
 */

import {
  BookingError,
  BookingConflictError,
  InvalidTimeSlotError,
  ProviderNotAvailableError,
  ServiceNotActiveError,
  BookingNotFoundError,
  InvalidBookingStatusError,
  BookingPastDueError,
  PaymentFailedError,
  InsufficientPermissionError,
  validateStatusTransition,
  isFinalStatus,
  getAllowedTransitions,
  VALID_STATUS_TRANSITIONS
} from '../../../src/types/booking-errors';

describe('Booking Error Types', () => {
  describe('BookingError base class', () => {
    it('should create error with default status code', () => {
      const error = new BookingError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('BookingError');
    });

    it('should create error with custom status code and code', () => {
      const error = new BookingError('Test error', 500, 'CUSTOM_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CUSTOM_CODE');
    });
  });

  describe('Specific error types', () => {
    it('BookingConflictError should have correct properties', () => {
      const error = new BookingConflictError();
      expect(error.message).toBe('Time slot is already booked');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('BOOKING_CONFLICT');
      expect(error.name).toBe('BookingConflictError');
    });

    it('InvalidTimeSlotError should have correct properties', () => {
      const error = new InvalidTimeSlotError();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INVALID_TIME_SLOT');
    });

    it('ProviderNotAvailableError should have correct properties', () => {
      const error = new ProviderNotAvailableError();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('PROVIDER_NOT_AVAILABLE');
    });

    it('ServiceNotActiveError should have correct properties', () => {
      const error = new ServiceNotActiveError();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('SERVICE_NOT_ACTIVE');
    });

    it('BookingNotFoundError should have correct properties', () => {
      const error = new BookingNotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('BOOKING_NOT_FOUND');
    });

    it('InvalidBookingStatusError should have correct properties', () => {
      const error = new InvalidBookingStatusError();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('BookingPastDueError should have correct properties', () => {
      const error = new BookingPastDueError();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BOOKING_PAST_DUE');
    });

    it('PaymentFailedError should have correct properties', () => {
      const error = new PaymentFailedError();
      expect(error.statusCode).toBe(402); // Payment Required
      expect(error.code).toBe('PAYMENT_FAILED');
    });

    it('InsufficientPermissionError should have correct properties', () => {
      const error = new InsufficientPermissionError();
      expect(error.statusCode).toBe(403); // Forbidden
      expect(error.code).toBe('INSUFFICIENT_PERMISSION');
    });

    it('should allow custom messages for specific errors', () => {
      const error = new BookingConflictError('Custom conflict message');
      expect(error.message).toBe('Custom conflict message');
    });
  });
});

describe('Booking Status State Machine', () => {
  describe('validateStatusTransition', () => {
    it('should allow valid transitions from pending', () => {
      expect(validateStatusTransition('pending', 'confirmed')).toBe(true);
      expect(validateStatusTransition('pending', 'cancelled')).toBe(true);
    });

    it('should allow valid transitions from confirmed', () => {
      expect(validateStatusTransition('confirmed', 'completed')).toBe(true);
      expect(validateStatusTransition('confirmed', 'cancelled')).toBe(true);
      expect(validateStatusTransition('confirmed', 'no_show')).toBe(true);
    });

    it('should not allow transitions from final states', () => {
      expect(validateStatusTransition('completed', 'cancelled')).toBe(false);
      expect(validateStatusTransition('cancelled', 'completed')).toBe(false);
      expect(validateStatusTransition('no_show', 'confirmed')).toBe(false);
    });

    it('should not allow invalid transitions', () => {
      expect(validateStatusTransition('pending', 'completed')).toBe(false);
      expect(validateStatusTransition('pending', 'no_show')).toBe(false);
      expect(validateStatusTransition('confirmed', 'pending')).toBe(false);
    });

    it('should handle unknown statuses', () => {
      expect(validateStatusTransition('unknown', 'confirmed')).toBe(false);
      expect(validateStatusTransition('pending', 'unknown')).toBe(false);
    });
  });

  describe('isFinalStatus', () => {
    it('should identify final statuses', () => {
      expect(isFinalStatus('completed')).toBe(true);
      expect(isFinalStatus('cancelled')).toBe(true);
      expect(isFinalStatus('no_show')).toBe(true);
    });

    it('should identify non-final statuses', () => {
      expect(isFinalStatus('pending')).toBe(false);
      expect(isFinalStatus('confirmed')).toBe(false);
    });

    it('should handle unknown statuses', () => {
      expect(isFinalStatus('unknown')).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions for pending', () => {
      const transitions = getAllowedTransitions('pending');
      expect(transitions).toEqual(['confirmed', 'cancelled']);
    });

    it('should return allowed transitions for confirmed', () => {
      const transitions = getAllowedTransitions('confirmed');
      expect(transitions).toEqual(['completed', 'cancelled', 'no_show']);
    });

    it('should return empty array for final states', () => {
      expect(getAllowedTransitions('completed')).toEqual([]);
      expect(getAllowedTransitions('cancelled')).toEqual([]);
      expect(getAllowedTransitions('no_show')).toEqual([]);
    });

    it('should return empty array for unknown status', () => {
      expect(getAllowedTransitions('unknown')).toEqual([]);
    });
  });

  describe('VALID_STATUS_TRANSITIONS constant', () => {
    it('should have all required statuses', () => {
      const statuses = Object.keys(VALID_STATUS_TRANSITIONS);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('confirmed');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('cancelled');
      expect(statuses).toContain('no_show');
    });

    it('should have correct transition rules', () => {
      expect(VALID_STATUS_TRANSITIONS.pending).toEqual(['confirmed', 'cancelled']);
      expect(VALID_STATUS_TRANSITIONS.confirmed).toEqual(['completed', 'cancelled', 'no_show']);
      expect(VALID_STATUS_TRANSITIONS.completed).toEqual([]);
      expect(VALID_STATUS_TRANSITIONS.cancelled).toEqual([]);
      expect(VALID_STATUS_TRANSITIONS.no_show).toEqual([]);
    });
  });

  describe('Business rule validation', () => {
    it('should not allow skipping confirmation step', () => {
      // Cannot go directly from pending to completed
      expect(validateStatusTransition('pending', 'completed')).toBe(false);
    });

    it('should not allow resurrection of completed bookings', () => {
      // Cannot change a completed booking back to any status
      expect(validateStatusTransition('completed', 'pending')).toBe(false);
      expect(validateStatusTransition('completed', 'confirmed')).toBe(false);
      expect(validateStatusTransition('completed', 'cancelled')).toBe(false);
    });

    it('should handle cancellation at appropriate stages', () => {
      // Can cancel from pending or confirmed
      expect(validateStatusTransition('pending', 'cancelled')).toBe(true);
      expect(validateStatusTransition('confirmed', 'cancelled')).toBe(true);
      
      // Cannot cancel from final states
      expect(validateStatusTransition('completed', 'cancelled')).toBe(false);
      expect(validateStatusTransition('no_show', 'cancelled')).toBe(false);
    });
  });
});