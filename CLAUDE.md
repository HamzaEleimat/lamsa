# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lamsa is a mobile-first beauty booking platform for the Jordan market, featuring:
- Multi-language support (Arabic/English) with RTL
- Phone-based authentication
- Service provider marketplace
- Booking and payment system

## Development Commands

### API (lamsa-api/)
```bash
npm run dev          # Start development server with hot reload (nodemon + ts-node)
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start production server
npm run start:prod   # Start with NODE_ENV=production
```

### Mobile App (lamsa-mobile/)
```bash
npm start           # Start Expo development server
npm run android     # Run on Android device/emulator
npm run ios         # Run on iOS simulator
npm run web         # Run in web browser
```

### Web Dashboard (lamsa-web/)
```bash
npm run dev         # Start Next.js development server
npm run build       # Create production build
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
npm run type-check  # Validate TypeScript types
```

## Architecture

### API Structure
- **Pattern**: MVC with Express + TypeScript
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Auth**: JWT tokens with phone/OTP verification
- **Key directories**:
  - `src/controllers/` - Business logic for each entity
  - `src/routes/` - RESTful endpoints
  - `src/middleware/` - Auth, validation, error handling
  - `src/supabase/` - Database client and operations

### Mobile App Structure
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State**: Context API + AsyncStorage
- **Key directories**:
  - `src/screens/` - All app screens organized by feature
  - `src/navigation/` - Navigation configuration
  - `src/contexts/` - Global state management
  - `src/i18n/` - Translations and localization

### Database Schema
Key tables:
- `users` - Customer accounts
- `providers` - Service providers with geolocation
- `services` - Available beauty services
- `bookings` - Appointments with status tracking
- `payments` - Transaction records
- `reviews` - Rating system

All tables support multi-language content (name_en, name_ar).

## Environment Configuration

Required environment variables (see `shared/env-template.txt`):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `PORT` (API server port, default: 3000)
- `NODE_ENV` (development/production)

Future integrations:
- Tap Payment Gateway (`TAP_SECRET_KEY`, `TAP_PUBLIC_KEY`)
- Twilio SMS (`TWILIO_*` credentials)
- Expo Push Notifications

## Key Development Practices

1. **TypeScript**: Strict mode enabled across all projects
2. **Phone Numbers**: Jordanian format validation (77/78/79 prefixes)
3. **Internationalization**: Arabic is default language, always test RTL
4. **Authentication**: Phone-based with OTP, JWT for session management
5. **Geolocation**: Provider search uses PostGIS for proximity queries

## Current Limitations

- No testing framework implemented yet
- Web dashboard is minimal (just scaffolded)
- No CI/CD pipeline configured
- No API documentation (Swagger/OpenAPI)

## Important Notes

- The mobile app uses Expo managed workflow for easier deployment
- All monetary values are in JOD (Jordanian Dinar)
- Provider availability uses timezone-aware scheduling
- Images are stored as base64 in the database (consider moving to object storage)