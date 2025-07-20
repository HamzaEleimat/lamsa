import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PhoneAuthScreen from '../screens/auth/PhoneAuthScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import UserTypeSelectionScreen from '../screens/auth/UserTypeSelectionScreen';
import ProviderOnboardingNavigator from './ProviderOnboardingNavigator';

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneAuth: undefined;
  OTPVerification: { phoneNumber: string };
  UserTypeSelection: { phoneNumber: string };
  CustomerOnboarding: { userData: { phone: string; userType: 'customer' } };
  ProviderOnboarding: { userData: { phone: string; userType: 'provider' } };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="UserTypeSelection" component={UserTypeSelectionScreen} />
      <Stack.Screen name="ProviderOnboarding" component={ProviderOnboardingNavigator} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;