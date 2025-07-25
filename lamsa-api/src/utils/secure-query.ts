/**
 * @file secure-query.ts
 * @description Secure database query utilities to prevent SQL injection
 * @author Lamsa Development Team
 * @date Created: 2025-07-23
 * @copyright Lamsa 2025
 */

import { supabase } from '../config/supabase-simple';
import { secureLogger } from './secure-logger';

/**
 * Validates and sanitizes query parameters to prevent SQL injection
 */
export class SecureQueryBuilder {
  /**
   * Validates that a value is safe for use in queries
   * @param value - The value to validate
   * @param paramName - Parameter name for error messages
   * @returns The validated value
   * @throws Error if value is unsafe
   */
  static validateParam(value: any, paramName: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      /(--|\||;|\/\*|\*\/|xp_|sp_)/i,
      /(\bor\b|\band\b)\s*\d+\s*=\s*\d+/i,
      /['"];\s*(drop|delete|update|insert)/i,
    ];

    const stringValue = String(value);
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(stringValue)) {
        secureLogger.warn('Potential SQL injection attempt detected', {
          paramName,
          value: stringValue.substring(0, 100), // Log only first 100 chars
          pattern: pattern.toString(),
        });
        throw new Error(`Invalid characters in parameter: ${paramName}`);
      }
    }

    return value;
  }

  /**
   * Validates an array of values
   */
  static validateArray(values: any[], paramName: string): any[] {
    if (!Array.isArray(values)) {
      throw new Error(`Parameter ${paramName} must be an array`);
    }

    return values.map((value, index) => 
      this.validateParam(value, `${paramName}[${index}]`)
    );
  }

  /**
   * Validates object fields
   */
  static validateObject(obj: Record<string, any>, allowedFields: string[]): Record<string, any> {
    const validated: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (!allowedFields.includes(key)) {
        throw new Error(`Field '${key}' is not allowed`);
      }
      validated[key] = this.validateParam(value, key);
    }
    
    return validated;
  }

  /**
   * Validates and sanitizes order by clauses
   */
  static validateOrderBy(column: string, allowedColumns: string[]): string {
    if (!allowedColumns.includes(column)) {
      throw new Error(`Invalid order by column: ${column}`);
    }
    return column;
  }

  /**
   * Validates limit and offset for pagination
   */
  static validatePagination(limit?: number, offset?: number): { limit: number; offset: number } {
    const validatedLimit = Math.min(Math.max(1, limit || 20), 100); // Max 100 records
    const validatedOffset = Math.max(0, offset || 0);
    
    return { limit: validatedLimit, offset: validatedOffset };
  }

  /**
   * Creates a safe IN clause for queries
   */
  static createInClause(values: any[], paramName: string): string {
    const validated = this.validateArray(values, paramName);
    if (validated.length === 0) {
      throw new Error(`${paramName} array cannot be empty`);
    }
    
    // Supabase handles parameterization internally
    return validated.join(',');
  }

  /**
   * Validates date parameters
   */
  static validateDate(date: string | Date, paramName: string): string {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      throw new Error(`${paramName} must be a valid date`);
    }
    
    if (isNaN(dateObj.getTime())) {
      throw new Error(`${paramName} is not a valid date`);
    }
    
    return dateObj.toISOString();
  }

  /**
   * Validates UUID format
   */
  static validateUUID(uuid: string, paramName: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      throw new Error(`${paramName} must be a valid UUID`);
    }
    
    return uuid.toLowerCase();
  }

  /**
   * Validates phone number format (Jordan specific)
   */
  static validatePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    
    // Jordan phone validation
    if (!cleaned.match(/^962(77|78|79)\d{7}$/)) {
      throw new Error('Invalid phone number format');
    }
    
    return '+' + cleaned;
  }

  /**
   * Escapes special characters for LIKE queries
   */
  static escapeLikePattern(pattern: string): string {
    return pattern
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  /**
   * Creates a safe text search query
   */
  static createTextSearchQuery(searchTerm: string, columns: string[]): string {
    const validated = this.validateParam(searchTerm, 'searchTerm');
    const escaped = this.escapeLikePattern(validated);
    
    // Validate columns
    const allowedColumns = ['name', 'description', 'bio', 'address', 'business_name'];
    columns.forEach(col => {
      if (!allowedColumns.includes(col)) {
        throw new Error(`Invalid search column: ${col}`);
      }
    });
    
    return escaped;
  }
}

/**
 * Example usage functions showing safe query patterns
 */
export const safeQueryExamples = {
  /**
   * Safe user lookup by ID
   */
  async getUserById(userId: string) {
    const validatedId = SecureQueryBuilder.validateUUID(userId, 'userId');
    
    return supabase
      .from('users')
      .select('*')
      .eq('id', validatedId)
      .single();
  },

  /**
   * Safe provider search with filters
   */
  async searchProviders(filters: {
    city?: string;
    serviceIds?: string[];
    minRating?: number;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase.from('providers').select('*');
    
    if (filters.city) {
      query = query.eq('city', SecureQueryBuilder.validateParam(filters.city, 'city'));
    }
    
    if (filters.serviceIds && filters.serviceIds.length > 0) {
      const validatedIds = filters.serviceIds.map(id => 
        SecureQueryBuilder.validateUUID(id, 'serviceId')
      );
      query = query.in('id', validatedIds);
    }
    
    if (filters.minRating !== undefined) {
      query = query.gte('rating', SecureQueryBuilder.validateParam(filters.minRating, 'minRating'));
    }
    
    const { limit, offset } = SecureQueryBuilder.validatePagination(filters.limit, filters.offset);
    query = query.limit(limit).offset(offset);
    
    return query;
  },

  /**
   * Safe text search
   */
  async searchByText(searchTerm: string, table: string) {
    const allowedTables = ['providers', 'services', 'users'];
    if (!allowedTables.includes(table)) {
      throw new Error('Invalid table name');
    }
    
    const escapedTerm = SecureQueryBuilder.createTextSearchQuery(
      searchTerm, 
      ['name', 'description']
    );
    
    return supabase
      .from(table)
      .select('*')
      .or(`name.ilike.%${escapedTerm}%,description.ilike.%${escapedTerm}%`);
  }
};

export default SecureQueryBuilder;