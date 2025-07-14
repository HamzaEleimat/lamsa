// Main services exports
export { apiClient } from './api/client';
export { authService } from './auth/authService';
export { tokenManager } from './auth/tokenManager';

// Core exports
export { HTTPClient } from './core/httpClient';
export { ErrorHandler } from './core/errorHandler';
export { OfflineQueue } from './core/offlineQueue';

// Interceptors
export {
  authRequestInterceptor,
  commonHeadersInterceptor,
  authResponseInterceptor,
  performanceInterceptor,
  errorLoggingInterceptor,
  defaultRequestInterceptors,
  defaultResponseInterceptors,
} from './core/interceptors';

// Types
export type {
  APIResponse,
  APIError,
  ErrorCategory,
  RequestConfig,
  TokenInfo,
  NetworkState,
  PaginationParams,
  SearchParams,
  LocationParams,
} from './core/types';

// Auth types
export type {
  AuthCredentials,
  AuthResult,
} from './auth/authService';

// Provider Onboarding
export { ProviderOnboardingService } from './ProviderOnboardingService';
