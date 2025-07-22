import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { isRTL } from '../i18n';
import i18n from '../i18n';

// Screens
import SearchScreen from '../screens/main/SearchScreen';
import BookingsScreen from '../screens/main/BookingsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import HomeScreen from '../screens/customer/HomeScreen';
import ProviderDetailScreen from '../screens/customer/ProviderDetailScreen';
import ProviderFiltersScreen from '../screens/customer/ProviderFiltersScreen';
import ServiceDetailsScreen from '../screens/customer/ServiceDetailsScreen';
import BookingFlowScreen from '../screens/customer/BookingFlowScreen';
import DateTimeSelectionScreen from '../screens/customer/DateTimeSelectionScreen';
import BookingConfirmationScreen from '../screens/customer/BookingConfirmationScreen';
import BookingDetailsScreen from '../screens/customer/BookingDetailsScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import PaymentConfirmationScreen from '../screens/customer/PaymentConfirmationScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import EditProfileScreen from '../screens/customer/EditProfileScreen';
import NotificationSettingsScreen from '../screens/customer/NotificationSettingsScreen';
import PaymentMethodsScreen from '../screens/customer/PaymentMethodsScreen';

// Stack Parameter Lists
export type HomeStackParamList = {
  Home: undefined;
  ServiceDetails: { serviceId: string; providerId: string };
  ProviderProfile: { providerId: string };
  ProviderDetail: { providerId: string };
  BookingFlow: { serviceId: string; providerId: string };
  DateTimeSelection: { serviceId: string; providerId: string; bookingData: any };
  BookingConfirmation: { bookingData: any; selectedDate: string; selectedTime: string };
  Checkout: { bookingId: string; amount: number };
  PaymentConfirmation: { success: boolean; bookingId?: string; errorMessage?: string };
};

export type SearchStackParamList = {
  Search: undefined;
  Filters: undefined;
  ServiceDetails: { serviceId: string; providerId: string };
  ProviderProfile: { providerId: string };
  ProviderDetail: { providerId: string };
  ProviderFilters: {
    currentFilters: any;
    onApply: (filters: any) => void;
  };
  BookingFlow: { serviceId: string; providerId: string };
  DateTimeSelection: { serviceId: string; providerId: string; bookingData: any };
  BookingConfirmation: { bookingData: any; selectedDate: string; selectedTime: string };
  Checkout: { bookingId: string; amount: number };
  PaymentConfirmation: { success: boolean; bookingId?: string; errorMessage?: string };
};

export type BookingsStackParamList = {
  Bookings: undefined;
  BookingDetails: { bookingId: string };
  RescheduleBooking: { bookingId: string };
  CancelBooking: { bookingId: string };
  DateTimeSelection: { serviceId: string; providerId: string; bookingData: any; isReschedule: boolean };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  PaymentMethods: undefined;
  PrivacySettings: undefined;
  Support: undefined;
  About: undefined;
};

export type CustomerTabParamList = {
  HomeStack: undefined;
  SearchStack: undefined;
  BookingsStack: undefined;
  ProfileStack: undefined;
};

// Stack Navigators
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Stack Screen Components
const HomeStackScreen = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="Home" component={HomeScreen} />
    <HomeStack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
    <HomeStack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
    <HomeStack.Screen name="BookingFlow" component={BookingFlowScreen} />
    <HomeStack.Screen name="DateTimeSelection" component={DateTimeSelectionScreen} />
    <HomeStack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    <HomeStack.Screen name="Checkout" component={CheckoutScreen} />
    <HomeStack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} />
  </HomeStack.Navigator>
);

const SearchStackScreen = () => (
  <SearchStack.Navigator screenOptions={{ headerShown: false }}>
    <SearchStack.Screen name="Search" component={SearchScreen} />
    <SearchStack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
    <SearchStack.Screen 
      name="ProviderFilters" 
      component={ProviderFiltersScreen}
      options={{
        presentation: 'modal',
        headerShown: false,
      }}
    />
    <SearchStack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
    <SearchStack.Screen name="BookingFlow" component={BookingFlowScreen} />
    <SearchStack.Screen name="DateTimeSelection" component={DateTimeSelectionScreen} />
    <SearchStack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    <SearchStack.Screen name="Checkout" component={CheckoutScreen} />
    <SearchStack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} />
  </SearchStack.Navigator>
);

const BookingsStackScreen = () => (
  <BookingsStack.Navigator screenOptions={{ headerShown: false }}>
    <BookingsStack.Screen name="Bookings" component={BookingsScreen} />
    <BookingsStack.Screen name="BookingDetails" component={BookingDetailsScreen} />
    <BookingsStack.Screen name="DateTimeSelection" component={DateTimeSelectionScreen} />
  </BookingsStack.Navigator>
);

const ProfileStackScreen = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    <ProfileStack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
  </ProfileStack.Navigator>
);

// Tab Navigator
const Tab = createBottomTabNavigator<CustomerTabParamList>();

const CustomerTabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceVariant,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: isRTL() ? 'System' : undefined,
        },
      }}
    >
      <Tab.Screen
        name="HomeStack"
        component={HomeStackScreen}
        options={{
          tabBarLabel: i18n.t('navigation.home'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchStack"
        component={SearchStackScreen}
        options={{
          tabBarLabel: i18n.t('navigation.search'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="magnify" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BookingsStack"
        component={BookingsStackScreen}
        options={{
          tabBarLabel: i18n.t('navigation.bookings'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: i18n.t('navigation.profile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default CustomerTabNavigator;
