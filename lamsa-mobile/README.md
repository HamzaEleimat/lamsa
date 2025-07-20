# Lamsa Mobile App

A mobile-first beauty booking platform for the Jordan market, built with React Native and Expo.

## Features

- 🌍 **Bilingual Support** - Arabic (RTL) and English
- 📱 **Mobile-First Design** - Optimized for iOS and Android
- 🔐 **Phone Authentication** - OTP-based login system
- 📍 **Location Services** - Find nearby beauty providers
- 📅 **Smart Booking** - Real-time availability and scheduling
- 💳 **Payment Integration** - Secure payment processing
- ⭐ **Reviews & Ratings** - Customer feedback system
- 🔔 **Push Notifications** - Booking updates and reminders
- 📊 **Provider Dashboard** - Manage services and bookings

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation 6
- **State Management**: Context API + AsyncStorage
- **UI Components**: React Native Paper
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Maps**: React Native Maps
- **Internationalization**: i18n-js
- **Charts**: React Native Chart Kit

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development)
- Lamsa API running on port 3001

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm start
```

## Development

### Running the App

```bash
# Start Expo development server
npm start

# Run on Android device/emulator
npm run android

# Run on iOS simulator
npm run ios

# Run in web browser
npm run web
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Project Structure

```
lamsa-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── booking/        # Booking-related components
│   │   ├── provider/       # Provider components
│   │   ├── common/         # Common UI components
│   │   └── ...
│   ├── screens/            # App screens
│   │   ├── auth/           # Authentication screens
│   │   ├── customer/       # Customer screens
│   │   ├── provider/       # Provider screens
│   │   └── main/           # Main navigation screens
│   ├── navigation/         # Navigation configuration
│   ├── contexts/           # React Context providers
│   ├── services/           # API services and utilities
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── i18n/               # Internationalization
│   ├── types/              # TypeScript type definitions
│   └── constants/          # App constants
├── assets/                 # Images, icons, fonts
├── __tests__/              # Test files
└── ...
```

## Key Features Implementation

### Authentication
- Phone-based registration with OTP verification
- JWT token management with refresh tokens
- User type selection (customer/provider)
- Secure token storage with AsyncStorage

### Internationalization
- Arabic (default) and English support
- RTL layout for Arabic content
- Dynamic language switching
- Locale-specific date/time formatting

### Booking System
- Real-time availability checking
- Service selection and customization
- Calendar-based appointment scheduling
- Booking status tracking

### Provider Features
- Service management and pricing
- Availability configuration
- Booking management dashboard
- Performance analytics

### Customer Features
- Provider search and filtering
- Service browsing and selection
- Booking history and management
- Reviews and ratings

## Environment Variables

Create a `.env` file with:

```env
# API Configuration
API_URL=http://localhost:3001/api

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-key

# App Configuration
APP_NAME=Lamsa
DEFAULT_LANGUAGE=ar
```

## Build & Deployment

### Development Build
```bash
expo build:android
expo build:ios
```

### Production Build
```bash
# Update version
npm run version:patch

# Build for production
expo build:android --type app-bundle
expo build:ios --type archive
```

### Publishing Updates
```bash
expo publish
```

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript for all new code
3. Implement proper error handling
4. Add unit tests for new components
5. Follow the RTL-first design approach
6. Test on both iOS and Android

## License

UNLICENSED - Private project