import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { colors } from '../constants/colors';

// Screens
import ProviderDashboardScreen from '../screens/provider/ProviderDashboardScreen';
import BookingListScreen from '../screens/provider/BookingListScreen';
import ServiceListScreen from '../screens/provider/ServiceListScreen';
import ProfileScreen from '../screens/provider/ProfileScreen';
import MoreScreen from '../screens/provider/MoreScreen';

const Tab = createBottomTabNavigator();

export default function ProviderTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Bookings':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Services':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'More':
              iconName = focused ? 'menu' : 'menu-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={ProviderDashboardScreen}
        options={{ tabBarLabel: t('dashboard') }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingListScreen}
        options={{ tabBarLabel: t('bookings') }}
      />
      <Tab.Screen
        name="Services"
        component={ServiceListScreen}
        options={{ tabBarLabel: t('services') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t('profile') }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ tabBarLabel: t('more') }}
      />
    </Tab.Navigator>
  );
}