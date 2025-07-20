// Core API types and interfaces
export interface APIResponse<T = any> {
  data: T | null;
  error: APIError | null;
  success: boolean;
  metadata?: {
    pagination?: PaginationInfo;
    performance?: PerformanceMetrics;
    cached?: boolean;
    timestamp?: number;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  category: ErrorCategory;
  userMessage: {
    en: string;
    ar: string;
  };
}

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  OFFLINE = 'OFFLINE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export interface PaginationInfo {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PerformanceMetrics {
  requestTime: number;
  responseTime: number;
  duration: number;
  retryCount?: number;
  cacheHit?: boolean;
}

export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
  timeout?: number;
  retries?: number;
  requiresAuth?: boolean;
  cacheable?: boolean;
  cacheTime?: number;
  priority?: RequestPriority;
  skipQueue?: boolean;
}

export enum RequestPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface QueuedRequest {
  id: string;
  config: RequestConfig;
  timestamp: number;
  priority: RequestPriority;
  retryCount: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  type: 'Bearer' | 'JWT';
}

export interface NetworkState {
  isConnected: boolean;
  connectionType?: string;
  isInternetReachable?: boolean;
}

// Service-specific types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, any>;
}

export interface LocationParams {
  latitude: number;
  longitude: number;
  radius?: number; // in kilometers
}

// HTTP method types
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Request interceptor type
export type RequestInterceptor = (config: RequestConfig) => Promise<RequestConfig>;

// Response interceptor type
export type ResponseInterceptor = (response: APIResponse) => Promise<APIResponse>;

// Error handler type
export type ErrorHandler = (error: any, config: RequestConfig) => APIError;
