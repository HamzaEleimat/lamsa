export type PlatformOS = 'ios' | 'android' | 'web';

export interface PlatformInfo {
  os: PlatformOS;
  version: string | number;
  isTablet: boolean;
  isPhone: boolean;
  isRTL: boolean;
  hasNotch: boolean;
}

export interface PlatformStyles {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
  boxShadow?: string;
}

export type PlatformColor = {
  ios: string;
  android: string;
  default: string;
};

export type PlatformValue<T> = {
  ios?: T;
  android?: T;
  web?: T;
  default?: T;
};