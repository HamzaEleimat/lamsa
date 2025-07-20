import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { biometricAuth } from '../services/auth/biometricAuth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = 'lamsa_auth_secure';
const USER_KEY = 'lamsa_user_secure';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check biometric status
      const biometricEnabled = await biometricAuth.isEnabled();
      setIsBiometricEnabled(biometricEnabled);

      // If biometric is enabled, authenticate before loading user
      if (biometricEnabled) {
        const authResult = await biometricAuth.authenticateForAppAccess();
        if (!authResult.success) {
          // User failed biometric auth, don't load user data
          setIsLoading(false);
          return;
        }
      }

      // Load user after successful auth or if biometric is disabled
      await loadUser();
    } catch (error) {
      console.error('Error initializing auth:', error);
      setIsLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      let storedUser: string | null = null;
      
      // Try SecureStore first (for native platforms)
      try {
        storedUser = await SecureStore.getItemAsync(USER_KEY);
      } catch (error) {
        // Fallback to AsyncStorage for web compatibility
        storedUser = await AsyncStorage.getItem(USER_KEY);
      }
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (userData: User) => {
    try {
      const userString = JSON.stringify(userData);
      
      // Try SecureStore first (for native platforms)
      try {
        await SecureStore.setItemAsync(USER_KEY, userString);
        await SecureStore.setItemAsync(AUTH_KEY, 'true');
      } catch (error) {
        // Fallback to AsyncStorage for web compatibility
        await AsyncStorage.setItem(USER_KEY, userString);
        await AsyncStorage.setItem(AUTH_KEY, 'true');
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Try SecureStore first (for native platforms)
      try {
        await SecureStore.deleteItemAsync(USER_KEY);
        await SecureStore.deleteItemAsync(AUTH_KEY);
      } catch (error) {
        // Fallback to AsyncStorage for web compatibility
        await AsyncStorage.multiRemove([USER_KEY, AUTH_KEY]);
      }
      
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const enableBiometric = async (): Promise<boolean> => {
    try {
      const result = await biometricAuth.enable();
      if (result.success) {
        setIsBiometricEnabled(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  };

  const disableBiometric = async (): Promise<void> => {
    try {
      await biometricAuth.disable();
      setIsBiometricEnabled(false);
    } catch (error) {
      console.error('Error disabling biometric:', error);
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      const result = await biometricAuth.authenticate('Authenticate to access Lamsa');
      return result.success;
    } catch (error) {
      console.error('Error with biometric authentication:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isBiometricEnabled,
    signIn,
    signOut,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};