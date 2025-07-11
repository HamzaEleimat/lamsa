import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhoneAuthScreen from '../screens/auth/PhoneAuthScreen';
import OTPVerifyScreen from '../screens/auth/OTPVerifyScreen';

export type AuthStackParamList = {
  PhoneAuth: undefined;
  OTPVerify: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="PhoneAuth" 
        component={PhoneAuthScreen}
        options={{
          title: 'Phone Authentication',
        }}
      />
      <Stack.Screen 
        name="OTPVerify" 
        component={OTPVerifyScreen}
        options={{
          title: 'Verify OTP',
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;