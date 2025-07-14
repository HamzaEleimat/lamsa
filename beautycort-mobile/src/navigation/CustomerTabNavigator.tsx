import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { isRTL } from '../i18n';
import i18n from '../i18n';

// Screens
import SearchScreen from '../screens/customer/SearchScreen';
import BookingsScreen from '../screens/customer/BookingsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import HomeScreen from '../screens/customer/HomeScreen';
import ProviderDetailScreen from '../screens/customer/ProviderDetailScreen';
import ProviderFiltersScreen from '../screens/customer/ProviderFiltersScreen';

// Stack Parameter Lists
export type HomeStackParamList = {
  Home: undefined;
  ServiceDetails: { serviceId: string };
  ProviderProfile: { providerId: string };
  ProviderDetail: { providerId: string };
  BookingFlow: { serviceId: string; providerId: string };
};

export type SearchStackParamList = {
  Search: undefined;
  Filters: undefined;
  ServiceDetails: { serviceId: string };
  ProviderProfile: { providerId: string };
  ProviderDetail: { providerId: string };
  ProviderFilters: {
    currentFilters: any;
    onApply: (filters: any) => void;
  };
};

export type BookingsStackParamList = {
  Bookings: undefined;
  BookingDetails: { bookingId: string };
  RescheduleBooking: { bookingId: string };
  CancelBooking: { bookingId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  Support: undefined;
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
    {/* Add other home stack screens here */}
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
    {/* Add other search stack screens here */}
  </SearchStack.Navigator>
);

const BookingsStackScreen = () => (
  <BookingsStack.Navigator screenOptions={{ headerShown: false }}>
    <BookingsStack.Screen name="Bookings" component={BookingsScreen} />
    {/* Add other bookings stack screens here */}
  </BookingsStack.Navigator>
);

const ProfileStackScreen = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    {/* Add other profile stack screens here */}
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
