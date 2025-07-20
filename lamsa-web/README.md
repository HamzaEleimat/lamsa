# Lamsa Web Application

Modern Next.js web application for the Lamsa beauty services marketplace.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + Custom components
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Features

- 🌍 **Bilingual Support** - Arabic (RTL) and English
- 📱 **Responsive Design** - Mobile-first approach
- 🔐 **Dual Authentication** - Customers (phone) and Providers (email)
- 📍 **Location Services** - Find nearby beauty providers
- 📅 **Booking System** - Real-time availability
- 💳 **Payment Integration** - Multiple payment methods
- ⭐ **Reviews & Ratings** - Customer feedback system
- 📊 **Provider Dashboard** - Manage services and bookings

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Lamsa API running on port 3001

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Copy `.env.local.example` to `.env.local` and update the values.

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
lamsa-web/
├── app/                 # Next.js App Router pages
│   ├── (auth)/         # Authentication pages
│   ├── (customer)/     # Customer portal
│   ├── (provider)/     # Provider dashboard
│   └── api/            # API routes
├── components/         # React components
│   ├── ui/            # Reusable UI components
│   ├── layout/        # Layout components
│   ├── auth/          # Authentication components
│   ├── customer/      # Customer-specific components
│   ├── provider/      # Provider-specific components
│   └── booking/       # Booking components
├── lib/               # Core libraries and configurations
│   ├── supabase/      # Supabase client
│   ├── api/           # API client
│   └── validations/   # Zod schemas
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
├── constants/         # App constants
└── styles/           # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key

# App Configuration
NEXT_PUBLIC_APP_NAME=Lamsa
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LANGUAGE=ar
```

## Key Features Implementation

### Authentication
- Phone-based auth for customers with OTP
- Email/password auth for providers
- JWT token management
- Protected routes with middleware

### Multilingual Support
- Arabic (default) and English
- RTL layout support
- Dynamic content translation
- Locale-based routing

### State Management
- Zustand for global state
- React Query for server state
- Local storage persistence
- Optimistic updates

### UI/UX
- Mobile-first responsive design
- Dark mode support
- Loading states and skeletons
- Error boundaries
- Toast notifications

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy

### Docker
```bash
docker build -t lamsa-web .
docker run -p 3000:3000 lamsa-web
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
