/**
 * Response Optimization Middleware
 * Implements compression, field selection, and mobile-friendly optimizations
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { ApiResponse } from '../types';

interface FieldSelectionQuery {
  fields?: string;
  include?: string;
  exclude?: string;
  mobile?: 'true' | 'false';
}

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
}

/**
 * Dynamic field selection middleware
 * Allows clients to specify which fields they want in responses
 */
export function fieldSelectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    const optimizedData = optimizeResponsePayload(data, req.query as FieldSelectionQuery);
    return originalJson.call(this, optimizedData);
  };
  
  next();
}

/**
 * Response compression middleware with smart configuration
 */
export function smartCompressionMiddleware() {
  return compression({
    // Only compress responses larger than 1KB
    threshold: 1024,
    
    // Compression level (1-9, 6 is default)
    level: 6,
    
    // Custom filter for what to compress
    filter: (req: Request, res: Response) => {
      // Don't compress if client doesn't support it
      if (!req.headers['accept-encoding']) {
        return false;
      }
      
      // Don't compress images, videos, or already compressed content
      const contentType = res.getHeader('content-type') as string;
      if (contentType) {
        const skipTypes = [
          'image/',
          'video/',
          'audio/',
          'application/zip',
          'application/gzip',
          'application/x-rar'
        ];
        
        if (skipTypes.some(type => contentType.includes(type))) {
          return false;
        }
      }
      
      // Use default compression filter for everything else
      return compression.filter(req, res);
    }
  });
}

/**
 * Mobile optimization middleware
 * Automatically optimizes responses for mobile devices
 */
export function mobileOptimizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isMobile = detectMobileDevice(req);
  const isSlow3G = detectSlowConnection(req);
  
  // Add mobile context to request
  (req as any).deviceContext = {
    isMobile,
    isSlow3G,
    connectionType: getConnectionType(req)
  };
  
  const originalJson = res.json;
  
  res.json = function(data: any) {
    if (isMobile || isSlow3G) {
      const optimizedData = optimizeForMobile(data, { isMobile, isSlow3G });
      return originalJson.call(this, optimizedData);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Response size monitoring middleware
 */
export function responseSizeMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  let originalSize = 0;
  let compressedSize = 0;
  
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override send method to capture size
  res.send = function(data: any) {
    originalSize = Buffer.byteLength(data, 'utf8');
    compressedSize = res.getHeader('content-length') as number || originalSize;
    
    logResponseStats(req, {
      originalSize,
      compressedSize,
      compressionRatio: originalSize > 0 ? (compressedSize / originalSize) : 1,
      compressionTime: Date.now() - startTime
    });
    
    return originalSend.call(this, data);
  };
  
  res.json = function(data: any) {
    const jsonString = JSON.stringify(data);
    originalSize = Buffer.byteLength(jsonString, 'utf8');
    compressedSize = res.getHeader('content-length') as number || originalSize;
    
    logResponseStats(req, {
      originalSize,
      compressedSize,
      compressionRatio: originalSize > 0 ? (compressedSize / originalSize) : 1,
      compressionTime: Date.now() - startTime
    });
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Cache-friendly response headers middleware
 */
export function cacheHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Set cache headers based on endpoint type
  const path = req.path;
  
  if (path.includes('/providers') && req.method === 'GET') {
    // Provider data - cache for 5 minutes
    res.set({
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'ETag': generateETag(req.originalUrl)
    });
  } else if (path.includes('/services') && req.method === 'GET') {
    // Service data - cache for 15 minutes
    res.set({
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800',
      'ETag': generateETag(req.originalUrl)
    });
  } else if (path.includes('/categories') && req.method === 'GET') {
    // Categories - cache for 1 hour
    res.set({
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      'ETag': generateETag(req.originalUrl)
    });
  } else if (path.includes('/availability')) {
    // Availability - short cache, frequently changing
    res.set({
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
    });
  } else {
    // Default - no cache for dynamic data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
  }
  
  next();
}

/**
 * Optimize response payload based on query parameters
 */
function optimizeResponsePayload(data: any, query: FieldSelectionQuery): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Handle API response wrapper
  if (data.success !== undefined && data.data !== undefined) {
    return {
      ...data,
      data: optimizeDataPayload(data.data, query)
    };
  }
  
  return optimizeDataPayload(data, query);
}

/**
 * Optimize data payload based on field selection
 */
function optimizeDataPayload(data: any, query: FieldSelectionQuery): any {
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => optimizeDataPayload(item, query));
  }
  
  // Handle paginated responses
  if (data.data && Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map((item: any) => optimizeDataPayload(item, query))
    };
  }
  
  // Apply field selection
  let optimizedItem = { ...data };
  
  // Include specific fields
  if (query.fields) {
    optimizedItem = selectFields(optimizedItem, query.fields.split(','));
  }
  
  // Include additional fields
  if (query.include) {
    const includeFields = query.include.split(',');
    includeFields.forEach(field => {
      if (data[field] !== undefined) {
        optimizedItem[field] = data[field];
      }
    });
  }
  
  // Exclude specific fields
  if (query.exclude) {
    const excludeFields = query.exclude.split(',');
    excludeFields.forEach(field => {
      delete optimizedItem[field];
    });
  }
  
  // Mobile-specific optimizations
  if (query.mobile === 'true') {
    optimizedItem = optimizeForMobileDevice(optimizedItem);
  }
  
  return optimizedItem;
}

/**
 * Select only specified fields from object
 */
function selectFields(obj: any, fields: string[]): any {
  const result: any = {};
  
  fields.forEach(field => {
    const fieldPath = field.trim();
    
    // Handle nested fields (e.g., "user.name")
    if (fieldPath.includes('.')) {
      const [parentField, ...childPath] = fieldPath.split('.');
      if (obj[parentField] && !result[parentField]) {
        result[parentField] = {};
      }
      setNestedField(result, fieldPath, getNestedField(obj, fieldPath));
    } else {
      if (obj[fieldPath] !== undefined) {
        result[fieldPath] = obj[fieldPath];
      }
    }
  });
  
  return result;
}

/**
 * Get nested field value
 */
function getNestedField(obj: any, path: string): any {
  return path.split('.').reduce((current, field) => {
    return current && current[field] !== undefined ? current[field] : undefined;
  }, obj);
}

/**
 * Set nested field value
 */
function setNestedField(obj: any, path: string, value: any): void {
  const fields = path.split('.');
  const lastField = fields.pop()!;
  
  const target = fields.reduce((current, field) => {
    if (!current[field]) current[field] = {};
    return current[field];
  }, obj);
  
  target[lastField] = value;
}

/**
 * Optimize for mobile devices
 */
function optimizeForMobile(data: any, context: { isMobile: boolean; isSlow3G: boolean }): any {
  if (!data || typeof data !== 'object') return data;
  
  // Handle API response wrapper
  if (data.success !== undefined && data.data !== undefined) {
    return {
      ...data,
      data: optimizeDataForMobile(data.data, context)
    };
  }
  
  return optimizeDataForMobile(data, context);
}

/**
 * Optimize data specifically for mobile devices
 */
function optimizeDataForMobile(data: any, context: { isMobile: boolean; isSlow3G: boolean }): any {
  if (Array.isArray(data)) {
    return data.map(item => optimizeForMobileDevice(item, context.isSlow3G));
  }
  
  if (data.data && Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map((item: any) => optimizeForMobileDevice(item, context.isSlow3G))
    };
  }
  
  return optimizeForMobileDevice(data, context.isSlow3G);
}

/**
 * Optimize individual item for mobile
 */
function optimizeForMobileDevice(item: any, isSlow3G: boolean = false): any {
  if (!item || typeof item !== 'object') return item;
  
  const optimized = { ...item };
  
  // Remove large/unnecessary fields for mobile
  const mobileExcludeFields = [
    'created_at',
    'updated_at',
    'deleted_at',
    'metadata',
    'raw_data',
    'debug_info'
  ];
  
  // Additional fields to exclude on slow connections
  if (isSlow3G) {
    mobileExcludeFields.push(
      'description_ar',
      'description_en',
      'full_address',
      'detailed_stats',
      'extended_info'
    );
  }
  
  mobileExcludeFields.forEach(field => {
    delete optimized[field];
  });
  
  // Truncate long text fields for mobile
  if (optimized.description_ar && optimized.description_ar.length > 100) {
    optimized.description_ar = optimized.description_ar.substring(0, 100) + '...';
  }
  
  if (optimized.description_en && optimized.description_en.length > 100) {
    optimized.description_en = optimized.description_en.substring(0, 100) + '...';
  }
  
  // Optimize nested objects
  Object.keys(optimized).forEach(key => {
    if (Array.isArray(optimized[key])) {
      // Limit array sizes for mobile
      const maxItems = isSlow3G ? 5 : 10;
      if (optimized[key].length > maxItems) {
        optimized[key] = optimized[key].slice(0, maxItems);
        optimized[`${key}_truncated`] = true;
        optimized[`${key}_total`] = item[key].length;
      }
    } else if (optimized[key] && typeof optimized[key] === 'object') {
      optimized[key] = optimizeForMobileDevice(optimized[key], isSlow3G);
    }
  });
  
  return optimized;
}

/**
 * Detect mobile device from request headers
 */
function detectMobileDevice(req: Request): boolean {
  const userAgent = req.headers['user-agent'] || '';
  const mobileKeywords = [
    'Mobile', 'Android', 'iPhone', 'iPad', 'iPod',
    'BlackBerry', 'Windows Phone', 'webOS'
  ];
  
  return mobileKeywords.some(keyword => 
    userAgent.includes(keyword)
  );
}

/**
 * Detect slow connection from request headers
 */
function detectSlowConnection(req: Request): boolean {
  const connection = req.headers['connection-type'] || 
                    req.headers['downlink'] || 
                    req.headers['ect']; // Effective Connection Type
  
  if (typeof connection === 'string') {
    const slowConnections = ['2g', '3g', 'slow-2g'];
    return slowConnections.some(type => connection.toLowerCase().includes(type));
  }
  
  // Check for Save-Data header (data saver mode)
  return req.headers['save-data'] === 'on';
}

/**
 * Get connection type from headers
 */
function getConnectionType(req: Request): string {
  return (req.headers['ect'] as string) || 
         (req.headers['connection-type'] as string) || 
         'unknown';
}

/**
 * Generate ETag for caching
 */
function generateETag(content: string): string {
  const hash = require('crypto')
    .createHash('md5')
    .update(content)
    .digest('hex');
  
  return `"${hash}"`;
}

/**
 * Log response statistics
 */
function logResponseStats(req: Request, stats: CompressionStats): void {
  if (stats.originalSize > 10000) { // Only log responses larger than 10KB
    const compressionPercent = ((1 - stats.compressionRatio) * 100).toFixed(1);
    const deviceContext = (req as any).deviceContext;
    
    console.log(`📊 Response Stats: ${req.method} ${req.path}`, {
      originalSize: `${(stats.originalSize / 1024).toFixed(2)}KB`,
      compressedSize: `${(stats.compressedSize / 1024).toFixed(2)}KB`,
      compression: `${compressionPercent}% reduction`,
      time: `${stats.compressionTime}ms`,
      mobile: deviceContext?.isMobile,
      connection: deviceContext?.connectionType
    });
  }
}

/**
 * Response optimization summary middleware
 */
export function responseOptimizationSummary(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  const originalJson = res.json;
  res.json = function(data: any) {
    const processingTime = Date.now() - startTime;
    const deviceContext = (req as any).deviceContext;
    
    // Add optimization metadata to response
    if (data && typeof data === 'object' && data.meta !== undefined) {
      data.meta = {
        ...data.meta,
        optimization: {
          mobile: deviceContext?.isMobile || false,
          slow3g: deviceContext?.isSlow3G || false,
          connection: deviceContext?.connectionType || 'unknown',
          processingTime: `${processingTime}ms`
        }
      };
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}