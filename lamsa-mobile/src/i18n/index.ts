import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './translations/en.json';
import ar from './translations/ar.json';

const translations = {
  en,
  ar,
};

const i18n = new I18n(translations);

const LANGUAGE_KEY = '@lamsa_language';

export const initializeI18n = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    
    if (savedLanguage) {
      i18n.locale = savedLanguage;
    } else {
      // Default to English
      i18n.locale = 'en';
      await AsyncStorage.setItem(LANGUAGE_KEY, 'en');
    }
  } catch (error) {
    console.error('Error initializing i18n:', error);
    i18n.locale = 'en';
  }
  
  i18n.enableFallback = true;
  i18n.defaultLocale = 'en';
};

export const changeLanguage = async (language: 'ar' | 'en') => {
  i18n.locale = language;
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
};

export const getCurrentLanguage = (): 'ar' | 'en' => {
  return i18n.locale as 'ar' | 'en';
};

export const isRTL = () => {
  return i18n.locale === 'ar';
};

export default i18n;