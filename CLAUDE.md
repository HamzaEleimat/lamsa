# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lamsa is a mobile-first beauty booking platform for the Jordan market, featuring:
- Multi-language support (Arabic/English) with RTL
- Phone-based authentication
- Service provider marketplace
- Booking and payment system

## Development Commands

### Database Setup
```bash
# Automated setup (recommended)
./setup-database.sh  # Interactive CLI for all database operations

# Manual Supabase CLI commands
supabase start       # Start local Supabase instance
supabase db push     # Run migrations on linked project
supabase db reset    # Drop all data and rerun migrations
supabase migration list  # Check migration status
```

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
- **UI Library**: React Native Paper (Material Design 3)
- **Theming**: Custom pink-themed design system
- **Key directories**:
  - `src/screens/` - All app screens organized by feature
  - `src/navigation/` - Navigation configuration
  - `src/contexts/` - Global state management
  - `src/i18n/` - Translations and localization
  - `src/theme/` - Design system and color palette
  - `src/constants/` - App constants including colors

### Database Schema
Key tables:
- `users` - Customer accounts
- `providers` - Service providers with geolocation
- `services` - Available beauty services
- `bookings` - Appointments with status tracking
- `payments` - Transaction records
- `reviews` - Rating system

All tables support multi-language content (name_en, name_ar).

**Migration Files**: Database migrations are now managed via Supabase CLI in `supabase/migrations/`

## Environment Configuration

Required environment variables (see `shared/env-template.txt`):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `PORT` (API server port, default: 3000)
- `NODE_ENV` (development/production)

Future integrations:
- Tap Payment Gateway (`TAP_SECRET_KEY`, `TAP_PUBLIC_KEY`)
- Twilio SMS (`TWILIO_*` credentials)
- Expo Push Notifications

## Design System

### Design System
Lamsa uses a unified design system across web and mobile platforms with a sophisticated plum/mauve color palette for a premium beauty brand experience.

#### Color Palette (Sophisticated Plum/Mauve Theme)
- **Primary**: #4A3643 (Deep plum) - CTA buttons, links, focus states
- **Secondary**: #CC8899 (Dusty pink) - Secondary actions, highlights  
- **Tertiary**: #D4A5A5 (Soft rose) - Accents, badges, light backgrounds
- **Surface**: #F5E6E6 (Cream blush) - Card backgrounds, input fields
- **Background**: #FAF7F6 (Warm white) - Main application background

#### Text Colors (WCAG AA Compliant)
- **Primary Text**: #2D1B28 (4.5:1 contrast ratio)
- **Secondary Text**: #6B5D65 (4.5:1 contrast ratio)  
- **Tertiary Text**: #8A7B83 (3:1 contrast for large text only)
- **Inverse Text**: #FFFFFF (White on dark backgrounds)

#### Typography
- **Primary Font**: Inter (Latin text) - Excellent readability and modern appearance
- **Arabic Font**: Cairo (Arabic text) - Optimized for RTL layouts
- **Font Weights**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semi-bold), 700 (Bold)

#### Design System Files
- **Master Design System**: `/shared/design-system.ts` - Single source of truth
- **Mobile Colors**: `lamsa-mobile/src/constants/colors.ts`
- **Mobile Theme**: `lamsa-mobile/src/theme/index.ts` (React Native Paper)
- **Web Styles**: `lamsa-web/src/app/globals.css` (CSS variables)
- **Web Config**: `lamsa-web/tailwind.config.ts` (Tailwind CSS)

#### Usage Guidelines
- **Mobile**: Use `theme.colors.*` from React Native Paper's useTheme hook
- **Web**: Use CSS custom properties or Tailwind classes (`bg-primary`, `text-primary`)
- Never hardcode colors - always reference the design system
- Maintain proper contrast ratios for accessibility (minimum 4.5:1)
- Test in both Arabic (RTL) and English (LTR) layouts
- Use semantic color names (success: #4CAF50, warning: #FF9800, error: #F44336, info: #2196F3)

#### Interactive States
- **Hover**: 10% darker than base color
- **Active**: 15% darker than base color  
- **Disabled**: 40% opacity
- **Focus Ring**: Primary color with 20% opacity

#### Component Standards
- **Border Radius**: 8px default (can use 4px, 12px, 16px variants)
- **Spacing**: 8px grid system (4px, 8px, 16px, 24px, 32px, etc.)
- **Shadows**: Subtle, warm-tinted shadows using primary color base
- **Button Heights**: 44px (mobile), 40px (desktop) for accessibility

## Key Development Practices

1. **TypeScript**: Strict mode enabled across all projects
2. **Phone Numbers**: Jordanian format validation (77/78/79 prefixes)
3. **Internationalization**: Arabic is default language, always test RTL
4. **Authentication**: Phone-based with OTP, JWT for session management
5. **Geolocation**: Provider search uses PostGIS for proximity queries
6. **Design**: Follow the pink-themed color palette and Material Design 3 principles

## Fee Structure

Lamsa uses a fixed-fee structure for platform monetization:
- **Services ≤25 JOD**: 2 JOD platform fee
- **Services >25 JOD**: 5 JOD platform fee
- **Provider earnings**: Service amount - Platform fee

This fee structure is implemented in:
- Backend: `lamsa-api/src/services/fee-calculation.service.ts`
- Database: Triggers in `lamsa-api/database/fee-calculation-update.sql`
- The fees are automatically calculated when bookings are created

## Current Limitations

- No testing framework implemented yet
- Web dashboard is minimal (just scaffolded)
- No CI/CD pipeline configured
- No API documentation (Swagger/OpenAPI)

## Technical Decisions

### Error Handling Strategy (MVP)
The API currently uses a basic error handling middleware (`error.middleware.ts`) for simplicity and stability. Enhanced error handlers with bilingual support and detailed formatting are available but not active:
- `enhanced-error.middleware.ts` - Advanced error formatting and categorization
- `enhanced-bilingual-error.middleware.ts` - Full Arabic/English error messages

**Rationale**: Keeping error handling simple for MVP reduces complexity and testing burden. The enhanced versions can be gradually adopted post-launch based on actual user needs.

## Important Notes

- The mobile app uses Expo managed workflow for easier deployment
- All monetary values are in JOD (Jordanian Dinar)
- Provider availability uses timezone-aware scheduling
- Images are stored as base64 in the database (consider moving to object storage)