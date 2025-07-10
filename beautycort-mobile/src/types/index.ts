// User type
export interface User {
  id: string;
  phone: string;
  name: string;
  email: string;
  languagePreference: string;
  createdAt: Date;
}

// Provider type
export interface Provider {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  location: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  totalReviews: number;
  verified: boolean;
  licenseNumber: string;
}

// Service type
export interface Service {
  id: string;
  providerId: string;
  name: {
    ar: string;
    en: string;
  };
  description: string;
  price: number;
  durationInMinutes: number;
  category: ServiceCategory;
}

// Booking type
export interface Booking {
  id: string;
  userId: string;
  providerId: string;
  serviceId: string;
  date: Date;
  time: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
}

// Service Category enum
export enum ServiceCategory {
  HAIR = 'HAIR',
  NAILS = 'NAILS',
  MAKEUP = 'MAKEUP',
  SPA = 'SPA',
  AESTHETIC = 'AESTHETIC'
}

// Booking Status enum
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Payment Method enum
export enum PaymentMethod {
  ONLINE = 'ONLINE',
  ON_SITE = 'ON_SITE'
}