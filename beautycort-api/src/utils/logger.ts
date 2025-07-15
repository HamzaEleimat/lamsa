/**
 * @file logger.ts
 * @description Centralized logging utility for the BeautyCort API
 * @author BeautyCort Development Team
 * @date Created: 2025-01-14
 * @copyright BeautyCort 2025
 */

import { Request } from 'express';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  providerId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    // In production, you would send this to a logging service like CloudWatch, Datadog, etc.
    // For now, we'll use console methods based on level
    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
    this.log('error', message, errorContext);
  }

  // Helper method to extract context from Express request
  fromRequest(req: Request): LogContext {
    return {
      requestId: (req as any).requestId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: (req as any).user?.id,
      providerId: (req as any).user?.type === 'provider' ? (req as any).user?.id : undefined,
      method: req.method,
      path: req.path,
    };
  }

  // Log API errors with consistent format
  logApiError(message: string, error: any, req?: Request): void {
    const context = req ? this.fromRequest(req) : {};
    this.error(message, error, context);
  }

  // Log authentication events
  logAuth(event: string, success: boolean, details?: any, req?: Request): void {
    const context = req ? this.fromRequest(req) : {};
    const level = success ? 'info' : 'warn';
    const message = `Auth event: ${event} - ${success ? 'SUCCESS' : 'FAILED'}`;
    this.log(level, message, { ...context, ...details });
  }

  // Log database operations
  logDatabase(operation: string, success: boolean, details?: any): void {
    const level = success ? 'debug' : 'error';
    const message = `Database ${operation} - ${success ? 'SUCCESS' : 'FAILED'}`;
    this.log(level, message, details);
  }
}

// Export singleton instance
export const logger = new Logger();