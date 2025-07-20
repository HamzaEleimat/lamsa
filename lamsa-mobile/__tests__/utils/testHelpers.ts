import { render, RenderOptions } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children);
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

// Re-export everything
export * from '@testing-library/react-native';
export { customRender as render };

// Mock data helpers
export const mockAnalyticsData = {
  totalBookings: 150,
  completedBookings: 140,
  cancelledBookings: 8,
  noShowBookings: 2,
  totalRevenue: 4200.0,
  averageRating: 4.8,
  repeatCustomers: 35,
  newCustomers: 45,
};

export const mockProviderData = {
  id: 'test-provider-123',
  business_name_ar: 'صالون الجمال',
  business_name_en: 'Beauty Salon',
  owner_name: 'Test Owner',
  phone: '+962791234567',
  email: 'test@example.com',
  rating: 4.5,
  total_reviews: 100,
  verified: true,
};

// Async Storage Mock Setup
export const setupAsyncStorageMocks = () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });
};