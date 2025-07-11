import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key'

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Request/Response types
interface SendOTPRequest {
  phone: string
}

interface VerifyOTPRequest {
  phone: string
  otp: string
}

interface ProviderSignupRequest {
  email: string
  password: string
  business_name_ar: string
  business_name_en: string
  owner_name: string
  phone: string
  location?: {
    lat: number
    lng: number
  }
  address?: string
  city?: string
}

interface ProviderLoginRequest {
  email: string
  password: string
}

interface AuthResponse {
  success: boolean
  message?: string
  data?: any
  token?: string
  error?: string
}

// Helper functions
const validateJordanPhone = (phone: string): boolean => {
  // Remove any spaces or special characters
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  // Check if it matches Jordan phone pattern
  // Accepts: +962XXXXXXXXX, 962XXXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
  const jordanPhoneRegex = /^(\+?962|0)?7[789]\d{7}$/
  return jordanPhoneRegex.test(cleanPhone)
}

const formatJordanPhone = (phone: string): string => {
  // Remove any spaces or special characters
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  // Remove leading zeros
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1)
  }
  
  // Add country code if not present
  if (!cleanPhone.startsWith('962')) {
    cleanPhone = '962' + cleanPhone
  }
  
  // Add + prefix
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = '+' + cleanPhone
  }
  
  return cleanPhone
}

const generateJWT = (userId: string, role: 'customer' | 'provider'): string => {
  return jwt.sign(
    { 
      userId, 
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    jwtSecret,
    { expiresIn: '30d' }
  )
}

// Controller class
export class AuthController {
  // 1. Customer Send OTP
  static async customerSendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone }: SendOTPRequest = req.body

      // Validate input
      if (!phone) {
        res.status(400).json({
          success: false,
          error: 'Phone number is required'
        })
        return
      }

      // Validate Jordan phone number
      if (!validateJordanPhone(phone)) {
        res.status(400).json({
          success: false,
          error: 'Invalid Jordan phone number. Please use format: 07XXXXXXXX'
        })
        return
      }

      // Format phone number for Supabase
      const formattedPhone = formatJordanPhone(phone)

      // Send OTP via Supabase Auth
      const { data, error } = await supabaseAdmin.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          shouldCreateUser: true,
          data: {
            role: 'customer'
          }
        }
      })

      if (error) {
        console.error('Supabase OTP error:', error)
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to send OTP'
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          phone: formattedPhone,
          messageId: data.messageId
        }
      })
    } catch (error) {
      console.error('Send OTP error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // 2. Customer Verify OTP
  static async customerVerifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp }: VerifyOTPRequest = req.body

      // Validate input
      if (!phone || !otp) {
        res.status(400).json({
          success: false,
          error: 'Phone number and OTP are required'
        })
        return
      }

      // Validate Jordan phone number
      if (!validateJordanPhone(phone)) {
        res.status(400).json({
          success: false,
          error: 'Invalid Jordan phone number'
        })
        return
      }

      // Format phone number
      const formattedPhone = formatJordanPhone(phone)

      // Verify OTP with Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms'
      })

      if (authError) {
        res.status(400).json({
          success: false,
          error: authError.message || 'Invalid OTP'
        })
        return
      }

      if (!authData.user) {
        res.status(400).json({
          success: false,
          error: 'Authentication failed'
        })
        return
      }

      // Check if user profile exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      let user = existingUser

      // Create user profile if it doesn't exist
      if (!existingUser) {
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            phone: formattedPhone,
            preferred_language: 'ar',
            notification_preferences: {
              sms: true,
              push: true,
              email: false
            }
          })
          .select()
          .single()

        if (createError) {
          console.error('Create user error:', createError)
          res.status(500).json({
            success: false,
            error: 'Failed to create user profile'
          })
          return
        }

        user = newUser
      }

      // Generate JWT token
      const token = generateJWT(authData.user.id, 'customer')

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        token,
        data: {
          user,
          session: authData.session
        }
      })
    } catch (error) {
      console.error('Verify OTP error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // 3. Provider Signup
  static async providerSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        email,
        password,
        business_name_ar,
        business_name_en,
        owner_name,
        phone,
        location,
        address,
        city
      }: ProviderSignupRequest = req.body

      // Validate required fields
      if (!email || !password || !business_name_ar || !business_name_en || !owner_name || !phone) {
        res.status(400).json({
          success: false,
          error: 'All required fields must be provided'
        })
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        })
        return
      }

      // Validate password strength
      if (password.length < 8) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long'
        })
        return
      }

      // Validate Jordan phone number
      if (!validateJordanPhone(phone)) {
        res.status(400).json({
          success: false,
          error: 'Invalid Jordan phone number'
        })
        return
      }

      const formattedPhone = formatJordanPhone(phone)

      // Check if email already exists
      const { data: existingProvider } = await supabaseAdmin
        .from('providers')
        .select('id')
        .eq('email', email)
        .single()

      if (existingProvider) {
        res.status(400).json({
          success: false,
          error: 'Email already registered'
        })
        return
      }

      // Check if phone already exists
      const { data: existingPhone } = await supabaseAdmin
        .from('providers')
        .select('id')
        .eq('phone', formattedPhone)
        .single()

      if (existingPhone) {
        res.status(400).json({
          success: false,
          error: 'Phone number already registered'
        })
        return
      }

      // Hash password
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(password, saltRounds)

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'provider',
          business_name: business_name_en,
          owner_name
        }
      })

      if (authError) {
        console.error('Auth creation error:', authError)
        res.status(400).json({
          success: false,
          error: authError.message || 'Failed to create account'
        })
        return
      }

      if (!authData.user) {
        res.status(500).json({
          success: false,
          error: 'Failed to create account'
        })
        return
      }

      // Default location (Amman, Jordan) if not provided
      const defaultLocation: [number, number] = [35.9456, 31.9539]
      const providerLocation = location ? [location.lng, location.lat] : defaultLocation

      // Create provider profile
      const { data: provider, error: providerError } = await supabaseAdmin
        .from('providers')
        .insert({
          id: authData.user.id,
          email,
          password_hash: passwordHash,
          business_name: business_name_en,
          business_name_ar: business_name_ar,
          phone: formattedPhone,
          location: {
            type: 'Point',
            coordinates: providerLocation
          },
          address,
          address_ar: address,
          city: city || 'Amman',
          bio: `Welcome to ${business_name_en}`,
          bio_ar: `مرحباً بكم في ${business_name_ar}`,
          is_mobile: false,
          travel_radius_km: 5,
          verified: false,
          active: true,
          rating: 0,
          total_reviews: 0,
          business_hours: [
            { day: 'Sunday', open: '09:00', close: '18:00', is_closed: false },
            { day: 'Monday', open: '09:00', close: '18:00', is_closed: false },
            { day: 'Tuesday', open: '09:00', close: '18:00', is_closed: false },
            { day: 'Wednesday', open: '09:00', close: '18:00', is_closed: false },
            { day: 'Thursday', open: '09:00', close: '18:00', is_closed: false },
            { day: 'Friday', open: '09:00', close: '13:00', is_closed: false },
            { day: 'Saturday', open: '09:00', close: '18:00', is_closed: false }
          ],
          social_media: {}
        })
        .select()
        .single()

      if (providerError) {
        console.error('Provider creation error:', providerError)
        // Cleanup: delete auth user if provider creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        
        res.status(500).json({
          success: false,
          error: 'Failed to create provider profile'
        })
        return
      }

      res.status(201).json({
        success: true,
        message: 'Provider account created successfully. Please wait for verification.',
        data: {
          id: provider.id,
          email: provider.email,
          business_name: provider.business_name,
          business_name_ar: provider.business_name_ar,
          phone: provider.phone,
          verified: provider.verified
        }
      })
    } catch (error) {
      console.error('Provider signup error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // 4. Provider Login
  static async providerLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password }: ProviderLoginRequest = req.body

      // Validate input
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        })
        return
      }

      // Get provider by email
      const { data: provider, error: providerError } = await supabaseAdmin
        .from('providers')
        .select('*')
        .eq('email', email)
        .single()

      if (providerError || !provider) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        })
        return
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, provider.password_hash || '')

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        })
        return
      }

      // Check if provider is active
      if (!provider.active) {
        res.status(403).json({
          success: false,
          error: 'Account is deactivated. Please contact support.'
        })
        return
      }

      // Sign in with Supabase Auth for session management
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        console.error('Auth sign in error:', authError)
        res.status(401).json({
          success: false,
          error: 'Authentication failed'
        })
        return
      }

      // Generate JWT token
      const token = generateJWT(provider.id, 'provider')

      // Remove sensitive data
      const { password_hash, ...providerData } = provider

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        data: {
          provider: providerData,
          session: authData.session
        }
      })
    } catch (error) {
      console.error('Provider login error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Logout (works for both customers and providers)
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get authorization header
      const authHeader = req.headers.authorization
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Verify and decode token to get user ID
        try {
          const decoded = jwt.verify(token, jwtSecret) as { userId: string }
          
          // Sign out from Supabase
          await supabaseAdmin.auth.admin.signOut(decoded.userId)
        } catch (error) {
          // Token might be invalid, but we still return success for logout
          console.error('Token verification error during logout:', error)
        }
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      })
    } catch (error) {
      console.error('Logout error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'No token provided'
        })
        return
      }

      const token = authHeader.substring(7)
      
      try {
        const decoded = jwt.verify(token, jwtSecret) as { userId: string, role: string }
        
        // Generate new token
        const newToken = generateJWT(decoded.userId, decoded.role as 'customer' | 'provider')
        
        res.status(200).json({
          success: true,
          message: 'Token refreshed successfully',
          token: newToken
        })
      } catch (error) {
        res.status(401).json({
          success: false,
          error: 'Invalid token'
        })
      }
    } catch (error) {
      console.error('Refresh token error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}

// Export individual handlers for use in routes
export const {
  customerSendOTP,
  customerVerifyOTP,
  providerSignup,
  providerLogin,
  logout,
  refreshToken
} = AuthController