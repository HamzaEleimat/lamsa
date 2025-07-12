import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLanguage, changeLanguage } from '../i18n';

export type UserType = 'customer' | 'provider';
export type ThemeMode = 'light' | 'dark' | 'system';

interface AppStateContextType {
  // Theme
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  
  // Language
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => Promise<void>;
  
  // Connectivity
  isConnected: boolean;
  
  // User Type
  userType: UserType;
  setUserType: (type: UserType) => Promise<void>;
  
  // App State
  isAppReady: boolean;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

const STORAGE_KEYS = {
  THEME_MODE: '@beautycort_theme_mode',
  USER_TYPE: '@beautycort_user_type',
  ONBOARDING_COMPLETED: '@beautycort_onboarding_completed',
} as const;

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [language, setLanguageState] = useState<'ar' | 'en'>('ar');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [userType, setUserTypeState] = useState<UserType>('customer');
  const [isAppReady, setIsAppReady] = useState<boolean>(false);
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState<boolean>(false);

  useEffect(() => {
    initializeAppState();
    setupNetworkListener();
  }, []);

  const initializeAppState = async () => {
    try {
      // Load saved preferences
      const [savedThemeMode, savedUserType, savedOnboarding] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.USER_TYPE),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED),
      ]);

      if (savedThemeMode) {
        setThemeModeState(savedThemeMode as ThemeMode);
      }

      if (savedUserType) {
        setUserTypeState(savedUserType as UserType);
      }

      if (savedOnboarding === 'true') {
        setHasCompletedOnboardingState(true);
      }

      // Set current language from i18n
      setLanguageState(getCurrentLanguage());

      setIsAppReady(true);
    } catch (error) {
      console.error('Error initializing app state:', error);
      setIsAppReady(true); // Continue with defaults
    }
  };

  const setupNetworkListener = () => {
    // TODO: Implement network connectivity monitoring
    // For now, assume always connected
    setIsConnected(true);
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  const setLanguage = async (lang: 'ar' | 'en') => {
    try {
      await changeLanguage(lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const setUserType = async (type: UserType) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TYPE, type);
      setUserTypeState(type);
    } catch (error) {
      console.error('Error saving user type:', error);
    }
  };

  const setHasCompletedOnboarding = async (completed: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed.toString());
      setHasCompletedOnboardingState(completed);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const value: AppStateContextType = {
    themeMode,
    setThemeMode,
    language,
    setLanguage,
    isConnected,
    userType,
    setUserType,
    isAppReady,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
