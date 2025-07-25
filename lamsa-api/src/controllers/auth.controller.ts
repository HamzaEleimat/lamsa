import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/error.middleware';
import { ApiResponse, AuthRequest } from '../types';
import { db, auth } from '../config/supabase-simple';
import { mockOTP } from '../config/mock-otp';
import { validateJordanPhoneNumber, validateTestPhoneNumber } from '../utils/phone-validation';
import { getEnvironmentConfig } from '../utils/environment-validation';
import { logger } from '../utils/logger';
import { tokenBlacklist, refreshTokenManager } from '../config/token-storage.config';
import { accountLockoutService } from '../services/account-lockout.service';
import { encryptedDb } from '../services/encrypted-db.service';
import { encryptionService } from '../services/encryption.service';
import { secureLogger } from '../utils/secure-logger';

// Interfaces for request bodies

interface ProviderSignupRequest {
  email: string;
  password: string;
  phone: string;
  business_name_ar: string;
  business_name_en: string;
  owner_name: string;
  latitude: number;
  longitude: number;
  address: {
    street: string;
    city: string;
    district: string;
    country: string;
  };
  license_number?: string;
}

// Removed CustomerLoginRequest interface - no longer needed after removing insecure customerLogin method

interface ProviderLoginRequest {
  email: string;
  password: string;
}

interface JWTPayload {
  id: string;
  type: 'customer' | 'provider';
  phone?: string;
  email?: string;
}

export class AuthController {
  private config: any;

  private getConfig() {
    if (!this.config) {
      this.config = getEnvironmentConfig();
    }
    return this.config;
  }

  /**
   * Validate Jordan phone number format
   * Accepts: +962XXXXXXXXX, 962XXXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
   */
  private validateJordanPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('962')) {
      // Already has country code
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('07')) {
      // Local format with 0
      cleaned = '+962' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      // Local format without 0
      cleaned = '+962' + cleaned;
    } else {
      throw new AppError('Invalid phone number format. Please use Jordan format (e.g., 0791234567)', 400);
    }
    
    // Validate final format: +962XXXXXXXXX (12 digits total with +)
    const jordanPhoneRegex = /^\+962[7][0-9]{8}$/;
    if (!jordanPhoneRegex.test(cleaned)) {
      throw new AppError('Invalid Jordan mobile number. Must be a valid Jordanian mobile number', 400);
    }
    
    return cleaned;
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JWTPayload): string {
    return jwt.sign(
      payload, 
      this.getConfig().JWT_SECRET, 
      { expiresIn: this.getConfig().JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  /**
   * Generate refresh token with rotation support
   */
  private async generateRefreshToken(payload: JWTPayload): Promise<{ refreshToken: string; tokenId: string; tokenFamily: string }> {
    return await refreshTokenManager.generateRefreshToken(payload, undefined, this.getConfig().JWT_SECRET);
  }

  /**
   * Send OTP to customer phone number
   */
  async customerSendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        throw new AppError('Phone number is required', 400);
      }
      
      // Validate phone number using centralized validation
      const validation = process.env.NODE_ENV === 'development' 
        ? validateTestPhoneNumber(phone)
        : validateJordanPhoneNumber(phone);
      
      if (!validation.isValid) {
        throw new AppError(validation.error || 'Invalid phone number', 400);
      }
      
      const normalizedPhone = validation.normalizedPhone!;
      
      // Log if using test number
      if (process.env.NODE_ENV === 'development' && validation.isTestNumber) {
        logger.debug('Using test phone number for development', { phone: normalizedPhone });
      }
      
      // In development mode with mock OTP, skip Supabase if not configured
      let data: any = null;
      
      if (mockOTP.isMockMode()) {
        // Check if Supabase is properly configured
        const hasValidSupabaseConfig = process.env.SUPABASE_URL && 
                                      process.env.SUPABASE_ANON_KEY && 
                                      process.env.SUPABASE_URL !== 'your_supabase_url_here';
        
        if (hasValidSupabaseConfig) {
          // Try Supabase first
          logger.info('Attempting to send OTP via Supabase', { phone: normalizedPhone });
          const result = await auth.signInWithOtp({ phone: normalizedPhone });
          
          if (!result.success) {
            logger.logApiError('Supabase OTP Error', result.error, req);
            logger.info('Falling back to mock OTP in development mode');
          } else {
            data = result.data;
            logger.debug('OTP Response', { data });
          }
        } else {
          logger.warn('Supabase not configured - using mock OTP for development');
        }
        
        // Use mock OTP if Supabase failed or not configured
        if (!data) {
          logger.info('Using mock OTP for development');
          mockOTP.generate(normalizedPhone);
          data = { mockMode: true };
        }
      } else {
        // Production mode - Supabase is required
        logger.info('Attempting to send OTP', { phone: normalizedPhone });
        const result = await auth.signInWithOtp({ phone: normalizedPhone });
        
        if (!result.success) {
          logger.logApiError('OTP Error', result.error, req);
          throw new AppError(result.error?.message || 'Failed to send OTP', 400);
        }
        
        data = result.data;
        secureLogger.info('OTP Response received', { status: 'success' });
      }
      
      // Check if SMS was actually sent
      if (data && !data.mockMode && !data.user && !data.session) {
        logger.warn('Supabase accepted request but no SMS sent', {
          possibleIssues: [
            'Twilio messaging service might need phone number verification',
            'Phone number might need to be verified in Twilio',
            'Twilio account might be in trial mode with restrictions'
          ]
        });
      }
      
      // Check if real SMS was sent
      if (data?.messageId) {
        logger.info('Real SMS sent successfully', { messageId: data.messageId });
      }
      
      // Security: Never expose OTP codes in API responses (removed development bypass)
      const responseData: any = { phone: normalizedPhone };
      
      const response: ApiResponse = {
        success: true,
        message: 'OTP sent successfully to ' + normalizedPhone,
        data: responseData
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify OTP and create/fetch user
   */
  async verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp } = req.body;
      
      // Validate phone is provided
      if (!phone) {
        throw new AppError('Phone number is required', 400);
      }
      
      // Check if account is locked
      const lockoutStatus = await accountLockoutService.isLocked(phone, 'otp');
      if (lockoutStatus.isLocked) {
        const minutesRemaining = Math.ceil((lockoutStatus.lockoutUntil!.getTime() - Date.now()) / 60000);
        throw new AppError(
          `Account temporarily locked due to too many failed attempts. Please try again in ${minutesRemaining} minutes.`,
          429
        );
      }
      
      // Try Supabase verification first (for real SMS)
      const verifyResult = await auth.verifyOtp({ 
        phone, 
        token: otp 
      });
      
      // If Supabase verification fails and we're in mock mode, try mock OTP
      let otpVerified = false;
      if (!verifyResult.success && mockOTP.isMockMode()) {
        logger.info('Trying mock OTP verification');
        const isValid = mockOTP.verify(phone, otp);
        if (!isValid) {
          // Record failed attempt
          const lockoutResult = await accountLockoutService.recordFailedAttempt(phone, 'otp');
          if (lockoutResult.isLocked) {
            throw new AppError(
              'Too many failed OTP attempts. Account temporarily locked.',
              429
            );
          }
          throw new AppError(
            `Invalid or expired OTP. ${lockoutResult.remainingAttempts} attempts remaining.`,
            400
          );
        }
        otpVerified = true;
      } else if (!verifyResult.success) {
        // Record failed attempt
        const lockoutResult = await accountLockoutService.recordFailedAttempt(phone, 'otp');
        if (lockoutResult.isLocked) {
          throw new AppError(
            'Too many failed OTP attempts. Account temporarily locked.',
            429
          );
        }
        throw new AppError(
          verifyResult.error?.message || `Invalid or expired OTP. ${lockoutResult.remainingAttempts} attempts remaining.`,
          400
        );
      } else {
        logger.info('Real OTP verified via Supabase/Twilio');
        otpVerified = true;
      }
      
      // Reset lockout attempts on successful verification
      if (otpVerified) {
        await accountLockoutService.resetAttempts(phone, 'otp');
      }
      
      // Now create or fetch the user
      const { data: user, error: userError } = await auth.createCustomerAfterOtp(
        phone,
        { name: req.body.name || 'User' }
      );
      
      if (userError) {
        throw new AppError('Failed to create user account', 500);
      }
      
      // Generate JWT token
      const token = this.generateToken({
        id: (user as any).id,
        type: 'customer',
        phone: (user as any).phone,
      });

      const refreshTokenData = await this.generateRefreshToken({
        id: (user as any).id,
        type: 'customer',
        phone: (user as any).phone,
      });
      
      const response: ApiResponse = {
        success: true,
        message: 'Phone verified successfully',
        data: {
          user,
          token,
          refreshToken: refreshTokenData.refreshToken,
        }
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Provider signup with email and password
   */
  async providerSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerData: ProviderSignupRequest = req.body;

      // Validate phone number
      const validatedPhone = this.validateJordanPhoneNumber(providerData.phone);

      // Check if email already exists using encrypted database
      const { data: existingProvider } = await encryptedDb.findProviderByEmail(providerData.email);
      if (existingProvider) {
        throw new AppError('Email already registered', 409);
      }

      // Check if phone already exists using encrypted database service
      const { data: existingPhone } = await encryptedDb.findProviderByPhone(validatedPhone);
      if (existingPhone) {
        throw new AppError('Phone number already registered', 409);
      }

      // Create provider with Supabase Auth
      const { data: result, error } = await auth.signUpProvider({
        ...providerData,
        phone: validatedPhone,
      });

      // Remove development bypass - always require real signup

      if (error || !result) {
        const errorMessage = error && typeof error === 'object' && 'message' in error 
          ? (error as any).message 
          : 'Failed to create provider account';
        throw new AppError(errorMessage, 500);
      }

      // Generate JWT token
      const token = this.generateToken({
        id: result.provider.id,
        type: 'provider',
        email: result.provider.email,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          provider: {
            id: result.provider.id,
            business_name_ar: result.provider.business_name_ar,
            business_name_en: result.provider.business_name_en,
            owner_name: result.provider.owner_name,
            phone: result.provider.phone,
            email: result.provider.email,
            verified: result.provider.verified,
          },
          token,
          type: 'provider',
        },
        message: 'Provider account created successfully. Pending verification.',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  // REMOVED: customerLogin method was an authentication bypass vulnerability
  // Customers must use the OTP flow: customerSendOTP -> verifyOTP

  /**
   * Provider login with email and password
   */
  async providerLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password }: ProviderLoginRequest = req.body;

      // Check if account is locked
      const lockoutStatus = await accountLockoutService.isLocked(email, 'provider');
      if (lockoutStatus.isLocked) {
        const minutesRemaining = Math.ceil((lockoutStatus.lockoutUntil!.getTime() - Date.now()) / 60000);
        throw new AppError(
          `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minutes.`,
          429
        );
      }

      // Sign in with Supabase Auth
      const { data: result, error } = await auth.signInProvider(email, password);

      // Remove development bypass - always require real authentication

      if (error || !result) {
        // Record failed attempt
        const lockoutResult = await accountLockoutService.recordFailedAttempt(email, 'provider');
        if (lockoutResult.isLocked) {
          throw new AppError(
            'Too many failed login attempts. Account temporarily locked.',
            429
          );
        }
        throw new AppError(
          `Invalid email or password. ${lockoutResult.remainingAttempts} attempts remaining.`,
          401
        );
      }

      // Reset lockout attempts on successful login
      await accountLockoutService.resetAttempts(email, 'provider');

      // Check if provider is verified
      if (!result.provider.verified) {
        throw new AppError('Provider account not verified. Please contact support.', 403);
      }

      // Check if MFA is enabled
      const { mfaService } = await import('../services/mfa.service');
      const isMFAEnabled = await mfaService.isMFAEnabled(result.provider.id);
      
      if (isMFAEnabled) {
        // Return partial success requiring MFA verification
        const response: ApiResponse = {
          success: true,
          data: {
            requiresMFA: true,
            providerId: result.provider.id,
            message: 'Please enter your 2FA code',
            message_ar: 'يرجى إدخال رمز المصادقة الثنائية',
          }
        };
        
        res.json(response);
        return;
      }

      // Generate JWT token (only if MFA is not enabled)
      const token = this.generateToken({
        id: result.provider.id,
        type: 'provider',
        email: result.provider.email,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          provider: {
            id: result.provider.id,
            business_name_ar: result.provider.business_name_ar,
            business_name_en: result.provider.business_name_en,
            owner_name: result.provider.owner_name,
            phone: result.provider.phone,
            email: result.provider.email,
            rating: result.provider.rating,
            total_reviews: result.provider.total_reviews,
          },
          token,
          type: 'provider',
        },
        message: 'Login successful',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }


  /**
   * Refresh JWT token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
      }

      // Rotate the refresh token (validates, revokes old, generates new)
      const rotationResult = await refreshTokenManager.rotateRefreshToken(
        refreshToken,
        this.getConfig().JWT_SECRET
      );

      // Generate new access token
      const newAccessToken = this.generateToken({
        id: rotationResult.payload.id,
        type: rotationResult.payload.type as 'customer' | 'provider',
        phone: rotationResult.payload.phone,
        email: rotationResult.payload.email,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          token: newAccessToken,
          refreshToken: rotationResult.newRefreshToken, // Return new refresh token
        },
      };

      logger.info(`Token refreshed for user ${rotationResult.payload.id}`);
      res.json(response);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || (error as any)?.message?.includes('refresh token')) {
        next(new AppError('Invalid or expired refresh token', 401));
      } else {
        next(error);
      }
    }
  }

  /**
   * Send OTP to provider phone number for verification
   */
  async providerSendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        throw new AppError('Phone number is required', 400);
      }
      
      // Validate phone number using centralized validation
      const validation = process.env.NODE_ENV === 'development' 
        ? validateTestPhoneNumber(phone)
        : validateJordanPhoneNumber(phone);
      
      if (!validation.isValid) {
        throw new AppError(validation.error || 'Invalid phone number', 400);
      }
      
      const normalizedPhone = validation.normalizedPhone!;
      
      // Check if phone is already registered to a provider using encrypted database service
      const { data: existingProvider } = await encryptedDb.findProviderByPhone(normalizedPhone);
      if (existingProvider) {
        throw new AppError('This phone number is already registered to another provider', 409);
      }
      
      // Send OTP (same logic as customer OTP)
      let data: any = null;
      
      if (mockOTP.isMockMode()) {
        logger.info('Using mock OTP for provider verification');
        mockOTP.generate(normalizedPhone);
        data = { mockMode: true };
      } else {
        logger.info('Attempting to send OTP to provider', { phone: normalizedPhone });
        const result = await auth.signInWithOtp({ phone: normalizedPhone });
        
        if (!result.success) {
          logger.logApiError('OTP Error', result.error, req);
          throw new AppError(result.error?.message || 'Failed to send OTP', 400);
        }
        
        data = result.data;
      }
      
      // Check if SMS was actually sent
      if (data && !data.mockMode && !data.user && !data.session) {
        logger.warn('Supabase accepted request but no SMS sent', {
          possibleIssues: [
            'Twilio messaging service might need phone number verification',
            'Phone number might need to be verified in Twilio',
            'Twilio account might be in trial mode with restrictions'
          ]
        });
      }
      
      // Check if real SMS was sent
      if (data?.messageId) {
        logger.info('Real SMS sent successfully', { messageId: data.messageId });
      }
      
      // Security: Never expose OTP codes in API responses (removed development bypass)
      const responseData: any = { phone: normalizedPhone };
      
      const response: ApiResponse = {
        success: true,
        message: 'OTP sent successfully to provider phone',
        data: responseData
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify provider phone number
   */
  async providerVerifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp } = req.body;
      
      if (!phone || !otp) {
        throw new AppError('Phone number and OTP are required', 400);
      }
      
      // Try Supabase verification first (for real SMS)
      const verifyResult = await auth.verifyOtp({ 
        phone, 
        token: otp 
      });
      
      // If Supabase verification fails and we're in mock mode, try mock OTP
      if (!verifyResult.success && mockOTP.isMockMode()) {
        logger.info('Trying mock OTP verification for provider');
        const isValid = mockOTP.verify(phone, otp);
        if (!isValid) {
          throw new AppError('Invalid or expired OTP', 400);
        }
      } else if (!verifyResult.success) {
        throw new AppError(verifyResult.error?.message || 'Invalid or expired OTP', 400);
      } else {
        logger.info('Provider phone verified via Supabase/Twilio');
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Phone verified successfully',
        data: {
          phone,
          verified: true,
        }
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete provider login after MFA verification
   */
  async providerLoginMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId, mfaToken }: { providerId: string; mfaToken: string } = req.body;

      // Check if MFA attempts are locked
      const lockoutStatus = await accountLockoutService.isLocked(providerId, 'mfa');
      if (lockoutStatus.isLocked) {
        const minutesRemaining = Math.ceil((lockoutStatus.lockoutUntil!.getTime() - Date.now()) / 60000);
        throw new AppError(
          `Too many failed MFA attempts. Please try again in ${minutesRemaining} minutes.`,
          429
        );
      }

      // Verify MFA token
      const { mfaService } = await import('../services/mfa.service');
      const result = await mfaService.verifyToken(providerId, mfaToken);

      if (!result.verified) {
        // Record failed MFA attempt
        const lockoutResult = await accountLockoutService.recordFailedAttempt(providerId, 'mfa');
        if (lockoutResult.isLocked) {
          throw new AppError(
            'Too many failed MFA attempts. Account temporarily locked.',
            429
          );
        }
        throw new AppError(
          result.error || `Invalid MFA code. ${lockoutResult.remainingAttempts} attempts remaining.`,
          401
        );
      }

      // Reset lockout attempts on successful MFA
      await accountLockoutService.resetAttempts(providerId, 'mfa');

      // Get provider details
      const { data: provider, error } = await db.providers.findById(providerId);

      if (error || !provider) {
        throw new AppError('Provider not found', 404);
      }

      // Generate JWT token after successful MFA
      const token = this.generateToken({
        id: (provider as any).id,
        type: 'provider',
        email: (provider as any).email,
      });

      const refreshTokenData = await this.generateRefreshToken({
        id: (provider as any).id,
        type: 'provider',
        email: (provider as any).email,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          provider: {
            id: (provider as any).id,
            business_name_ar: (provider as any).business_name_ar,
            business_name_en: (provider as any).business_name_en,
            owner_name: (provider as any).owner_name,
            phone: (provider as any).phone,
            email: (provider as any).email,
            rating: (provider as any).rating,
            total_reviews: (provider as any).total_reviews,
          },
          token,
          refreshToken: refreshTokenData.refreshToken,
          type: 'provider',
          mfaVerified: true,
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      let userData: any;

      if (req.user.type === 'customer') {
        const { data: customer, error } = await db.users.findById(req.user.id);
        if (error || !customer) {
          throw new AppError('User not found', 404);
        }
        userData = {
          type: 'customer',
          profile: customer,
        };
      } else if (req.user.type === 'provider') {
        const { data: provider, error } = await db.providers.findById(req.user.id);
        if (error || !provider) {
          throw new AppError('Provider not found', 404);
        }
        userData = {
          type: 'provider',
          profile: provider,
        };
      } else {
        throw new AppError('Invalid user type', 400);
      }

      const response: ApiResponse = {
        success: true,
        data: userData,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sign out (invalidate token)
   */
  async signout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract JWT token from request
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token && req.user?.id) {
        // Blacklist the current JWT token to prevent reuse
        await tokenBlacklist.blacklistToken(token, req.user.id, 'logout');
        
        // Revoke all refresh tokens for the user
        await refreshTokenManager.revokeAllUserTokens(req.user.id);
        
        logger.info(`User ${req.user.id} tokens blacklisted and refresh tokens revoked on signout`);
      }

      // Sign out from Supabase (if using Supabase session)
      await auth.signOut();

      const response: ApiResponse = {
        success: true,
        message: 'Signed out successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout (mainly for providers using Supabase Auth)
   * @deprecated Use signout instead
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract JWT token from request
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token && req.user?.id) {
        // Blacklist the current JWT token to prevent reuse
        await tokenBlacklist.blacklistToken(token, req.user.id, 'logout');
        
        // Revoke all refresh tokens for the user
        await refreshTokenManager.revokeAllUserTokens(req.user.id);
        
        logger.info(`User ${req.user.id} tokens blacklisted and refresh tokens revoked on logout`);
      }

      // Sign out from Supabase (if using Supabase session)
      await auth.signOut();

      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset for providers
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      // Check if provider exists
      const { data: provider } = await db.providers.findByEmail(email);
      
      if (!provider) {
        // Don't reveal if email exists for security
        const response: ApiResponse = {
          success: true,
          message: 'If the email exists, a password reset link will be sent',
        };
        res.json(response);
        return;
      }

      // TODO: In production:
      // 1. Generate reset token
      // 2. Send email with reset link
      // 3. Store token with expiration

      const response: ApiResponse = {
        success: true,
        message: 'Password reset instructions sent to your email',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password for providers
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      // TODO: In production:
      // 1. Verify reset token
      // 2. Check token expiration
      // 3. Update password in Supabase Auth
      // 4. Invalidate reset token

      if (!token || token.length < 32) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      if (!newPassword || newPassword.length < 6) {
        throw new AppError('Password must be at least 6 characters long', 400);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successful. Please login with your new password.',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
