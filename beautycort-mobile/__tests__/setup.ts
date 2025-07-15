import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';
import { NativeModules } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
  };
});

// Mock Expo modules
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: {
      latitude: 32.0728,
      longitude: 36.0881,
      accuracy: 5,
    },
  })),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({
    cancelled: false,
    assets: [{ uri: 'mock://image.jpg' }],
  })),
  launchCameraAsync: jest.fn(() => Promise.resolve({
    cancelled: false,
    assets: [{ uri: 'mock://photo.jpg' }],
  })),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'mock-token' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: {
    MAX: 5,
  },
  DEFAULT_ACTION_IDENTIFIER: 'default',
}));

// Mock React Native modules
NativeModules.RNCNetInfo = {
  getCurrentState: jest.fn(() => Promise.resolve()),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

NativeModules.PlatformConstants = NativeModules.PlatformConstants || {
  forceTouchAvailable: false,
};

// Mock date-fns locales
jest.mock('date-fns/locale', () => ({
  ar: {},
  enUS: {},
}));

// Mock i18n
jest.mock('../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return key.replace(/{{(\w+)}}/g, (_, param) => params[param] || '');
      }
      return key;
    },
    i18n: {
      language: 'ar',
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock SafeAreaProvider
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaConsumer: ({ children }: any) => children(inset),
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => inset,
  };
});

// Global test configuration
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

// Silence console warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactNative.NativeModules.RNCSafeAreaContext')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});