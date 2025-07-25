import React, { useEffect, useRef } from 'react';
import { BackHandler, Alert } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';
import { isAndroid, isRTL } from '@utils/platform';

interface PlatformNavigationContainerProps {
  children: React.ReactNode;
  onReady?: () => void;
  onStateChange?: (state: any) => void;
  enableBackHandler?: boolean;
  exitAppOnBackPress?: boolean;
  confirmExitMessage?: {
    title: string;
    message: string;
    cancelText: string;
    confirmText: string;
  };
}

export default function PlatformNavigationContainer({
  children,
  onReady,
  onStateChange,
  enableBackHandler = true,
  exitAppOnBackPress = true,
  confirmExitMessage,
}: PlatformNavigationContainerProps) {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const theme = useTheme();
  const lastBackPressed = useRef<number>(0);

  useEffect(() => {
    if (!isAndroid || !enableBackHandler) return;

    const backAction = () => {
      const navigation = navigationRef.current;
      
      if (!navigation) return false;

      // Check if we can go back in navigation
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }

      // Handle exit app scenario
      if (exitAppOnBackPress) {
        const now = Date.now();
        
        if (confirmExitMessage) {
          // Show confirmation dialog
          Alert.alert(
            confirmExitMessage.title || (isRTL ? 'الخروج من التطبيق' : 'Exit App'),
            confirmExitMessage.message || (isRTL ? 'هل تريد الخروج من التطبيق؟' : 'Do you want to exit the app?'),
            [
              {
                text: confirmExitMessage.cancelText || (isRTL ? 'إلغاء' : 'Cancel'),
                onPress: () => null,
                style: 'cancel',
              },
              {
                text: confirmExitMessage.confirmText || (isRTL ? 'خروج' : 'Exit'),
                onPress: () => BackHandler.exitApp(),
              },
            ],
            { cancelable: false }
          );
          return true;
        } else {
          // Double tap to exit logic
          if (now - lastBackPressed.current < 2000) {
            BackHandler.exitApp();
            return true;
          } else {
            lastBackPressed.current = now;
            // You might want to show a toast here
            // Toast.show('Press back again to exit');
            return true;
          }
        }
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [enableBackHandler, exitAppOnBackPress, confirmExitMessage]);

  const defaultTheme = {
    dark: theme.dark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onBackground,
      border: theme.colors.surfaceVariant,
      notification: theme.colors.error,
    },
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={defaultTheme}
      onReady={onReady}
      onStateChange={onStateChange}
    >
      {children}
    </NavigationContainer>
  );
}