import React, { useEffect } from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { isRTL } from '../i18n';
import { UserRole } from '../types';
import AuthNavigator from './AuthNavigator';
import CustomerTabNavigator from './CustomerTabNavigator';
import ProviderTabNavigator from './ProviderTabNavigator';

export type RootStackParamList = {
  Auth: undefined;
  CustomerMain: undefined;
  ProviderMain: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    // Configure RTL support
    I18nManager.forceRTL(isRTL());
    I18nManager.allowRTL(true);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated && user ? (
          user.role === UserRole.PROVIDER ? (
            <Stack.Screen name="ProviderMain" component={ProviderTabNavigator} />
          ) : (
            <Stack.Screen name="CustomerMain" component={CustomerTabNavigator} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default RootNavigator;