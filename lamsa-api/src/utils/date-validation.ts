/**
 * @file date-validation.ts
 * @description Date parsing and validation utilities
 * @author Lamsa Development Team
 * @date Created: 2025-07-21
 * @copyright Lamsa 2025
 */

import { parseISO, isValid } from 'date-fns';
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';

/**
 * Parse and validate an optional date string
 * @param dateString - The date string to parse (can be undefined)
 * @param fieldName - The field name for error messages
 * @returns Parsed Date object or undefined
 * @throws AppError if date string is invalid
 */
export function parseAndValidateDate(
  dateString: string | undefined,
  fieldName: string = 'date'
): Date | undefined {
  if (!dateString) return undefined;
  
  const parsed = parseISO(dateString);
  if (!isValid(parsed)) {
    throw new BilingualAppError(`Invalid ${fieldName} format`, 400);
  }
  
  return parsed;
}

/**
 * Parse and validate a required date string
 * @param dateString - The date string to parse
 * @param fieldName - The field name for error messages
 * @returns Parsed Date object
 * @throws AppError if date string is invalid or missing
 */
export function parseAndValidateDateRequired(
  dateString: string,
  fieldName: string = 'date'
): Date {
  if (!dateString) {
    throw new BilingualAppError(`${fieldName} is required`, 400);
  }
  
  const parsed = parseISO(dateString);
  if (!isValid(parsed)) {
    throw new BilingualAppError(`Invalid ${fieldName} format`, 400);
  }
  
  return parsed;
}

/**
 * Validate a date range
 * @param startDate - The start date
 * @param endDate - The end date
 * @param startFieldName - Field name for start date errors
 * @param endFieldName - Field name for end date errors
 * @throws AppError if end date is before start date
 */
export function validateDateRange(
  startDate: Date | undefined,
  endDate: Date | undefined,
  startFieldName: string = 'start date',
  endFieldName: string = 'end date'
): void {
  if (startDate && endDate && endDate < startDate) {
    throw new BilingualAppError(`${endFieldName} must be after ${startFieldName}`, 400);
  }
}