import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LanguageToggleButton from '../components/LanguageToggleButton';
import { useTranslation } from '../hooks/useTranslation';
import { colors } from '../constants/colors';

// Tab Navigator
import ProviderTabNavigator from './ProviderTabNavigator';

// Stack Screens
import ProviderBookingDetailsScreen from '../screens/provider/ProviderBookingDetailsScreen';
import CreateBookingScreen from '../screens/provider/CreateBookingScreen';

export type ProviderStackParamList = {
  ProviderTabs: undefined;
  BookingDetails: { bookingId: string };
  CreateBooking: undefined;
};

const Stack = createNativeStackNavigator<ProviderStackParamList>();

export default function ProviderStackNavigator() {
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
      }}
    >
      <Stack.Screen 
        name="ProviderTabs" 
        component={ProviderTabNavigator}
        options={{
          headerShown: false, // Hide header for tab navigator
        }}
      />
      <Stack.Screen 
        name="BookingDetails" 
        component={ProviderBookingDetailsScreen}
        options={{
          title: t('bookingDetails.title'),
        }}
      />
      <Stack.Screen 
        name="CreateBooking" 
        component={CreateBookingScreen}
        options={{
          title: t('createBooking.title'),
        }}
      />
    </Stack.Navigator>
  );
}