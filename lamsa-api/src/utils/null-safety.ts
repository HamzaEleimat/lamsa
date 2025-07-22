/**
 * @file null-safety.ts
 * @description Utility functions for safe null/undefined handling
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { AppError } from '../middleware/error.middleware';

/**
 * Assert that a value is not null or undefined
 * Throws an appropriate error if the assertion fails
 */
export function assertDefined<T>(
  value: T | null | undefined,
  errorMessage: string,
  statusCode: number = 500
): asserts value is T {
  if (value === null || value === undefined) {
    throw new AppError(errorMessage, statusCode);
  }
}

/**
 * Assert that req.user exists (for authenticated routes)
 */
export function assertAuthenticated<T extends { user?: any }>(
  req: T,
  errorMessage: string = 'User not authenticated'
): asserts req is T & { user: NonNullable<T['user']> } {
  if (!req.user) {
    throw new AppError(errorMessage, 401);
  }
}

/**
 * Safe property access with default value
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] {
  return obj?.[key] ?? defaultValue;
}

/**
 * Safe array access with bounds checking
 */
export function safeArrayAccess<T>(
  arr: T[] | null | undefined,
  index: number,
  defaultValue: T | null = null
): T | null {
  if (!arr || index < 0 || index >= arr.length) {
    return defaultValue;
  }
  return arr[index];
}

/**
 * Type guard for checking if a value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for checking if all properties in an object are defined
 */
export function hasDefinedProperties<T extends Record<string, any>>(
  obj: T,
  ...keys: (keyof T)[]
): boolean {
  return keys.every(key => isDefined(obj[key]));
}

/**
 * Safe chain property access
 * Example: safeChain(user, u => u.profile.settings.notifications)
 */
export function safeChain<T, R>(
  obj: T | null | undefined,
  accessor: (obj: T) => R,
  defaultValue: R | null = null
): R | null {
  try {
    return obj ? accessor(obj) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Ensure a value exists or throw with custom error
 */
export function ensureExists<T>(
  value: T | null | undefined,
  entityName: string,
  identifier?: string | number
): T {
  if (!isDefined(value)) {
    const id = identifier ? ` with ID ${identifier}` : '';
    throw new AppError(`${entityName}${id} not found`, 404);
  }
  return value;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T = any>(
  json: string | null | undefined,
  defaultValue: T | null = null
): T | null {
  if (!json) return defaultValue;
  
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Assert environment variable exists
 */
export function assertEnvVar(
  varName: string,
  value: string | undefined
): asserts value is string {
  if (!value) {
    throw new Error(`Required environment variable ${varName} is not set`);
  }
}

/**
 * Create a required field validator for request bodies
 */
export function createRequiredFieldsValidator<T extends Record<string, any>>(
  requiredFields: (keyof T)[]
) {
  return (body: Partial<T>): asserts body is T => {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!isDefined(body[field])) {
        missingFields.push(String(field));
      }
    }
    
    if (missingFields.length > 0) {
      throw new AppError(
        `Missing required fields: ${missingFields.join(', ')}`,
        400
      );
    }
  };
}

/**
 * Safely access nested object properties with dot notation
 * Example: safePath(user, 'profile.settings.theme', 'light')
 */
export function safePath<T = any>(
  obj: any,
  path: string,
  defaultValue: T | null = null
): T | null {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (!isDefined(current) || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return isDefined(current) ? current : defaultValue;
}