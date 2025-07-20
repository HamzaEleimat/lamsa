# Lamsa Project Structure Analysis

## Project Overview

Lamsa is a multi-platform beauty booking application for the Jordan market, featuring:
- Mobile app (React Native/Expo)
- Web dashboard (Next.js)
- REST API (Express/TypeScript)
- Database (Supabase/PostgreSQL with PostGIS)

## Main Project Structure

```
lamsa/
├── lamsa-api/          # Backend API server
├── lamsa-mobile/       # React Native mobile app
├── lamsa-web/          # Next.js web dashboard
├── database/                # Database schemas and migrations
├── docs/                    # Comprehensive documentation
├── deployment/              # Deployment configurations
├── monitoring/              # Production monitoring configs
├── provider-marketing-package/  # Marketing materials for providers
├── scripts/                 # Deployment and maintenance scripts
├── shared/                  # Shared configurations
└── testing/                 # Integration testing suites
```

## 1. Backend API (`lamsa-api/`)

### Key Configuration Files
- `package.json` - Node.js dependencies and scripts
- `tsconfig.json` - TypeScript configuration (ES2022, strict mode)
- `tsconfig.production.json` - Production build configuration
- `jest.config.js` - Testing configuration
- `Dockerfile` - Container configuration

### Source Code Structure (`src/`)
```
src/
├── app.ts                   # Express app initialization
├── server.ts               # HTTP server setup
├── config/                 # Configuration files
│   ├── supabase.ts         # Database client configuration
│   ├── token-storage.config.ts  # Token management
│   └── mock-otp.ts         # OTP testing config
├── controllers/            # Business logic controllers
│   ├── auth.controller.ts  # Authentication logic
│   ├── booking.controller.ts
│   ├── provider.controller.ts
│   └── [20+ other controllers]
├── middleware/             # Express middleware
│   ├── auth.middleware.ts  # JWT authentication
│   ├── error.middleware.ts # Error handling
│   ├── rate-limit.middleware.ts
│   └── [15+ other middleware]
├── routes/                 # API endpoints
│   ├── auth.routes.ts      # Auth endpoints
│   ├── booking.routes.ts   
│   └── [15+ other routes]
├── services/               # Business services
│   ├── notification.service.ts
│   ├── booking.service.ts
│   └── [20+ other services]
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions
```

### Main Entry Points
- `server.ts` - Main server entry with WebSocket support
- `app.ts` - Express application setup with all middleware and routes

### Key Features
- JWT-based authentication with phone/OTP for customers
- Email/password authentication for providers
- Rate limiting and security middleware (Helmet)
- WebSocket support for real-time features
- Comprehensive error handling
- Swagger API documentation
- Redis integration for caching and token management

## 2. Mobile App (`lamsa-mobile/`)

### Key Configuration Files
- `package.json` - React Native/Expo dependencies
- `tsconfig.json` - TypeScript configuration
- `app.json` - Expo configuration
- `eas.json` - EAS Build configuration

### Source Code Structure (`src/`)
```
src/
├── screens/                # App screens
│   ├── auth/              # Authentication screens
│   │   ├── PhoneAuthScreen.tsx
│   │   ├── OTPVerificationScreen.tsx
│   │   └── onboarding/    # Provider onboarding
│   ├── customer/          # Customer screens
│   ├── provider/          # Provider dashboard screens
│   └── help/              # Help system screens
├── navigation/            # React Navigation setup
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── TabNavigators
├── contexts/              # React Context providers
│   ├── AuthContext.tsx
│   └── NotificationContext.tsx
├── components/            # Reusable components
│   ├── auth/             # Auth components
│   ├── booking/          # Booking components
│   └── provider/         # Provider components
├── services/             # API and business logic
│   ├── api/client.ts     # HTTP client
│   ├── auth/authService.ts
│   └── notifications/
├── i18n/                 # Internationalization
│   └── translations/     # AR/EN translations
└── utils/                # Utility functions
    ├── rtl.ts           # RTL support
    └── arabic-numerals.ts
```

### Main Entry Point
- `App.tsx` - Root component with providers and navigation

### Key Features
- Multi-language support (Arabic/English) with RTL
- Phone-based authentication with OTP
- Provider and customer interfaces
- Offline support
- Push notifications
- Location-based services
- Help system integration

## 3. Web Dashboard (`lamsa-web/`)

### Key Configuration Files
- `package.json` - Next.js 15 dependencies
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration

### Source Code Structure (`src/`)
```
src/
├── app/                   # Next.js 15 app directory
│   ├── [locale]/         # Internationalized routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── provider/     # Provider routes
│   └── globals.css       # Global styles
├── components/           # React components
│   └── ui/              # UI components
├── i18n/                # Internationalization
│   ├── messages/        # Translation files
│   └── request.ts       # i18n configuration
├── lib/                 # Utility libraries
└── middleware.ts        # Next.js middleware
```

### Main Entry Points
- `src/app/[locale]/layout.tsx` - Root layout
- `src/app/[locale]/page.tsx` - Home page

### Key Features
- Next.js 15 with App Router
- Internationalization (AR/EN)
- RTL support
- Tailwind CSS for styling
- React Hook Form for forms
- Radix UI components

## 4. Database (`database/`)

### Schema Files
- `schema.sql` - Main database schema
- `enhanced_provider_schema.sql` - Provider enhancements
- `provider_analytics_schema.sql` - Analytics tables
- `availability_management_schema.sql` - Scheduling system

### Key Tables
- `users` - Customer accounts
- `providers` - Service providers with geolocation
- `services` - Beauty services
- `bookings` - Appointments
- `payments` - Transactions
- `reviews` - Ratings
- `notifications` - System notifications

### Features
- PostgreSQL with PostGIS for geolocation
- UUID primary keys
- JSONB for flexible data
- Enum types for statuses
- Triggers for calculations
- RLS policies for security

## 5. Critical Security & Configuration Files

### Environment Variables
- `.env` files for each component
- `shared/env-template.txt` - Template for environment setup

### Security Features
- JWT token management with blacklisting
- Rate limiting on all endpoints
- Phone number validation (Jordan format)
- CORS configuration
- Helmet.js for security headers
- Input validation with express-validator

### Authentication Flow
1. **Customers**: Phone → OTP → JWT token
2. **Providers**: Email/Password → JWT token
3. Token storage with Redis
4. Refresh token rotation

## 6. Testing Infrastructure

### API Tests
- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- E2E tests in `tests/e2e/`
- Stress tests in `tests/stress/`

### Mobile Tests
- Component tests
- Integration tests
- Performance tests

### Test Coverage
- Jest configuration for all projects
- Coverage reports
- CI/CD test scripts

## 7. Deployment & DevOps

### Docker Support
- `docker-compose.yml` - Full stack
- `docker-compose.minimal.yml` - Minimal setup
- Individual Dockerfiles for services

### Deployment Scripts
- Production deployment scripts
- Database migration scripts
- Health check scripts
- Rollback management

### Monitoring
- Production monitoring configuration
- Error logging with Winston
- Performance tracking

## Key Technologies

### Backend
- Node.js + Express + TypeScript
- Supabase (PostgreSQL + Auth)
- Redis for caching
- JWT for authentication
- WebSocket for real-time

### Mobile
- React Native + Expo
- React Navigation
- React Hook Form
- AsyncStorage
- Supabase client

### Web
- Next.js 15
- React 19
- Tailwind CSS
- Radix UI
- React Query

### Database
- PostgreSQL
- PostGIS for geolocation
- Supabase for hosting

## Security Considerations

1. **Authentication**: Multi-factor with phone/OTP
2. **Authorization**: Role-based (customer/provider/admin)
3. **Data Protection**: Environment-based secrets
4. **API Security**: Rate limiting, input validation
5. **Token Management**: Blacklisting, rotation
6. **Database**: RLS policies, prepared statements

## Areas for Review

1. **Environment Security**: Check for exposed keys
2. **Input Validation**: Review all user inputs
3. **Authentication Flow**: Verify OTP implementation
4. **Database Queries**: Check for SQL injection
5. **API Rate Limiting**: Ensure proper limits
6. **Error Handling**: Avoid information leakage
7. **CORS Configuration**: Review allowed origins
8. **File Upload**: Check for vulnerabilities
9. **Payment Integration**: Review security measures
10. **Third-party Dependencies**: Check for vulnerabilities