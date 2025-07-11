import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { lightTheme, darkTheme } from './src/theme';
import AuthStack from './src/navigation/AuthStack';
import MainStack from './src/navigation/MainStack'; // Your main app navigation

// Root navigator that switches between auth and main app
const RootNavigator: React.FC = () => {
  const { isAuthenticated, isInitialized } = useAuth();
  
  if (!isInitialized) {
    // You can show a splash screen here
    return null;
  }
  
  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <RootNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

// Example of how to use the auth screens in your existing App.tsx:
/*
1. Import the necessary components:
   import { Provider as PaperProvider } from 'react-native-paper';
   import { AuthProvider } from './src/contexts/AuthContext';
   import { lightTheme } from './src/theme';
   import PhoneAuthScreen from './src/screens/auth/PhoneAuthScreen';
   import OTPVerifyScreen from './src/screens/auth/OTPVerifyScreen';

2. Wrap your app with PaperProvider and AuthProvider:
   <PaperProvider theme={lightTheme}>
     <AuthProvider>
       <YourApp />
     </AuthProvider>
   </PaperProvider>

3. Add the auth screens to your navigation:
   <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
   <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />

4. Use the useAuth hook to check authentication status:
   const { isAuthenticated, user } = useAuth();
   
   if (!isAuthenticated) {
     return <AuthStack />;
   }
   
   return <MainApp />;
*/