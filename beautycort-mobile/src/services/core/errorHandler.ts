import { APIError, ErrorCategory, RequestConfig } from './types';

/**
 * Centralized error handling and transformation
 */
export class ErrorHandler {
  private errorMessages = {
    en: {
      [ErrorCategory.NETWORK]: 'Please check your internet connection and try again.',
      [ErrorCategory.AUTHENTICATION]: 'Please log in again to continue.',
      [ErrorCategory.AUTHORIZATION]: 'You do not have permission to perform this action.',
      [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ErrorCategory.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorCategory.SERVER_ERROR]: 'Something went wrong on our end. Please try again later.',
      [ErrorCategory.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
      [ErrorCategory.OFFLINE]: 'You appear to be offline. This request will be sent when connection is restored.',
      [ErrorCategory.TIMEOUT]: 'Request timed out. Please try again.',
      [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.',
    },
    ar: {
      [ErrorCategory.NETWORK]: 'يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
      [ErrorCategory.AUTHENTICATION]: 'يرجى تسجيل الدخول مرة أخرى للمتابعة.',
      [ErrorCategory.AUTHORIZATION]: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
      [ErrorCategory.VALIDATION]: 'يرجى التحقق من المدخلات والمحاولة مرة أخرى.',
      [ErrorCategory.NOT_FOUND]: 'المورد المطلوب غير موجود.',
      [ErrorCategory.SERVER_ERROR]: 'حدث خطأ من جانبنا. يرجى المحاولة مرة أخرى لاحقاً.',
      [ErrorCategory.RATE_LIMITED]: 'طلبات كثيرة جداً. يرجى الانتظار قليلاً والمحاولة مرة أخرى.',
      [ErrorCategory.OFFLINE]: 'يبدو أنك غير متصل بالإنترنت. سيتم إرسال هذا الطلب عند استعادة الاتصال.',
      [ErrorCategory.TIMEOUT]: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
      [ErrorCategory.UNKNOWN]: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
    },
  };

  /**
   * Handle and transform errors into consistent APIError format
   */
  handleError(error: any, config: RequestConfig, responseData?: any): APIError {
    const category = this.categorizeError(error, responseData);
    const code = this.generateErrorCode(error, category);
    const message = this.extractErrorMessage(error, responseData);
    const details = this.extractErrorDetails(error, responseData);
    const field = this.extractErrorField(responseData);

    return {
      code,
      message,
      details,
      field,
      category,
      userMessage: {
        en: this.getUserMessage(category, 'en', responseData),
        ar: this.getUserMessage(category, 'ar', responseData),
      },
    };
  }

  /**
   * Categorize error based on error type and response
   */
  private categorizeError(error: any, responseData?: any): ErrorCategory {
    // Network-related errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return ErrorCategory.TIMEOUT;
    }

    // HTTP status code based categorization
    if (error.message?.includes('HTTP')) {
      const statusMatch = error.message.match(/HTTP (\d+):/);
      if (statusMatch) {
        const status = parseInt(statusMatch[1]);
        
        if (status === 401) {
          return ErrorCategory.AUTHENTICATION;
        }
        if (status === 403) {
          return ErrorCategory.AUTHORIZATION;
        }
        if (status === 404) {
          return ErrorCategory.NOT_FOUND;
        }
        if (status === 422 || status === 400) {
          return ErrorCategory.VALIDATION;
        }
        if (status === 429) {
          return ErrorCategory.RATE_LIMITED;
        }
        if (status >= 500) {
          return ErrorCategory.SERVER_ERROR;
        }
      }
    }

    // Supabase specific errors
    if (error.message?.includes('JWT') || error.message?.includes('token')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Validation errors from response data
    if (responseData?.error && responseData.error.includes('validation')) {
      return ErrorCategory.VALIDATION;
    }

    // Network connectivity
    if (error.message?.includes('network') || error.message?.includes('offline')) {
      return ErrorCategory.NETWORK;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Generate error code
   */
  private generateErrorCode(error: any, category: ErrorCategory): string {
    const timestamp = Date.now().toString().slice(-6);
    
    // Extract HTTP status if available
    const statusMatch = error.message?.match(/HTTP (\d+):/);
    if (statusMatch) {
      return `${category}_${statusMatch[1]}_${timestamp}`;
    }

    // Use error name if available
    if (error.name) {
      return `${category}_${error.name}_${timestamp}`;
    }

    return `${category}_${timestamp}`;
  }

  /**
   * Extract technical error message
   */
  private extractErrorMessage(error: any, responseData?: any): string {
    // Try to get message from response data first
    if (responseData?.error) {
      return typeof responseData.error === 'string' 
        ? responseData.error 
        : responseData.error.message || JSON.stringify(responseData.error);
    }

    if (responseData?.message) {
      return responseData.message;
    }

    // Fallback to error object message
    return error.message || error.toString() || 'Unknown error occurred';
  }

  /**
   * Extract error details
   */
  private extractErrorDetails(error: any, responseData?: any): any {
    if (responseData?.details) {
      return responseData.details;
    }

    if (responseData?.errors) {
      return responseData.errors;
    }

    // Include stack trace in development
    if (__DEV__ && error.stack) {
      return { stack: error.stack };
    }

    return null;
  }

  /**
   * Extract field name for validation errors
   */
  private extractErrorField(responseData?: any): string | undefined {
    if (responseData?.field) {
      return responseData.field;
    }

    if (responseData?.errors && Array.isArray(responseData.errors)) {
      const firstError = responseData.errors[0];
      return firstError?.field || firstError?.path;
    }

    return undefined;
  }

  /**
   * Get user-friendly error message
   */
  private getUserMessage(category: ErrorCategory, language: 'en' | 'ar', responseData?: any): string {
    // Check if response data contains specific user message
    if (responseData?.userMessage?.[language]) {
      return responseData.userMessage[language];
    }

    // For validation errors, try to get field-specific message
    if (category === ErrorCategory.VALIDATION && responseData?.errors) {
      const fieldError = responseData.errors.find((err: any) => err.userMessage?.[language]);
      if (fieldError) {
        return fieldError.userMessage[language];
      }
    }

    // Fallback to default message
    return this.errorMessages[language][category];
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: APIError): boolean {
    const retryableCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.SERVER_ERROR,
    ];

    return retryableCategories.includes(error.category);
  }

  /**
   * Check if error requires authentication
   */
  requiresAuthentication(error: APIError): boolean {
    return error.category === ErrorCategory.AUTHENTICATION;
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(error: APIError): boolean {
    return error.category === ErrorCategory.VALIDATION;
  }

  /**
   * Add custom error message for specific category and language
   */
  addErrorMessage(category: ErrorCategory, language: 'en' | 'ar', message: string): void {
    this.errorMessages[language][category] = message;
  }
}
