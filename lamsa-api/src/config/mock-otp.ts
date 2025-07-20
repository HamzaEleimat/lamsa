// Mock OTP storage for development/testing
// In production, OTPs are handled by Supabase + SMS provider

const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

export const mockOTP = {
  // Generate a mock OTP
  generate(phone: string): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    otpStore.set(phone, { otp, expiresAt });
    
    console.log('🔐 Mock OTP Generated:');
    console.log(`📱 Phone: ${phone}`);
    console.log(`🔢 OTP Code: ${otp}`);
    console.log(`⏰ Expires at: ${expiresAt.toISOString()}`);
    console.log('---');
    console.log('⚠️  In production, this would be sent via SMS');
    console.log('📝 For testing, use this OTP code to verify');
    
    return otp;
  },
  
  // Verify a mock OTP
  verify(phone: string, otp: string): boolean {
    const stored = otpStore.get(phone);
    
    if (!stored) {
      console.log('❌ No OTP found for phone:', phone);
      return false;
    }
    
    if (new Date() > stored.expiresAt) {
      console.log('❌ OTP expired for phone:', phone);
      otpStore.delete(phone);
      return false;
    }
    
    if (stored.otp !== otp) {
      console.log('❌ Invalid OTP. Expected:', stored.otp, 'Got:', otp);
      return false;
    }
    
    console.log('✅ OTP verified successfully for:', phone);
    otpStore.delete(phone);
    return true;
  },
  
  // Check if we're in mock mode
  isMockMode(): boolean {
    return process.env.MOCK_OTP === 'true' || process.env.NODE_ENV === 'development';
  },
  
  // Get stored OTP for testing (development only)
  getStoredOTP(phone: string): { otp: string; expiresAt: Date } | undefined {
    if (process.env.NODE_ENV === 'development') {
      return otpStore.get(phone);
    }
    return undefined;
  }
};