# Lamsa - Beauty Booking Platform

A mobile-first beauty booking platform for the Jordan market, featuring multi-language support (Arabic/English) with RTL, phone-based authentication, service provider marketplace, and integrated booking and payment system.

## 🚀 Project Structure

```
lamsa/
├── lamsa-api/          # Express.js + TypeScript backend API
├── lamsa-mobile/       # React Native + Expo mobile app
├── lamsa-web/          # Next.js web dashboard
├── database/           # Database schemas and migrations
├── infrastructure/     # Docker and deployment configurations
└── docs/              # Project documentation
```

## 🛠️ Tech Stack

### Backend (lamsa-api)
- **Framework**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Authentication**: JWT with phone/OTP verification
- **Caching**: Redis for session management
- **Security**: CSRF protection, rate limiting, certificate pinning

### Mobile App (lamsa-mobile)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **State Management**: Context API + AsyncStorage
- **Authentication**: Biometric support (Face ID/Touch ID)
- **Languages**: Arabic (RTL) and English

### Web Dashboard (lamsa-web)
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **UI Components**: shadcn/ui

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ (via Supabase)
- Redis 6+
- Expo CLI for mobile development
- iOS Simulator (Mac only) or Android emulator

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/lamsa.git
cd lamsa
```

### 2. Install dependencies
```bash
# Install root dependencies
npm install

# Install API dependencies
cd lamsa-api
npm install

# Install mobile app dependencies
cd ../lamsa-mobile
npm install

# Install web dashboard dependencies
cd ../lamsa-web
npm install
```

### 3. Environment Setup

Copy the example environment files and configure them:

```bash
# API environment
cp lamsa-api/.env.example lamsa-api/.env

# Mobile app environment
cp lamsa-mobile/.env.example lamsa-mobile/.env

# Web dashboard environment
cp lamsa-web/.env.example lamsa-web/.env.local
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `JWT_SECRET` - Secret for JWT token signing
- `REDIS_URL` - Redis connection URL

### 4. Database Setup

```bash
# Run database migrations
cd lamsa-api
npm run migrate
```

### 5. Start Development Servers

```bash
# Start API server (runs on port 3000)
cd lamsa-api
npm run dev

# Start mobile app (in a new terminal)
cd lamsa-mobile
npm start

# Start web dashboard (in a new terminal)
cd lamsa-web
npm run dev
```

## 📱 Mobile App Development

### Running on iOS Simulator
```bash
cd lamsa-mobile
npm run ios
```

### Running on Android Emulator
```bash
cd lamsa-mobile
npm run android
```

### Building for Production
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## 🧪 Testing

```bash
# Run API tests
cd lamsa-api
npm test

# Run mobile app tests
cd lamsa-mobile
npm test

# Run web dashboard tests
cd lamsa-web
npm test
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Production build
docker-compose -f docker-compose.prod.yml up --build
```

## 📚 Documentation

- [API Documentation](./docs/architecture/API.md)
- [Mobile App Guide](./lamsa-mobile/README.md)
- [Security Guide](./docs/security/SECURITY.md)
- [Deployment Guide](./docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md)

## 🔒 Security Features

- Phone-based authentication with OTP
- JWT token rotation
- CSRF protection
- Rate limiting
- Certificate pinning (mobile)
- Biometric authentication
- PII encryption
- Account lockout protection

## 🌍 Internationalization

The platform supports:
- Arabic (RTL) - Default language
- English
- Automatic language detection
- Bilingual error messages
- Localized currency (JOD)

## 🤝 Contributing

Please read our contributing guidelines before submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Team

- Development Team - Full-stack development
- UI/UX Team - Design and user experience
- QA Team - Testing and quality assurance

## 📞 Support

For support, email support@lamsa.jo or join our Slack channel.

---

Built with ❤️ in Jordan
