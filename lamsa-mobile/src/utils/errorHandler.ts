/**
 * Centralized error handler for the app
 */

export interface AppError {
  message: string;
  code?: string;
  details?: any;
  isNetworkError?: boolean;
  isAuthError?: boolean;
  isValidationError?: boolean;
}

/**
 * Handle Supabase errors
 */
export function handleSupabaseError(error: any): AppError {
  console.error('Supabase error:', error);
  
  // Network errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
    return {
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
      details: error
    };
  }
  
  // Auth errors
  if (error.code?.startsWith('auth/') || error.message?.includes('JWT')) {
    return {
      message: 'Authentication error. Please sign in again.',
      code: error.code || 'AUTH_ERROR',
      isAuthError: true,
      details: error
    };
  }
  
  // Database errors
  if (error.code === 'PGRST116') {
    return {
      message: 'No data found',
      code: error.code,
      details: error
    };
  }
  
  if (error.code === '42P01') {
    return {
      message: 'Database table or view not found',
      code: error.code,
      details: error
    };
  }
  
  // Validation errors
  if (error.code === '23514' || error.code === '23502') {
    return {
      message: 'Validation error. Please check your input.',
      code: error.code,
      isValidationError: true,
      details: error
    };
  }
  
  // Default error
  return {
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'UNKNOWN_ERROR',
    details: error
  };
}

/**
 * Log error to console with context
 */
export function logError(context: string, error: any) {
  console.error(`[${context}]`, error);
  
  // In production, you might want to send this to a logging service
  if (__DEV__) {
    console.error('Error stack:', error.stack);
  }
}

/**
 * Show user-friendly error message
 */
export function getUserErrorMessage(error: AppError): string {
  if (error.isNetworkError) {
    return 'Unable to connect. Please check your internet connection.';
  }
  
  if (error.isAuthError) {
    return 'Please sign in again to continue.';
  }
  
  if (error.isValidationError) {
    return 'Please check your input and try again.';
  }
  
  // Specific error messages
  switch (error.code) {
    case 'PGRST116':
      return 'No data found. Please try again later.';
    case '42P01':
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}