import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: 'customer' | 'provider'
        iat?: number
        exp?: number
      }
    }
  }
}

// Get JWT secret from environment - MUST be set for security
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for security')
}

// Token payload interface
interface TokenPayload {
  id: string
  role: 'customer' | 'provider'
  iat?: number
  exp?: number
}

// Error response interface
interface ErrorResponse {
  success: false
  error: string
  code?: string
}

/**
 * Generate JWT token
 * @param id - User or Provider ID
 * @param type - Role type (customer or provider)
 * @returns JWT token string
 */
export function generateToken(id: string, type: 'customer' | 'provider'): string {
  const payload: TokenPayload = {
    id,
    role: type
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h', // Reduced from 30d for better security
    issuer: 'beautycort-api',
    audience: 'beautycort-app'
  })
}

/**
 * Verify JWT token
 * @param token - JWT token string
 * @returns Decoded token payload or null
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'beautycort-api',
      audience: 'beautycort-app'
    }) as TokenPayload

    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Authenticate token middleware
 * Verifies JWT token and adds user to request object
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required',
      code: 'NO_TOKEN'
    } as ErrorResponse)
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'beautycort-api',
      audience: 'beautycort-app'
    }) as TokenPayload

    // Add user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    }

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      } as ErrorResponse)
      return
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      } as ErrorResponse)
      return
    }

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    } as ErrorResponse)
  }
}

/**
 * Require provider middleware
 * Checks if authenticated user is a provider
 */
export function requireProvider(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    } as ErrorResponse)
    return
  }

  if (req.user.role !== 'provider') {
    res.status(403).json({
      success: false,
      error: 'Provider access required',
      code: 'PROVIDER_ONLY'
    } as ErrorResponse)
    return
  }

  next()
}

/**
 * Require customer middleware
 * Checks if authenticated user is a customer
 */
export function requireCustomer(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    } as ErrorResponse)
    return
  }

  if (req.user.role !== 'customer') {
    res.status(403).json({
      success: false,
      error: 'Customer access required',
      code: 'CUSTOMER_ONLY'
    } as ErrorResponse)
    return
  }

  next()
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null

  if (!token) {
    next()
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'beautycort-api',
      audience: 'beautycort-app'
    }) as TokenPayload

    req.user = {
      id: decoded.id,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    }
  } catch (error) {
    // Ignore errors for optional auth
  }

  next()
}

/**
 * Check if user owns the resource
 * Useful for protecting user-specific resources
 */
export function requireOwner(resourceOwnerId: string | ((req: Request) => string)) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      } as ErrorResponse)
      return
    }

    const ownerId = typeof resourceOwnerId === 'function' 
      ? resourceOwnerId(req) 
      : resourceOwnerId

    if (req.user.id !== ownerId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'NOT_OWNER'
      } as ErrorResponse)
      return
    }

    next()
  }
}

/**
 * Rate limiting helper for authenticated routes
 * Returns user ID for rate limiting
 */
export function getRateLimitKey(req: Request): string {
  if (req.user) {
    return `auth_${req.user.role}_${req.user.id}`
  }
  return `anon_${req.ip}`
}

// Export all middleware and utilities
export default {
  generateToken,
  verifyToken,
  authenticateToken,
  requireProvider,
  requireCustomer,
  optionalAuth,
  requireOwner,
  getRateLimitKey
}