import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LanguageToggleButton from '../components/LanguageToggleButton';
import { useTranslation } from '../hooks/useTranslation';
import { colors } from '../constants/colors';
import PhoneAuthScreen from '../screens/auth/PhoneAuthScreen';
import OTPVerifyScreen from '../screens/auth/OTPVerifyScreen';

export type AuthStackParamList = {
  PhoneAuth: undefined;
  OTPVerify: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerRight: () => <LanguageToggleButton style={{ marginRight: 10 }} />,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="PhoneAuth" 
        component={PhoneAuthScreen}
        options={{
          title: t('auth.phoneAuth'),
          headerShown: false, // Hide header on first auth screen for cleaner look
        }}
      />
      <Stack.Screen 
        name="OTPVerify" 
        component={OTPVerifyScreen}
        options={{
          title: t('auth.verifyOTP'),
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;