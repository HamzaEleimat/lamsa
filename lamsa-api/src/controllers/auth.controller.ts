import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';
import { ApiResponse, AuthRequest } from '../types';
import { db, auth, supabase, supabaseAdmin } from '../config/supabase';
import { mockOTP } from '../config/mock-otp';
import { validateJordanPhoneNumber, validateTestPhoneNumber } from '../utils/phone-validation';
import { getEnvironmentConfig } from '../utils/environment-validation';
import { logger } from '../utils/logger';
import { tokenBlacklist, refreshTokenManager } from '../config/token-storage.config';
import { accountLockoutService } from '../services/account-lockout.service';
import { secureLogger } from '../utils/secure-logger';
import { passwordUtils } from '../utils/password.utils';
import { otpService } from '../services/otp.service';
import { blunetSMSService } from '../services/blunet-sms.service';

// Interfaces for request bodies

interface ProviderSignupRequest {
  email: string;
  password: string;
  phone: string;
  phoneVerified?: boolean;
  business_name_ar: string;
  business_name_en: string;
  owner_name: string;
  latitude?: number;
  longitude?: number;
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
    // Remove all non-digit characters except the leading +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Remove any + that's not at the beginning
    if (cleaned.indexOf('+') > 0) {
      cleaned = cleaned.replace(/\+/g, '');
    }
    
    // Handle different formats
    if (cleaned.startsWith('+962')) {
      // Already has country code with +
      // cleaned is already correct
    } else if (cleaned.startsWith('962')) {
      // Has country code without +
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('07')) {
      // Local format with 0 (e.g., 0791234567)
      cleaned = '+962' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      // Local format without 0 (e.g., 791234567)
      cleaned = '+962' + cleaned;
    } else {
      logger.error('Invalid phone format', { original: phone, cleaned });
      throw new BilingualAppError('INVALID_PHONE_FORMAT', 400);
    }
    
    // Validate final format: +962[7-9]XXXXXXXX (12 digits total with +)
    // Now accepts 07X, 08X, and 09X numbers
    const jordanPhoneRegex = /^\+962[7-9][0-9]{8}$/;
    if (!jordanPhoneRegex.test(cleaned)) {
      logger.error('Phone failed regex validation', { original: phone, cleaned });
      throw new BilingualAppError('PHONE_NOT_JORDAN', 400);
    }
    
    return cleaned;
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JWTPayload): string {
    // Add security claims
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000), // Issued at
      iss: 'lamsa-api', // Issuer
      aud: 'lamsa-app', // Audience
      jti: `${payload.id}-${Date.now()}` // JWT ID for uniqueness
    };

    return jwt.sign(
      tokenPayload, 
      this.getConfig().JWT_SECRET, 
      { 
        expiresIn: this.getConfig().JWT_EXPIRES_IN,
        algorithm: 'HS256' // Specify algorithm explicitly
      } as jwt.SignOptions
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
        throw new BilingualAppError('PHONE_REQUIRED', 400);
      }
      
      // Validate phone number using centralized validation
      const validation = process.env.NODE_ENV === 'development' 
        ? validateTestPhoneNumber(phone)
        : validateJordanPhoneNumber(phone);
      
      if (!validation.isValid) {
        throw new BilingualAppError('INVALID_PHONE_FORMAT', 400);
      }
      
      const normalizedPhone = validation.normalizedPhone!;
      
      // Log if using test number
      if (process.env.NODE_ENV === 'development' && validation.isTestNumber) {
        logger.debug('Using test phone number for development', { phone: normalizedPhone });
      }
      
      // Handle OTP generation and sending
      let data: any = null;
      let otpResult: any = null;
      
      if (mockOTP.isMockMode()) {
        // Use mock OTP for development
        logger.info('Using mock OTP for development');
        const mockOtpCode = mockOTP.generate(normalizedPhone);
        data = { mockMode: true, success: true };
        otpResult = { code: mockOtpCode, success: true };
      } else {
        // Production mode - Use custom OTP with Blunet SMS
        logger.info('Generating OTP for real SMS', { phone: normalizedPhone });
        
        // Generate OTP
        otpResult = otpService.generateOTP(normalizedPhone);
        
        if (!otpResult.success) {
          throw new BilingualAppError('Failed to generate OTP', 500);
        }
        
        // Format OTP message
        const message = `رمز التحقق الخاص بك في تطبيق لمسة: ${otpResult.code}\n\nYour Lamsa verification code is: ${otpResult.code}\n\nصالح لمدة 10 دقائق / Valid for 10 minutes`;
        
        // Send SMS via Blunet
        logger.info('Sending OTP via Blunet SMS');
        const smsResult = await blunetSMSService.sendSMS(normalizedPhone, message);
        
        if (!smsResult.success) {
          // Clear the generated OTP if SMS failed
          otpService.clearOTP(normalizedPhone);
          logger.error('Failed to send SMS via Blunet', {
            error: smsResult.error,
            errorCode: smsResult.errorCode
          });
          throw new BilingualAppError('OTP_SEND_FAILED', 503);
        }
        
        data = {
          success: true,
          messageId: smsResult.messageId,
          expiresAt: otpResult.expiresAt
        };
        
        logger.info('OTP sent successfully via Blunet', {
          messageId: smsResult.messageId,
          phone: normalizedPhone
        });
      }
      
      // Security: Never expose OTP codes in API responses (removed development bypass)
      const responseData: any = { phone: normalizedPhone };
      
      // DEVELOPMENT ONLY: Return OTP for testing with Postman
      // This should NEVER be enabled in production
      if (process.env.NODE_ENV === 'development' && process.env.ENABLE_TEST_OTP_RESPONSE === 'true' && otpResult) {
        responseData.testOtp = otpResult.code;
        logger.warn('⚠️  TEST MODE: OTP exposed in response. NEVER use in production!');
      }
      
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
      const { phone, otp, email, name } = req.body;
      
      // Validate required fields
      if (!phone) {
        throw new BilingualAppError('PHONE_REQUIRED', 400);
      }
      
      if (!email) {
        throw new BilingualAppError('Email is required', 400);
      }
      
      // Validate and normalize phone number using centralized validation
      const validation = process.env.NODE_ENV === 'development' 
        ? validateTestPhoneNumber(phone)
        : validateJordanPhoneNumber(phone);
      
      if (!validation.isValid) {
        throw new BilingualAppError('INVALID_PHONE_FORMAT', 400);
      }
      
      const normalizedPhone = validation.normalizedPhone!;
      
      // Debug logging
      logger.info('OTP Verification attempt', {
        originalPhone: phone,
        normalizedPhone: normalizedPhone,
        otp: otp,
        isMockMode: mockOTP.isMockMode()
      });
      
      // Check if account is locked
      const lockoutStatus = await accountLockoutService.isLocked(normalizedPhone, 'otp');
      if (lockoutStatus.isLocked) {
        const minutesRemaining = Math.ceil((lockoutStatus.lockoutUntil!.getTime() - Date.now()) / 60000);
        throw new BilingualAppError(
          `Account temporarily locked due to too many failed attempts. Please try again in ${minutesRemaining} minutes.`,
          429
        );
      }
      
      // Verify OTP based on mode
      let otpVerified = false;
      
      if (mockOTP.isMockMode()) {
        // Use mock OTP verification in development
        logger.info('Trying mock OTP verification');
        const isValid = mockOTP.verify(normalizedPhone, otp);
        if (!isValid) {
          // Record failed attempt
          const lockoutResult = await accountLockoutService.recordFailedAttempt(normalizedPhone, 'otp');
          if (lockoutResult.isLocked) {
            throw new BilingualAppError('OTP_MAX_ATTEMPTS', 429);
          }
          const arMessage = `رمز التحقق غير صحيح. ${lockoutResult.remainingAttempts} محاولات متبقية`;
          throw new BilingualAppError('INVALID_OTP', 400, {
            en: `Invalid OTP. ${lockoutResult.remainingAttempts} attempts remaining`,
            ar: arMessage
          });
        }
        otpVerified = true;
      } else {
        // Use our custom OTP verification for real SMS
        logger.info('Verifying OTP from custom service');
        const verifyResult = otpService.verifyOTP(normalizedPhone, otp);
        
        if (!verifyResult.success) {
          // Record failed attempt
          const lockoutResult = await accountLockoutService.recordFailedAttempt(normalizedPhone, 'otp');
          if (lockoutResult.isLocked) {
            throw new BilingualAppError('OTP_MAX_ATTEMPTS', 429);
          }
          const enMessage = verifyResult.error || `Invalid or expired OTP. ${lockoutResult.remainingAttempts} attempts remaining.`;
          const arMessage = verifyResult.error?.includes('expired') 
            ? `رمز التحقق منتهي الصلاحية. ${lockoutResult.remainingAttempts} محاولات متبقية.`
            : `رمز التحقق غير صحيح. ${lockoutResult.remainingAttempts} محاولات متبقية.`;
          throw new BilingualAppError(
            verifyResult.error?.includes('expired') ? 'OTP_EXPIRED' : 'INVALID_OTP',
            400,
            {
              en: enMessage,
              ar: arMessage
            }
          );
        }
        
        logger.info('OTP verified successfully via custom service');
        otpVerified = true;
      }
      
      // Reset lockout attempts on successful verification
      if (otpVerified) {
        await accountLockoutService.resetAttempts(normalizedPhone, 'otp');
      }
      
      // Now create or fetch the user
      logger.info('Creating/fetching user after OTP verification', { 
        phone: normalizedPhone,
        email: email,
        name: name || 'User'
      });
      
      const { data: user, error: userError } = await auth.createCustomerAfterOtp(
        normalizedPhone,
        { 
          name: name || 'User',
          email: email
        }
      );
      
      if (userError) {
        logger.error('Failed to create user account', {
          error: userError,
          phone: normalizedPhone
        });
        throw new BilingualAppError('Failed to create user account', 500);
      }
      
      if (!user) {
        logger.error('No user returned after OTP verification');
        throw new BilingualAppError('Failed to create user account - no user data', 500);
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

      // Validate password
      const passwordValidation = passwordUtils.validate(providerData.password);
      if (!passwordValidation.isValid) {
        throw new BilingualAppError(passwordValidation.error!, 400);
      }

      // Validate phone number
      const validatedPhone = this.validateJordanPhoneNumber(providerData.phone);

      // Check if email already exists
      const { data: existingProvider, error: emailCheckError } = await db.providers.findByEmail(providerData.email);
      if (emailCheckError) {
        logger.error('Error checking email:', emailCheckError);
        throw new BilingualAppError('Could not verify email uniqueness. Please try again later.', 500);
      }
      if (existingProvider) {
        throw new BilingualAppError('Email already registered', 409);
      }

      // Check if phone already exists
      const { data: existingPhone, error: phoneCheckError } = await db.providers.findByPhone(validatedPhone);
      if (phoneCheckError) {
        logger.error('Error checking phone:', phoneCheckError);
        throw new BilingualAppError('Could not verify phone uniqueness. Please try again later.', 500);
      }
      if (existingPhone) {
        throw new BilingualAppError('Phone number already registered', 409);
      }

      // Use Supabase Auth to create provider with proper authentication
      
      const { data, error } = await auth.signUpProvider({
        email: providerData.email.toLowerCase().trim(),
        password: providerData.password,
        phone: validatedPhone,
        business_name_ar: providerData.business_name_ar,
        business_name_en: providerData.business_name_en,
        owner_name: providerData.owner_name,
        address: providerData.address,
        license_number: providerData.license_number,
        phoneVerified: providerData.phoneVerified,
        latitude: providerData.latitude,
        longitude: providerData.longitude
      });


      if (error || !data) {
        logger.error('Failed to create provider', error);
        console.error('Provider signup error details:', error);
        // Include error details in development for debugging
        if (process.env.NODE_ENV === 'development' && error) {
          const errorMessage = (error as any).message || JSON.stringify(error);
          throw new BilingualAppError(`Failed to create provider account: ${errorMessage}`, 500);
        }
        throw new BilingualAppError('Failed to create provider account', 500);
      }

      const provider = data.provider;

      // Generate JWT token
      const token = this.generateToken({
        id: provider.id,
        type: 'provider',
        email: provider.email,
      });

      // Generate refresh token
      const refreshTokenData = await this.generateRefreshToken({
        id: provider.id,
        type: 'provider',
        email: provider.email,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          provider: {
            id: provider.id,
            business_name_ar: provider.business_name_ar,
            business_name_en: provider.business_name_en,
            owner_name: provider.owner_name,
            phone: provider.phone,
            email: provider.email,
            verified: provider.status === 'active',
            license_number: provider.license_number,
          },
          token,
          refreshToken: refreshTokenData.refreshToken,
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

      // Input validation
      if (!email || !password) {
        throw new BilingualAppError('Email and password are required', 400);
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new BilingualAppError('Invalid email format', 400);
      }

      // Sanitize email input
      const sanitizedEmail = email.toLowerCase().trim();

      // Check if account is locked
      const lockoutStatus = await accountLockoutService.isLocked(sanitizedEmail, 'provider');
      if (lockoutStatus.isLocked) {
        const minutesRemaining = Math.ceil((lockoutStatus.lockoutUntil!.getTime() - Date.now()) / 60000);
        throw new BilingualAppError(
          `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minutes.`,
          429
        );
      }

      // Use Supabase Auth for provider login
      
      const { data: authResult, error: authError } = await auth.signInProvider(sanitizedEmail, password);

      if (authError || !authResult) {
        // Record failed attempt
        const lockoutResult = await accountLockoutService.recordFailedAttempt(sanitizedEmail, 'provider');
        
        // Log security event
        secureLogger.warn('Failed provider login attempt', {
          email: sanitizedEmail,
          remainingAttempts: lockoutResult.remainingAttempts,
          isLocked: lockoutResult.isLocked,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          error: (authError as any)?.message || 'Unknown error'
        });

        if (lockoutResult.isLocked) {
          throw new BilingualAppError(
            'Too many failed login attempts. Account temporarily locked.',
            429
          );
        }
        
        // Handle specific Supabase Auth errors
        const errorMessage = (authError as any)?.message || 'Authentication failed';
        if (errorMessage.includes('Invalid login credentials')) {
          throw new BilingualAppError(
            `Invalid email or password. ${lockoutResult.remainingAttempts} attempts remaining.`,
            401
          );
        }
        
        throw new BilingualAppError(
          `Invalid email or password. ${lockoutResult.remainingAttempts} attempts remaining.`,
          401
        );
      }

      const provider = authResult.provider;

      // Reset lockout attempts on successful login
      await accountLockoutService.resetAttempts(sanitizedEmail, 'provider');

      // Check if provider is active
      const isActive = (provider as any).status === 'active';
      if (!isActive) {
        throw new BilingualAppError('Provider account not verified. Please contact support.', 403);
      }

      // Check if MFA is enabled
      const { mfaService } = await import('../services/mfa.service');
      const isMFAEnabled = await mfaService.isMFAEnabled((provider as any).id);
      
      if (isMFAEnabled) {
        // Log MFA requirement
        secureLogger.info('MFA required for provider login', {
          providerId: (provider as any).id,
          ipAddress: req.ip
        });

        // Return partial success requiring MFA verification
        const response: ApiResponse = {
          success: true,
          data: {
            requiresMFA: true,
            providerId: (provider as any).id,
            message: 'Please enter your 2FA code',
            message_ar: 'يرجى إدخال رمز المصادقة الثنائية',
          }
        };
        
        res.json(response);
        return;
      }

      // Generate JWT token with comprehensive claims
      const tokenPayload: JWTPayload = {
        id: (provider as any).id,
        type: 'provider',
        email: (provider as any).email
      };

      const token = this.generateToken(tokenPayload);

      // Generate refresh token for session management
      const refreshTokenData = await this.generateRefreshToken(tokenPayload);

      // Log successful login
      secureLogger.info('Provider login successful', {
        providerId: (provider as any).id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
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
          tokenExpiresIn: this.getConfig().JWT_EXPIRES_IN,
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
        throw new BilingualAppError('Refresh token required', 400);
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
        next(new BilingualAppError('Invalid or expired refresh token', 401));
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
        throw new BilingualAppError('PHONE_REQUIRED', 400);
      }
      
      // Validate phone number using centralized validation
      const validation = process.env.NODE_ENV === 'development' 
        ? validateTestPhoneNumber(phone)
        : validateJordanPhoneNumber(phone);
      
      if (!validation.isValid) {
        throw new BilingualAppError('INVALID_PHONE_FORMAT', 400);
      }
      
      const normalizedPhone = validation.normalizedPhone!;
      
      // Check if phone is already registered to a provider
      const { data: existingProvider } = await db.providers.findByPhone(normalizedPhone);
      if (existingProvider) {
        throw new BilingualAppError('This phone number is already registered to another provider', 409);
      }
      
      // Send OTP (same logic as customer OTP)
      let data: any = null;
      
      if (mockOTP.isMockMode()) {
        // Use mock OTP for development
        logger.info('Using mock OTP for provider verification');
        mockOTP.generate(normalizedPhone);
        data = { mockMode: true, success: true };
      } else {
        // Production mode - Use custom OTP with Blunet SMS
        logger.info('Generating OTP for provider SMS', { phone: normalizedPhone });
        
        // Generate OTP
        const otpResult = otpService.generateOTP(normalizedPhone);
        
        if (!otpResult.success) {
          throw new BilingualAppError('Failed to generate OTP', 500);
        }
        
        // Format OTP message for providers
        const message = `رمز التحقق لتسجيل مقدم الخدمة في لمسة: ${otpResult.code}\n\nYour Lamsa provider verification code is: ${otpResult.code}\n\nصالح لمدة 10 دقائق / Valid for 10 minutes`;
        
        // Send SMS via Blunet
        logger.info('Sending provider OTP via Blunet SMS');
        const smsResult = await blunetSMSService.sendSMS(normalizedPhone, message);
        
        if (!smsResult.success) {
          // Clear the generated OTP if SMS failed
          otpService.clearOTP(normalizedPhone);
          logger.error('Failed to send SMS via Blunet', {
            error: smsResult.error,
            errorCode: smsResult.errorCode
          });
          throw new BilingualAppError('OTP_SEND_FAILED', 503);
        }
        
        data = {
          success: true,
          messageId: smsResult.messageId,
          expiresAt: otpResult.expiresAt
        };
        
        logger.info('Provider OTP sent successfully via Blunet', {
          messageId: smsResult.messageId,
          phone: normalizedPhone
        });
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
        throw new BilingualAppError('Phone number and OTP are required', 400);
      }
      
      // Verify OTP based on mode
      let otpVerified = false;
      
      if (mockOTP.isMockMode()) {
        // Use mock OTP verification in development
        logger.info('Trying mock OTP verification for provider');
        const isValid = mockOTP.verify(phone, otp);
        if (!isValid) {
          throw new BilingualAppError('Invalid or expired OTP', 400);
        }
        otpVerified = true;
      } else {
        // Use our custom OTP verification for real SMS
        logger.info('Verifying provider OTP from custom service');
        const verifyResult = otpService.verifyOTP(phone, otp);
        
        if (!verifyResult.success) {
          throw new BilingualAppError(verifyResult.error || 'Invalid or expired OTP', 400);
        }
        
        otpVerified = true;
      }
      
      if (otpVerified) {
        logger.info('Provider phone verified via SMS service');
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
        throw new BilingualAppError(
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
          throw new BilingualAppError(
            'Too many failed MFA attempts. Account temporarily locked.',
            429
          );
        }
        throw new BilingualAppError(
          result.error || `Invalid MFA code. ${lockoutResult.remainingAttempts} attempts remaining.`,
          401
        );
      }

      // Reset lockout attempts on successful MFA
      await accountLockoutService.resetAttempts(providerId, 'mfa');

      // Get provider details
      const { data: provider, error } = await db.providers.findById(providerId);

      if (error || !provider) {
        throw new BilingualAppError('Provider not found', 404);
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
        throw new BilingualAppError('Unauthorized', 401);
      }

      let userData: any;

      if (req.user.type === 'customer') {
        const { data: customer, error } = await db.users.findById(req.user.id);
        if (error || !customer) {
          throw new BilingualAppError('User not found', 404);
        }
        userData = {
          type: 'customer',
          profile: customer,
        };
      } else if (req.user.type === 'provider') {
        const { data: provider, error } = await db.providers.findById(req.user.id);
        if (error || !provider) {
          throw new BilingualAppError('Provider not found', 404);
        }
        userData = {
          type: 'provider',
          profile: provider,
        };
      } else {
        throw new BilingualAppError('Invalid user type', 400);
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

      throw new BilingualAppError('Password reset is not yet implemented.', 501);
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

      throw new BilingualAppError('Password reset is not yet implemented.', 501);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer signup with email and password
   */
  async customerSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, phone } = req.body;

      logger.debug('Customer signup attempt', { email, phone, name });

      // Validate and sanitize phone number
      let validatedPhone: string;
      try {
        validatedPhone = this.validateJordanPhoneNumber(phone);
      } catch (phoneError) {
        logger.error('Phone validation failed', { phone, error: phoneError });
        throw phoneError;
      }

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Check if customer already exists with this email
      let existingEmail;
      try {
        const result = await db.users.findByEmail(normalizedEmail);
        existingEmail = result?.data;
      } catch (dbError) {
        logger.error('Database error checking existing email', { email: normalizedEmail, error: dbError });
        throw new BilingualAppError('Database error while checking email', 500);
      }
      
      if (existingEmail) {
        throw new BilingualAppError('An account with this email already exists', 409);
      }

      // Check if customer already exists with this phone
      let existingPhone;
      try {
        const result = await db.users.findByPhone(validatedPhone);
        existingPhone = result?.data;
      } catch (dbError) {
        logger.error('Database error checking existing phone', { phone: validatedPhone, error: dbError });
        throw new BilingualAppError('Database error while checking phone', 500);
      }
      
      if (existingPhone) {
        throw new BilingualAppError('An account with this phone number already exists', 409);
      }

      // Step 1: Create auth user with Supabase Auth
      logger.debug('Creating auth user with Supabase Auth', { email: normalizedEmail });
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
      });

      if (authError) {
        logger.error('Failed to create auth user', authError);
        // Check for specific error codes
        if (authError.message?.includes('already registered')) {
          throw new BilingualAppError('An account with this email already exists', 409);
        }
        throw new BilingualAppError(authError?.message || 'Failed to create account', 400);
      }

      if (!authData.user) {
        throw new BilingualAppError('Failed to create account - no user returned', 400);
      }

      // Step 2: Create user profile in users table
      // Use supabaseAdmin to bypass RLS policies
      if (!supabaseAdmin) {
        logger.error('supabaseAdmin is null - service role key not configured');
        throw new BilingualAppError('Service role key not configured. Cannot create user profile.', 500);
      }

      logger.debug('Creating user profile', {
        authUserId: authData.user.id,
        email: normalizedEmail,
        phone: validatedPhone,
        name: name.trim()
      });

      // Try to create the user profile
      let newUser;
      let createError;
      
      try {
        const result = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id, // Link to Supabase Auth user
            name: name.trim(),
            email: normalizedEmail,
            phone: validatedPhone,
          })
          .select()
          .single();
          
        newUser = result.data;
        createError = result.error;
      } catch (dbError) {
        logger.error('Exception during user profile creation', {
          error: dbError,
          message: dbError instanceof Error ? dbError.message : 'Unknown error',
          stack: dbError instanceof Error ? dbError.stack : undefined
        });
        createError = dbError;
      }

      if (createError || !newUser) {
        // Log the actual database error for debugging
        logger.error('Failed to create customer profile:', {
          error: createError,
          errorMessage: (createError as any)?.message,
          errorCode: (createError as any)?.code,
          errorDetails: (createError as any)?.details,
          userId: authData.user?.id,
          email: normalizedEmail,
          phone: validatedPhone
        });

        // Rollback auth user if profile creation fails
        if (authData.user?.id && supabaseAdmin) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            logger.info('Rolled back Supabase Auth user after profile creation failure');
          } catch (rollbackError) {
            // This is a critical state that requires manual cleanup.
            logger.error('CRITICAL: Failed to rollback auth user after profile creation failure.', rollbackError, { 
              userId: authData.user.id,
              error: rollbackError 
            });
            // Consider sending an alert to an admin/monitoring service here.
          }
        }
        
        // Provide more specific error message
        const errorMessage = (createError as any)?.message || 'Failed to create user profile';
        throw new BilingualAppError(errorMessage, 500);
      }

      // Generate JWT token
      const token = this.generateToken({
        id: newUser.id,
        type: 'customer',
        phone: newUser.phone,
        email: newUser.email,
      });

      // Generate refresh token using the token manager
      const { refreshToken } = await refreshTokenManager.generateRefreshToken({
        id: newUser.id,
        type: 'customer',
        phone: newUser.phone,
        email: newUser.email,
      });

      // Log security event
      secureLogger.info('Customer signup successful', {
        userId: newUser.id,
        email: normalizedEmail,
        phone: validatedPhone,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      const response: ApiResponse = {
        success: true,
        message: 'Signup successful',
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            role: 'customer', // Changed from user_type to role to match Postman expectation
          },
          token,
          refreshToken,
          type: 'customer',
        },
      };

      res.status(201).json(response);
    } catch (error) {
      // Log the full error for debugging
      logger.error('Customer signup failed', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        requestBody: {
          email: req.body.email,
          phone: req.body.phone,
          name: req.body.name
          // Don't log password
        }
      });
      next(error);
    }
  }
}

export const authController = new AuthController();
