/// <reference path="./src/types/theme.d.ts" />
import React, { useEffect, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, ThemeContext } from './src/contexts/ThemeContext';
import { AppStateProvider } from './src/contexts/AppStateContext';
import RootNavigator from './src/navigation/RootNavigator';
import { initializeI18n } from './src/i18n';
import { lightTheme, darkTheme } from './src/theme/index';
import ErrorBoundary from './src/components/base/ErrorBoundary';
import {
  useFonts as useCormorantGaramond,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  useFonts as useMartelSans,
  MartelSans_400Regular,
  MartelSans_700Bold,
} from '@expo-google-fonts/martel-sans';

function AppContent() {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AppStateProvider>
            <AuthProvider>
              <RootNavigator />
              <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            </AuthProvider>
          </AppStateProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  const [fontsLoaded] = useCormorantGaramond({
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
  });

  const [martelSansLoaded] = useMartelSans({
    MartelSans_400Regular,
    MartelSans_700Bold,
  });

  useEffect(() => {
    initializeI18n();
  }, []);

  if (!fontsLoaded || !martelSansLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
