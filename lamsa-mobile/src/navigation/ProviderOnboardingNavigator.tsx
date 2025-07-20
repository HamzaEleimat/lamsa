/**
 * @file ProviderOnboardingNavigator.tsx
 * @description Stack navigator for provider onboarding flow with 7 steps
 * @author Lamsa Development Team
 * @date Created: 2025-01-14
 * @copyright Lamsa 2025
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BusinessInformationScreen from '../screens/auth/onboarding/BusinessInformationScreen';
import LocationSetupScreen from '../screens/auth/onboarding/LocationSetupScreen';
import ServiceCategoriesScreen from '../screens/auth/onboarding/ServiceCategoriesScreen';
import WorkingHoursScreen from '../screens/auth/onboarding/WorkingHoursScreen';
import LicenseVerificationScreen from '../screens/auth/onboarding/LicenseVerificationScreen';
import ServiceCreationTutorialScreen from '../screens/auth/onboarding/ServiceCreationTutorialScreen';
import CompletionScreen from '../screens/auth/onboarding/CompletionScreen';

export type ProviderOnboardingStackParamList = {
  BusinessInformation: { phoneNumber: string };
  LocationSetup: { phoneNumber: string };
  ServiceCategories: { phoneNumber: string };
  WorkingHours: { phoneNumber: string };
  LicenseVerification: { phoneNumber: string };
  ServiceCreationTutorial: { phoneNumber: string };
  Completion: { phoneNumber: string };
};

const Stack = createNativeStackNavigator<ProviderOnboardingStackParamList>();

interface ProviderOnboardingNavigatorProps {
  route: {
    params: {
      userData: {
        phone: string;
        userType: 'provider';
      };
    };
  };
}

const ProviderOnboardingNavigator: React.FC<ProviderOnboardingNavigatorProps> = ({ route }) => {
  const { userData } = route.params;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="BusinessInformation"
    >
      <Stack.Screen 
        name="BusinessInformation" 
        component={BusinessInformationScreen}
        initialParams={{ phoneNumber: userData.phone }}
      />
      <Stack.Screen 
        name="LocationSetup" 
        component={LocationSetupScreen}
        initialParams={{ phoneNumber: userData.phone }}
      />
      <Stack.Screen 
        name="ServiceCategories" 
        component={ServiceCategoriesScreen}
        initialParams={{ phoneNumber: userData.phone }}
      />
      <Stack.Screen 
        name="WorkingHours" 
        component={WorkingHoursScreen}
        initialParams={{ phoneNumber: userData.phone }}
      />
      <Stack.Screen 
        name="LicenseVerification" 
        component={LicenseVerificationScreen}
        initialParams={{ phoneNumber: userData.phone }}
      />
      <Stack.Screen 
        name="ServiceCreationTutorial" 
        component={ServiceCreationTutorialScreen}
        initialParams={{ phoneNumber: userData.phone }}
      />
      <Stack.Screen 
        name="Completion" 
        component={CompletionScreen}
        initialParams={{ phoneNumber: userData.phone }}
      />
    </Stack.Navigator>
  );
};

export default ProviderOnboardingNavigator;