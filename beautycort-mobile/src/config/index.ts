import Constants from 'expo-constants';

// Get the API URL from environment variables or use default
const getApiUrl = () => {
  // In production, use the production API URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.beautycort.com';
  }
  
  // In development, use the local API URL
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For iOS simulator or physical device, use your machine's IP address
  const localhost = Constants.manifest?.debuggerHost?.split(':').shift() || 'localhost';
  return `http://${localhost}:3000`;
};

export const API_URL = getApiUrl();

// Other configuration constants
export const config = {
  // App version
  version: Constants.manifest?.version || '1.0.0',
  
  // Default values
  defaultLanguage: 'ar',
  defaultCurrency: 'JOD',
  
  // Pagination
  defaultPageSize: 20,
  
  // Image upload
  maxImageSize: 10 * 1024 * 1024, // 10MB
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/jpg'],
  
  // Service defaults
  defaultServiceDuration: 30, // minutes
  defaultPreparationTime: 0,
  defaultCleanupTime: 0,
  defaultMaxAdvanceBookingDays: 30,
  defaultMinAdvanceBookingHours: 2,
  
  // Map defaults for Jordan
  defaultMapRegion: {
    latitude: 31.9454,
    longitude: 35.9284,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  },
  
  // Storage keys
  storageKeys: {
    authToken: 'authToken',
    providerId: 'providerId',
    userLanguage: 'userLanguage',
    onboardingCompleted: 'onboardingCompleted',
  },
};