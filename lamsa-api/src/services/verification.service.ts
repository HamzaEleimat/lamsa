import { randomBytes, createHash } from 'crypto';
import { 
  VerificationRequest, 
  VerificationResponse, 
  IdentityVerificationRequest,
  IdentityVerificationResponse,
  VerificationSession,
  AuthErrorCode,
  UserType,
  SecurityContext,
  // AuthAuditLog, // Commented out to suppress unused import warning
  AuthAction,
  AuthResult
} from '../types/auth-v2.types';
import { supabase } from '../config/supabase-simple';
import { validateJordanPhoneNumber } from '../utils/phone-validation';
import { AppError } from '../middleware/error.middleware';

// Mock SMS function for development - will be replaced with actual SMS service
const sendSMS = async (phone: string, message: string): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS to ${phone}: ${message}`);
    return Promise.resolve();
  }
  // In production, this would integrate with actual SMS service
  throw new Error('SMS service not configured');
};

export class VerificationService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 3;
  private readonly BLOCK_DURATION_HOURS = 1;

  /**
   * Generate a secure OTP code
   */
  private generateOTP(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Create verification session in database
   */
  private async createVerificationSession(
    phone: string,
    otp: string,
    security: SecurityContext
  ): Promise<VerificationSession> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    const { data, error } = await supabase
      .from('verification_sessions')
      .insert({
        phone,
        verification_code: otp,
        max_attempts: this.MAX_ATTEMPTS,
        expires_at: expiresAt.toISOString(),
        ip_address: security.ip_address,
        user_agent: security.user_agent
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to create verification session', 500);
    }

    return data;
  }

  /**
   * Check if phone number is currently blocked due to too many failed attempts
   */
  private async isPhoneBlocked(phone: string): Promise<{ blocked: boolean; retryAfter?: number }> {
    const blockUntil = new Date();
    blockUntil.setHours(blockUntil.getHours() - this.BLOCK_DURATION_HOURS);

    const { data } = await supabase
      .from('verification_sessions')
      .select('id', { count: 'exact' })
      .eq('phone', phone)
      .gte('created_at', blockUntil.toISOString())
      .gte('attempts', 'max_attempts')
      .is('verified_at', null);

    const failedSessions = data?.length || 0;
    
    if (failedSessions >= 3) {
      // Phone is blocked, calculate retry after
      const { data: lastFailure } = await supabase
        .from('verification_sessions')
        .select('created_at')
        .eq('phone', phone)
        .gte('attempts', 'max_attempts')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastFailure && lastFailure.length > 0) {
        const lastFailureTime = new Date(lastFailure[0].created_at);
        const unblockTime = new Date(lastFailureTime.getTime() + (this.BLOCK_DURATION_HOURS * 60 * 60 * 1000));
        const retryAfter = Math.max(0, Math.ceil((unblockTime.getTime() - Date.now()) / 1000));
        
        return { blocked: true, retryAfter };
      }
    }

    return { blocked: false };
  }

  /**
   * Log authentication event for audit trail
   */
  private async logAuthEvent(
    action: AuthAction,
    result: AuthResult,
    security: SecurityContext,
    details: Record<string, any> = {},
    phone?: string,
    userId?: string
  ): Promise<void> {
    try {
      await supabase
        .from('auth_audit_logs')
        .insert({
          user_id: userId || null,
          phone: phone || null,
          action,
          result,
          ip_address: security.ip_address,
          user_agent: security.user_agent,
          risk_score: security.risk_score,
          details
        });
    } catch (error) {
      console.error('Failed to log auth event:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Request phone verification - Phase 1 of authentication
   */
  async requestVerification(
    request: VerificationRequest,
    security: SecurityContext
  ): Promise<VerificationResponse> {
    try {
      // Validate phone number format
      const validation = validateJordanPhoneNumber(request.phone);
      if (!validation.isValid) {
        await this.logAuthEvent(
          AuthAction.REQUEST_VERIFICATION,
          AuthResult.FAILURE,
          security,
          { error: 'invalid_phone_format', phone: request.phone }
        );

        return {
          success: false,
          error: {
            code: AuthErrorCode.INVALID_PHONE_FORMAT,
            message: validation.error || 'Invalid phone number format',
            messageAr: 'تنسيق رقم الهاتف غير صحيح'
          }
        };
      }

      const normalizedPhone = validation.normalizedPhone!;

      // Check if phone is currently blocked
      const blockCheck = await this.isPhoneBlocked(normalizedPhone);
      if (blockCheck.blocked) {
        await this.logAuthEvent(
          AuthAction.REQUEST_VERIFICATION,
          AuthResult.BLOCKED,
          security,
          { phone: normalizedPhone, retryAfter: blockCheck.retryAfter }
        );

        return {
          success: false,
          error: {
            code: AuthErrorCode.TOO_MANY_VERIFICATION_ATTEMPTS,
            message: 'Too many failed verification attempts. Please try again later.',
            messageAr: 'محاولات تحقق فاشلة كثيرة. يرجى المحاولة مرة أخرى لاحقاً',
            retryAfter: blockCheck.retryAfter
          }
        };
      }

      // Clean up any expired verification sessions for this phone
      await supabase
        .from('verification_sessions')
        .delete()
        .eq('phone', normalizedPhone)
        .lt('expires_at', new Date().toISOString());

      // Check for existing active verification session
      const { data: existingSessions } = await supabase
        .from('verification_sessions')
        .select('id, expires_at, attempts, max_attempts')
        .eq('phone', normalizedPhone)
        .gt('expires_at', new Date().toISOString())
        .is('verified_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingSessions && existingSessions.length > 0) {
        const session = existingSessions[0];
        const attemptsRemaining = session.max_attempts - session.attempts;
        
        await this.logAuthEvent(
          AuthAction.REQUEST_VERIFICATION,
          AuthResult.SUCCESS,
          security,
          { phone: normalizedPhone, existing_session: true },
          normalizedPhone
        );

        return {
          success: true,
          data: {
            verificationId: session.id,
            expiresAt: session.expires_at,
            attemptsRemaining
          }
        };
      }

      // Generate new OTP and create verification session
      const otp = this.generateOTP();
      const session = await this.createVerificationSession(normalizedPhone, otp, security);

      // Send SMS (in development mode, log the OTP)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 Development OTP for ${normalizedPhone}: ${otp}`);
      }

      // Attempt to send SMS
      try {
        await sendSMS(normalizedPhone, `Your Lamsa verification code is: ${otp}`);
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
        
        // In production, this should fail the request
        if (process.env.NODE_ENV === 'production') {
          await this.logAuthEvent(
            AuthAction.REQUEST_VERIFICATION,
            AuthResult.FAILURE,
            security,
            { phone: normalizedPhone, error: 'sms_delivery_failed' },
            normalizedPhone
          );

          return {
            success: false,
            error: {
              code: AuthErrorCode.SMS_DELIVERY_FAILED,
              message: 'Failed to send verification code. Please try again.',
              messageAr: 'فشل في إرسال رمز التحقق. يرجى المحاولة مرة أخرى'
            }
          };
        }
      }

      await this.logAuthEvent(
        AuthAction.REQUEST_VERIFICATION,
        AuthResult.SUCCESS,
        security,
        { phone: normalizedPhone, session_id: session.id },
        normalizedPhone
      );

      return {
        success: true,
        data: {
          verificationId: session.id,
          expiresAt: session.expires_at,
          attemptsRemaining: this.MAX_ATTEMPTS
        }
      };

    } catch (error) {
      console.error('Verification request error:', error);
      
      await this.logAuthEvent(
        AuthAction.REQUEST_VERIFICATION,
        AuthResult.FAILURE,
        security,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return {
        success: false,
        error: {
          code: AuthErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error. Please try again.',
          messageAr: 'خطأ في الخادم الداخلي. يرجى المحاولة مرة أخرى'
        }
      };
    }
  }

  /**
   * Verify identity using OTP - Phase 1 completion
   */
  async verifyIdentity(
    request: IdentityVerificationRequest,
    security: SecurityContext
  ): Promise<IdentityVerificationResponse> {
    try {
      // Validate OTP format
      if (!request.otp || !/^\d{6}$/.test(request.otp)) {
        await this.logAuthEvent(
          AuthAction.VERIFY_IDENTITY,
          AuthResult.FAILURE,
          security,
          { error: 'invalid_otp_format', verification_id: request.verificationId }
        );

        return {
          success: false,
          error: {
            code: AuthErrorCode.INVALID_OTP_FORMAT,
            message: 'OTP must be 6 digits',
            messageAr: 'يجب أن يكون رمز التحقق 6 أرقام'
          }
        };
      }

      // Find verification session
      const { data: sessions } = await supabase
        .from('verification_sessions')
        .select('*')
        .eq('id', request.verificationId)
        .is('verified_at', null);

      if (!sessions || sessions.length === 0) {
        await this.logAuthEvent(
          AuthAction.VERIFY_IDENTITY,
          AuthResult.FAILURE,
          security,
          { error: 'session_not_found', verification_id: request.verificationId }
        );

        return {
          success: false,
          error: {
            code: AuthErrorCode.VERIFICATION_SESSION_NOT_FOUND,
            message: 'Verification session not found or already used',
            messageAr: 'جلسة التحقق غير موجودة أو مستخدمة بالفعل'
          }
        };
      }

      const session = sessions[0] as VerificationSession;

      // Check if session has expired
      if (new Date(session.expires_at) < new Date()) {
        await this.logAuthEvent(
          AuthAction.VERIFY_IDENTITY,
          AuthResult.FAILURE,
          security,
          { error: 'session_expired', verification_id: request.verificationId },
          session.phone
        );

        return {
          success: false,
          error: {
            code: AuthErrorCode.EXPIRED_OTP,
            message: 'Verification code has expired. Please request a new one.',
            messageAr: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد'
          }
        };
      }

      // Check if max attempts reached
      if (session.attempts >= session.max_attempts) {
        await this.logAuthEvent(
          AuthAction.VERIFY_IDENTITY,
          AuthResult.BLOCKED,
          security,
          { error: 'max_attempts_reached', verification_id: request.verificationId },
          session.phone
        );

        return {
          success: false,
          error: {
            code: AuthErrorCode.TOO_MANY_VERIFICATION_ATTEMPTS,
            message: 'Maximum verification attempts reached. Please request a new code.',
            messageAr: 'تم الوصول إلى الحد الأقصى لمحاولات التحقق. يرجى طلب رمز جديد'
          }
        };
      }

      // Verify OTP
      const isValidOTP = session.verification_code === request.otp;

      if (!isValidOTP) {
        // Increment attempt counter
        await supabase
          .from('verification_sessions')
          .update({ attempts: session.attempts + 1 })
          .eq('id', request.verificationId);

        const attemptsRemaining = session.max_attempts - (session.attempts + 1);

        await this.logAuthEvent(
          AuthAction.VERIFY_IDENTITY,
          AuthResult.FAILURE,
          security,
          { 
            error: 'invalid_otp', 
            verification_id: request.verificationId,
            attempts_remaining: attemptsRemaining
          },
          session.phone
        );

        return {
          success: false,
          error: {
            code: AuthErrorCode.INVALID_OTP,
            message: `Invalid verification code. ${attemptsRemaining} attempts remaining.`,
            messageAr: `رمز التحقق غير صحيح. تبقى ${attemptsRemaining} محاولات`,
            details: { attemptsRemaining }
          }
        };
      }

      // OTP is valid - mark session as verified
      await supabase
        .from('verification_sessions')
        .update({ 
          verified_at: new Date().toISOString(),
          attempts: session.attempts + 1 
        })
        .eq('id', request.verificationId);

      // Check if this is a new user or existing user
      const isNewUser = await this.checkIfNewUser(session.phone);
      const userType = await this.determineUserType(session.phone);

      // Create temporary session for account completion/access
      const tempToken = await this.createTempSession(
        session.phone,
        isNewUser,
        userType,
        security
      );

      await this.logAuthEvent(
        AuthAction.VERIFY_IDENTITY,
        AuthResult.SUCCESS,
        security,
        { 
          verification_id: request.verificationId,
          is_new_user: isNewUser,
          user_type: userType
        },
        session.phone
      );

      return {
        success: true,
        data: {
          tempToken,
          isNewUser,
          userType,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        }
      };

    } catch (error) {
      console.error('Identity verification error:', error);
      
      await this.logAuthEvent(
        AuthAction.VERIFY_IDENTITY,
        AuthResult.FAILURE,
        security,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return {
        success: false,
        error: {
          code: AuthErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error. Please try again.',
          messageAr: 'خطأ في الخادم الداخلي. يرجى المحاولة مرة أخرى'
        }
      };
    }
  }

  /**
   * Check if phone number belongs to a new user
   */
  private async checkIfNewUser(phone: string): Promise<boolean> {
    // Check in customers table
    const { data: customers } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    // Check in providers table  
    const { data: providers } = await supabase
      .from('providers')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    return (!customers || customers.length === 0) && (!providers || providers.length === 0);
  }

  /**
   * Determine user type for existing users
   */
  private async determineUserType(phone: string): Promise<UserType> {
    // Check providers first (they might also be customers)
    const { data: providers } = await supabase
      .from('providers')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (providers && providers.length > 0) {
      return UserType.PROVIDER;
    }

    return UserType.CUSTOMER;
  }

  /**
   * Create temporary session for account completion/access
   */
  private async createTempSession(
    phone: string,
    isNewUser: boolean,
    userType: UserType,
    security: SecurityContext
  ): Promise<string> {
    const sessionId = randomBytes(32).toString('hex');
    const token = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes

    await supabase
      .from('temp_sessions')
      .insert({
        id: sessionId,
        phone,
        token_hash: tokenHash,
        is_new_user: isNewUser,
        user_type: userType,
        expires_at: expiresAt.toISOString(),
        ip_address: security.ip_address,
        fingerprint_hash: security.fingerprint.hash
      });

    return `${sessionId}:${token}`;
  }

  /**
   * Validate and retrieve temporary session
   */
  async validateTempSession(tempToken: string): Promise<{
    valid: boolean;
    session?: any;
    error?: string;
  }> {
    try {
      const [sessionId, token] = tempToken.split(':');
      if (!sessionId || !token) {
        return { valid: false, error: 'Invalid token format' };
      }

      const tokenHash = createHash('sha256').update(token).digest('hex');

      const { data: sessions } = await supabase
        .from('temp_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('token_hash', tokenHash)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null);

      if (!sessions || sessions.length === 0) {
        return { valid: false, error: 'Session not found or expired' };
      }

      return { valid: true, session: sessions[0] };
    } catch (error) {
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Mark temporary session as used
   */
  async markTempSessionUsed(sessionId: string): Promise<void> {
    await supabase
      .from('temp_sessions')
      .update({ used_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  /**
   * Clean up expired verification and temporary sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      // Clean expired verification sessions
      await supabase
        .from('verification_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Clean expired temporary sessions
      await supabase
        .from('temp_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Clean old audit logs (keep for 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await supabase
        .from('auth_audit_logs')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

export const verificationService = new VerificationService();
