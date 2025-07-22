/**
 * Error handling utilities for TypeScript
 * 
 * In TypeScript, catch block errors are of type 'unknown' by default.
 * These utilities help handle errors in a type-safe manner.
 */

/**
 * Type guard to check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Get error message from unknown error type
 * Falls back to string conversion if not an Error instance
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle other types by converting to string
  return String(error);
}

/**
 * Get error stack trace if available
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  return undefined;
}

/**
 * Safe error handler that ensures proper error type handling
 */
export function handleError(error: unknown): { message: string; stack?: string } {
  return {
    message: getErrorMessage(error),
    stack: getErrorStack(error)
  };
}