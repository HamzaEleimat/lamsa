import { MD3Theme } from 'react-native-paper';

declare global {
  namespace ReactNativePaper {
    interface MD3Colors {
      success: string;
      warning: string;
      info: string;
    }
  }
}

export {};