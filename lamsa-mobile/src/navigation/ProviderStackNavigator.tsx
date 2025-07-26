import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="ProviderTabs" 
        component={ProviderTabNavigator} 
      />
      <Stack.Screen 
        name="BookingDetails" 
        component={ProviderBookingDetailsScreen} 
      />
      <Stack.Screen 
        name="CreateBooking" 
        component={CreateBookingScreen} 
      />
    </Stack.Navigator>
  );
}