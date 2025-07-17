/**
 * Resource Ownership Validation Middleware
 * Ensures users can only access/modify their own resources
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from './error.middleware';

/**
 * Middleware to ensure provider can only access their own resources
 * @param paramName - The parameter name containing the resource ID (default: 'id')
 */
export const validateProviderOwnership = (paramName: string = 'id') => {
  return (req: AuthRequest, _: Response, next: NextFunction): void => {
    try {
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        throw new AppError('Resource ID is required', 400);
      }
      
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      
      if (req.user.type !== 'provider') {
        throw new AppError('Provider access required', 403);
      }
      
      if (req.user.id !== resourceId) {
        throw new AppError('Access denied: You can only access your own resources', 403);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to ensure customer can only access their own resources
 * @param paramName - The parameter name containing the resource ID (default: 'id')
 */
export const validateCustomerOwnership = (paramName: string = 'id') => {
  return (req: AuthRequest, _: Response, next: NextFunction): void => {
    try {
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        throw new AppError('Resource ID is required', 400);
      }
      
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      
      if (req.user.type !== 'customer') {
        throw new AppError('Customer access required', 403);
      }
      
      if (req.user.id !== resourceId) {
        throw new AppError('Access denied: You can only access your own resources', 403);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to validate booking ownership
 * Checks if the user (customer or provider) owns the booking
 */
export const validateBookingOwnership = () => {
  return (req: AuthRequest, _: Response, next: NextFunction): void => {
    try {
      const bookingId = req.params.id;
      
      if (!bookingId) {
        throw new AppError('Booking ID is required', 400);
      }
      
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // Note: Additional database validation should be performed in the controller
      // to verify the booking actually belongs to the user
      // This middleware only validates the basic structure
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to ensure user can only access resources they created
 * Supports both provider and customer access patterns
 */
export const validateResourceCreator = (paramName: string = 'id') => {
  return (req: AuthRequest, _: Response, next: NextFunction): void => {
    try {
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        throw new AppError('Resource ID is required', 400);
      }
      
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // This middleware validates the request structure
      // Actual ownership validation should happen in the controller
      // by querying the database to verify the user created the resource
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Admin bypass middleware - allows admin users to access any resource
 * Should be used with caution and only for administrative functions
 */
export const validateOwnershipWithAdminBypass = (paramName: string = 'id') => {
  return (req: AuthRequest, _: Response, next: NextFunction): void => {
    try {
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        throw new AppError('Resource ID is required', 400);
      }
      
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // Allow admin access to any resource
      if (req.user.type === 'admin') {
        next();
        return;
      }
      
      // For non-admin users, validate ownership
      if (req.user.id !== resourceId) {
        throw new AppError('Access denied: You can only access your own resources', 403);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default {
  validateProviderOwnership,
  validateCustomerOwnership,
  validateBookingOwnership,
  validateResourceCreator,
  validateOwnershipWithAdminBypass
};