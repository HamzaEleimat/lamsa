# Lamsa Package Documentation

This document provides comprehensive documentation for all packages used across the Lamsa platform components.

## Table of Contents

1. [Backend API Packages](#backend-api-packages)
2. [Mobile App Packages](#mobile-app-packages)
3. [Web Dashboard Packages](#web-dashboard-packages)
4. [Shared Dependencies](#shared-dependencies)

---

## Backend API Packages

### Core Framework

#### Express.js (v5.1.0)
- **Purpose**: Fast, unopinionated, minimalist web framework for Node.js
- **Key Features**:
  - Middleware-based architecture
  - Robust routing with parameter support
  - View engine support
  - HTTP utilities and methods
  - Content negotiation

**Basic Setup Example:**
```javascript
import express from 'express'

const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.get('/', (req, res) => {
  res.send('Hello World')
})

// Start server
app.listen(3000)
```

**Middleware Usage in Lamsa:**
```javascript
// Security middleware
app.use(helmet())
app.use(cors())
app.use(compression())

// Request logging
app.use(morgan('dev'))

// Error handling
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message })
})
```

**Router Pattern (Used in Lamsa):**
```javascript
// Create modular router
const router = express.Router()

router.use(authMiddleware)
router.get('/providers', getProviders)
router.post('/providers', createProvider)

// Mount router
app.use('/api', router)
```

#### TypeScript (v5.8.3)
- **Purpose**: Static typing for JavaScript
- **Key Features**: Type safety, modern JavaScript features, better IDE support

### Database & Authentication

#### @supabase/supabase-js (v2.50.4)
- **Purpose**: Supabase client for database operations and authentication
- **Key Features**:
  - Real-time database subscriptions
  - Row Level Security (RLS) support
  - Authentication management
  - Storage operations
  - Edge Functions integration
  - **PostGIS Extension**: For geolocation features (proximity search, distance calculations)

**Basic Setup Example:**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)
```

**Usage in Lamsa API:**
```javascript
// Database operations with RLS
const { data, error } = await supabase
  .from('providers')
  .select('*')
  .eq('verified', true)

// Authentication
const { data: user } = await supabase.auth.getUser(token)

// Real-time subscriptions
supabase
  .channel('bookings')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'bookings' }, 
    (payload) => console.log(payload)
  )
  .subscribe()
```

**TypeScript Support:**
```typescript
import { Database } from './types/database'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
```

### Security

#### bcryptjs (v3.0.2)
- **Purpose**: Password hashing and verification
- **Documentation**: Loading...

#### jsonwebtoken (v9.0.2)
- **Purpose**: JWT token generation and verification
- **Documentation**: Loading...

#### helmet (v8.1.0)
- **Purpose**: Security headers middleware
- **Documentation**: Loading...

### Validation & Middleware

#### express-validator (v7.2.1)
- **Purpose**: Input validation and sanitization
- **Documentation**: Loading...

#### cors (v2.8.5)
- **Purpose**: Cross-Origin Resource Sharing support
- **Usage**: Configured for mobile app and web dashboard access

#### compression (v1.8.0)
- **Purpose**: Response compression middleware
- **Usage**: Reduces payload size for API responses

### File Handling

#### multer (v2.0.1)
- **Purpose**: Multipart/form-data handling for file uploads
- **Documentation**: Loading...

### Development Tools

#### nodemon (v3.1.10)
- **Purpose**: Auto-restart server on file changes
- **Usage**: Development environment only

#### ts-node (v10.9.2)
- **Purpose**: TypeScript execution for Node.js
- **Usage**: Development environment only

#### morgan (v1.10.0)
- **Purpose**: HTTP request logging
- **Usage**: Request/response logging in development

---

## Mobile App Packages

### Core Framework

#### React Native (v0.79.5)
- **Purpose**: Cross-platform mobile development
- **Documentation**: Loading...

#### Expo (v53.0.17)
- **Purpose**: React Native development platform
- **Documentation**: Loading...

### Navigation

#### @react-navigation/native (v7.1.14)
- **Purpose**: Navigation framework
- **Documentation**: Loading...

#### @react-navigation/stack (v7.4.2)
- **Purpose**: Stack navigator
- **Usage**: Authentication flow navigation

#### @react-navigation/bottom-tabs (v7.4.2)
- **Purpose**: Bottom tab navigation
- **Usage**: Main app navigation

### UI Components

#### react-native-paper (v5.14.5)
- **Purpose**: Material Design components
- **Documentation**: Loading...

#### react-native-vector-icons (v10.2.0)
- **Purpose**: Icon library
- **Usage**: UI icons throughout the app

### Data Management

#### @react-native-async-storage/async-storage (v2.2.0)
- **Purpose**: Persistent storage
- **Usage**: Token storage, user preferences

#### react-hook-form (v7.60.0)
- **Purpose**: Form state management
- **Documentation**: Loading...

### Internationalization

#### i18n-js (v4.5.1)
- **Purpose**: Internationalization framework
- **Usage**: Arabic/English language support

#### react-native-localize (v3.4.2)
- **Purpose**: Device locale detection
- **Usage**: Auto-detect user language preference

### Location Services

#### expo-location (v18.1.6)
- **Purpose**: GPS and location services
- **Usage**: Provider search, user location

#### react-native-maps (v1.24.3)
- **Purpose**: Map integration
- **Usage**: Provider location display

### Notifications

#### expo-notifications (v0.31.4)
- **Purpose**: Push notifications
- **Usage**: Booking reminders, status updates

### Utilities

#### date-fns (v4.1.0)
- **Purpose**: Date manipulation
- **Usage**: Booking dates, time formatting

---

## Web Dashboard Packages

### Core Framework

#### Next.js (v15.3.5)
- **Purpose**: React framework with SSR/SSG
- **Documentation**: Loading...

#### React (v19.0.0)
- **Purpose**: UI library
- **Latest Features**: React 19 with improved performance

### State Management

#### zustand (v5.0.6)
- **Purpose**: State management
- **Documentation**: Loading...

#### @tanstack/react-query (v5.82.0)
- **Purpose**: Server state management
- **Documentation**: Loading...

### UI Components

#### Radix UI
- **@radix-ui/react-dialog** (v1.1.14)
- **@radix-ui/react-dropdown-menu** (v2.1.15)
- **@radix-ui/react-label** (v2.1.7)
- **@radix-ui/react-select** (v2.2.5)
- **@radix-ui/react-tabs** (v1.1.12)
- **Purpose**: Accessible, unstyled UI components
- **Documentation**: Loading...

#### lucide-react (v0.525.0)
- **Purpose**: Icon library
- **Usage**: Dashboard icons

### Styling

#### Tailwind CSS (v4)
- **Purpose**: Utility-first CSS framework
- **Documentation**: Loading...

#### tailwind-merge (v3.3.1)
- **Purpose**: Merge Tailwind classes safely
- **Usage**: Dynamic class combinations

### Form & Validation

#### react-hook-form (v7.60.0)
- **Purpose**: Form state management
- **Shared with mobile app**

#### zod (v4.0.2)
- **Purpose**: Schema validation
- **Documentation**: Loading...

#### @hookform/resolvers (v5.1.1)
- **Purpose**: Validation resolvers
- **Usage**: Zod integration with react-hook-form

### Data Fetching

#### axios (v1.10.0)
- **Purpose**: HTTP client
- **Usage**: API requests

### Utilities

#### framer-motion (v12.23.3)
- **Purpose**: Animation library
- **Usage**: Page transitions, UI animations

#### react-hot-toast (v2.5.2)
- **Purpose**: Toast notifications
- **Usage**: Success/error messages

#### next-themes (v0.4.6)
- **Purpose**: Theme management
- **Usage**: Dark/light mode support

#### libphonenumber-js (v1.12.9)
- **Purpose**: Phone number validation
- **Usage**: Jordan phone format validation

#### react-phone-number-input (v3.4.12)
- **Purpose**: Phone number input component
- **Usage**: Customer phone entry

---

## Shared Dependencies

### @supabase/supabase-js (v2.50.4)
- **Used by**: All components
- **Purpose**: Database client and authentication
- **Configuration**: Shared environment variables

### TypeScript (v5.x)
- **Used by**: All components
- **Purpose**: Type safety across the stack

### date-fns (v4.1.0)
- **Used by**: Mobile app, Web dashboard
- **Purpose**: Consistent date handling

### react-hook-form (v7.60.0)
- **Used by**: Mobile app, Web dashboard
- **Purpose**: Form management consistency

---

## Package Management

### API & Web
- **Package Manager**: npm
- **Lock Files**: package-lock.json

### Mobile
- **Package Manager**: npm with Expo
- **Lock Files**: package-lock.json

---

## Version Control Strategy

1. **Exact Versions**: Critical packages use exact versions
2. **Minor Updates**: Development dependencies allow minor updates
3. **Security Updates**: Regular dependency audits

---

## Documentation Loading...

*Note: Detailed documentation for each package will be fetched and added below.*

---

## Future Integrations (Planned)

As mentioned in the requirements documents, the following integrations are planned:

### SMS/OTP Service
- **Twilio**: For sending OTP codes and SMS notifications
- Environment variables already prepared in `shared/env-template.txt`

### Payment Gateway
- **Tap Payment Gateway**: For online card payments
- Will handle payment processing, refunds, and settlements
- Environment variables already prepared in `shared/env-template.txt`

### Database Extensions
- **PostGIS**: Currently used through Supabase for geolocation features
  - Provider proximity search
  - Distance calculations
  - GPS coordinate validation within Jordan boundaries
