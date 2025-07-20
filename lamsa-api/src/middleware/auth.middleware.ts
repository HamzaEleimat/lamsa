import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import jwt from 'jsonwebtoken';
import { getEnvironmentConfig } from '../utils/environment-validation';
import { tokenBlacklist } from '../config/token-storage.config';

interface JWTPayload {
  id: string;
  type?: 'customer' | 'provider' | 'admin';
  email?: string;
  phone?: string;
  iat?: number;
  exp?: number;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    // Check if token is blacklisted (revoked)
    const isBlacklisted = await tokenBlacklist.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'Token has been revoked',
      });
      return;
    }

    // Verify JWT token using secure environment configuration
    const config = getEnvironmentConfig();
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    
    // Map the JWT payload to our user object
    req.user = {
      id: decoded.id,
      email: decoded.email || '',
      role: mapTypeToRole(decoded.type),
      type: decoded.type
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
      });
    }
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions',
      });
      return;
    }

    next();
  };
};

// Helper function to map JWT type to UserRole enum
function mapTypeToRole(type?: string): UserRole {
  switch (type) {
    case 'customer':
      return UserRole.CUSTOMER;
    case 'provider':
      return UserRole.PROVIDER;
    case 'admin':
      return UserRole.ADMIN;
    default:
      return UserRole.CUSTOMER;
  }
}