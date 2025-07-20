import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth, AuthProvider, AuthGuard, ProviderGuard } from '../contexts/AuthContext';

// Import your screens (these would be your actual screens)
// import LoginScreen from '../screens/auth/LoginScreen';
// import HomeScreen from '../screens/main/HomeScreen';
// import ProfileScreen from '../screens/main/ProfileScreen';
// import BookingsScreen from '../screens/main/BookingsScreen';

// For demo purposes, using placeholder components
const LoginScreen = () => <View><Text>Login Screen</Text></View>;
const HomeScreen = () => <View><Text>Home Screen</Text></View>;
const ProfileScreen = () => <View><Text>Profile Screen</Text></View>;
const BookingsScreen = () => <View><Text>Bookings Screen</Text></View>;
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#E91E63" />
  </View>
);

// Auth Stack Navigator
const AuthStack = createNativeStackNavigator();
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      {/* Add other auth screens here like Register, ForgotPassword, etc */}
    </AuthStack.Navigator>
  );
};

// Main Tab Navigator
const Tab = createBottomTabNavigator();
const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#E91E63',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Root Navigator with Auth State
export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();

  // Show loading screen while checking auth state
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// App.tsx example showing how to wrap the app with AuthProvider
export const AppExample: React.FC = () => {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
};

/**
 * Advanced example with role-based navigation
 */
export const RoleBasedNavigator: React.FC = () => {
  const { isAuthenticated, user, isInitialized } = useAuth();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : user?.role === 'provider' ? (
        <ProviderNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
};

// Provider-specific navigator
const ProviderStack = createNativeStackNavigator();
const ProviderNavigator = () => {
  return (
    <ProviderStack.Navigator>
      <ProviderStack.Screen name="Dashboard" component={DashboardScreen} />
      <ProviderStack.Screen name="Services" component={ServicesScreen} />
      <ProviderStack.Screen name="Bookings" component={ProviderBookingsScreen} />
      <ProviderStack.Screen name="Profile" component={ProviderProfileScreen} />
    </ProviderStack.Navigator>
  );
};

// Customer-specific navigator
const CustomerNavigator = () => {
  return <MainNavigator />;
};

// Placeholder screens for provider
const DashboardScreen = () => <View><Text>Provider Dashboard</Text></View>;
const ServicesScreen = () => <View><Text>Manage Services</Text></View>;
const ProviderBookingsScreen = () => <View><Text>Provider Bookings</Text></View>;
const ProviderProfileScreen = () => <View><Text>Provider Profile</Text></View>;

// Protected Screen example
export const ProtectedScreenExample: React.FC = () => {
  const { user } = useAuth();

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Welcome, {user?.name || 'User'}!</Text>
      <Text>Phone: {user?.phone}</Text>
      <Text>Role: {user?.role}</Text>
      {user?.role === 'provider' && (
        <Text>Business: {(user as any).provider_profile?.business_name_en}</Text>
      )}
    </View>
  );
};

// Using AuthGuard in a component example

export const GuardedComponentExample: React.FC = () => {
  return (
    <View>
      {/* This content is only shown to authenticated users */}
      <AuthGuard fallback={<Text>Please log in to continue</Text>}>
        <Text>You are logged in!</Text>
      </AuthGuard>

      {/* This content is only shown to providers */}
      <ProviderGuard fallback={<Text>Provider access only</Text>}>
        <Text>Provider Dashboard</Text>
      </ProviderGuard>
    </View>
  );
};

export default RootNavigator;