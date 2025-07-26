'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth';

interface User {
  id: string;
  type: 'provider' | 'customer';
  profile: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresMFA?: boolean; providerId?: string }>;
  loginWithPhone: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  verifyMFA: (providerId: string, mfaToken: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authApi.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        // Try to refresh token
        const refreshResponse = await authApi.refreshToken();
        if (refreshResponse.success) {
          const userResponse = await authApi.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            setUser(userResponse.data);
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.providerLogin(email, password);
      
      if (response.success) {
        if (response.data?.requiresMFA) {
          // Return MFA required status
          return {
            success: true,
            requiresMFA: true,
            providerId: response.data.providerId,
          };
        } else if (response.data?.token) {
          // Login successful, get user data
          await checkAuth();
          return { success: true };
        }
      }
      
      return {
        success: false,
        error: response.error || response.message || 'Login failed',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  };

  const loginWithPhone = async (phone: string, otp: string) => {
    try {
      const response = await authApi.verifyProviderOTP(phone, otp);
      
      if (response.success && response.data?.token) {
        await checkAuth();
        return { success: true };
      }
      
      return {
        success: false,
        error: response.error || response.message || 'Verification failed',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Verification failed',
      };
    }
  };

  const verifyMFA = async (providerId: string, mfaToken: string) => {
    try {
      const response = await authApi.verifyMFA(providerId, mfaToken);
      
      if (response.success && response.data?.token) {
        await checkAuth();
        return { success: true };
      }
      
      return {
        success: false,
        error: response.error || response.message || 'MFA verification failed',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'MFA verification failed',
      };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      router.push('/provider/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithPhone,
        verifyMFA,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}