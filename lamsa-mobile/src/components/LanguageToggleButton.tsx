import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, I18nManager, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { getCurrentLanguage, changeLanguage } from '../i18n';
import { colors } from '../constants/colors';

interface LanguageToggleButtonProps {
  onLanguageChange?: (language: 'ar' | 'en') => void;
  style?: any;
  textStyle?: any;
}

const LanguageToggleButton: React.FC<LanguageToggleButtonProps> = ({
  onLanguageChange,
  style,
  textStyle,
}) => {
  const theme = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>(getCurrentLanguage());

  useEffect(() => {
    // Update RTL setting on mount
    I18nManager.forceRTL(currentLanguage === 'ar');
  }, []);

  const handleLanguageToggle = async () => {
    const newLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    
    // Change language
    await changeLanguage(newLanguage);
    setCurrentLanguage(newLanguage);
    
    // Update RTL
    const isRTL = newLanguage === 'ar';
    I18nManager.forceRTL(isRTL);
    
    // Call callback if provided
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
    
    // Show alert about app restart
    Alert.alert(
      newLanguage === 'ar' ? 'تغيير اللغة' : 'Language Change',
      newLanguage === 'ar' 
        ? 'سيتم إعادة تشغيل التطبيق لتطبيق تغيير اللغة'
        : 'The app will restart to apply the language change',
      [
        {
          text: newLanguage === 'ar' ? 'موافق' : 'OK',
          onPress: async () => {
            try {
              // In development mode or when expo-updates is not available
              if (__DEV__) {
                console.warn('App restart required. Please restart the app manually to see RTL changes.');
                Alert.alert(
                  newLanguage === 'ar' ? 'إعادة التشغيل مطلوبة' : 'Restart Required',
                  newLanguage === 'ar' 
                    ? 'يرجى إعادة تشغيل التطبيق يدوياً لرؤية التغييرات'
                    : 'Please restart the app manually to see the changes',
                  [{ text: newLanguage === 'ar' ? 'حسناً' : 'OK' }]
                );
              } else {
                // In production, try to use expo-updates if available
                try {
                  const Updates = await import('expo-updates');
                  if (Updates.reloadAsync) {
                    await Updates.reloadAsync();
                  } else {
                    throw new Error('Updates module not available');
                  }
                } catch (updateError) {
                  // If expo-updates is not available, show manual restart message
                  Alert.alert(
                    newLanguage === 'ar' ? 'إعادة التشغيل مطلوبة' : 'Restart Required',
                    newLanguage === 'ar' 
                      ? 'يرجى إعادة تشغيل التطبيق لتطبيق تغيير اللغة'
                      : 'Please restart the app to apply the language change',
                    [{ text: newLanguage === 'ar' ? 'حسناً' : 'OK' }]
                  );
                }
              }
            } catch (error) {
              console.error('Error handling language change:', error);
              Alert.alert(
                'Error',
                'Language changed. Please restart the app manually.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleLanguageToggle}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: theme.colors.primary }, textStyle]}>
        {currentLanguage === 'ar' ? 'EN' : 'AR'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.lightPrimary,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LanguageToggleButton;