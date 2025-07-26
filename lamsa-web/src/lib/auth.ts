
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const authApi = {
  // Provider phone authentication
  async sendProviderOTP(phone: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/provider/send-otp`, {
        method: 'POST',
        credentials: 'include', // Include cookies for all requests
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send OTP',
      };
    }
  },

  async verifyProviderOTP(phone: string, otp: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/provider/verify-otp`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify OTP');
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to verify OTP',
      };
    }
  },

  // Provider email/password authentication
  async providerLogin(email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/provider/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Note: Tokens should be set as HttpOnly cookies by the server
      // Not storing them in localStorage to prevent XSS attacks
      // The server should set cookies with:
      // res.cookie('authToken', token, { httpOnly: true, secure: true, sameSite: 'strict' })

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  },

  // MFA verification
  async verifyMFA(providerId: string, mfaToken: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/provider/login/mfa`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId, mfaToken }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'MFA verification failed');
      }

      // Note: Tokens should be set as HttpOnly cookies by the server
      // Not storing them in localStorage to prevent XSS attacks

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'MFA verification failed',
      };
    }
  },

  // Get current user
  async getCurrentUser(): Promise<ApiResponse> {
    try {
      // Cookies will be sent automatically with credentials: 'include'
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include', // Include cookies in the request
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          // Cookies will be cleared by the server
        }
        throw new Error(data.message || 'Failed to get user');
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get user',
      };
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Cookies will be cleared by the server
  },

  // Refresh token
  async refreshToken(): Promise<ApiResponse> {
    try {
      // Server should handle refresh using HttpOnly cookies
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to refresh token');
      }

      // New tokens will be set as cookies by the server

      return data;
    } catch (error: any) {
      // Cookies will be cleared by the server on refresh failure
      
      return {
        success: false,
        error: error.message || 'Failed to refresh token',
      };
    }
  },
};