import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LanguageToggleButton from '../components/LanguageToggleButton';
import { useTranslation } from '../hooks/useTranslation';
import { colors } from '../constants/colors';

// Tab Navigator
import CustomerTabNavigator from './CustomerTabNavigator';

// Stack Screens (import additional customer screens as needed)
import BookingDetailsScreen from '../screens/customer/BookingDetailsScreen';
import BookingConfirmationScreen from '../screens/customer/BookingConfirmationScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import ProviderDetailScreen from '../screens/customer/ProviderDetailScreen';
import ServiceDetailsScreen from '../screens/customer/ServiceDetailsScreen';

export type CustomerStackParamList = {
  CustomerTabs: undefined;
  BookingDetails: { bookingId: string };
  BookingConfirmation: { bookingId: string };
  Checkout: undefined;
  ProviderDetail: { providerId: string };
  ServiceDetails: { serviceId: string };
};

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export default function CustomerStackNavigator() {
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
        name="CustomerTabs" 
        component={CustomerTabNavigator}
        options={{
          headerShown: false, // Hide header for tab navigator
        }}
      />
      <Stack.Screen 
        name="BookingDetails" 
        component={BookingDetailsScreen}
        options={{
          title: t('bookingDetails.title'),
        }}
      />
      <Stack.Screen 
        name="BookingConfirmation" 
        component={BookingConfirmationScreen}
        options={{
          title: t('bookingConfirmation.title'),
        }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{
          title: t('checkout.title'),
        }}
      />
      <Stack.Screen 
        name="ProviderDetail" 
        component={ProviderDetailScreen}
        options={{
          title: t('providerDetail.title'),
        }}
      />
      <Stack.Screen 
        name="ServiceDetails" 
        component={ServiceDetailsScreen}
        options={{
          title: t('serviceDetails.title'),
        }}
      />
    </Stack.Navigator>
  );
}