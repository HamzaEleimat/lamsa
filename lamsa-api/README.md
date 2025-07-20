# Lamsa API

RESTful API for the Lamsa beauty services booking platform.

## Features

- User authentication (customers & providers)
- Provider profiles and service management
- Booking system with availability management
- Payment processing
- Review and rating system
- Real-time notifications

## Tech Stack

- Node.js with TypeScript
- Express.js framework
- PostgreSQL database
- JWT authentication
- Express Validator for input validation

## Prerequisites

- Node.js v16+
- PostgreSQL 12+
- Redis (optional, for caching)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and configure your environment variables:
```bash
cp .env.example .env
```

4. Run database migrations (when implemented):
```bash
npm run migrate
```

## Development

Start the development server with hot reloading:
```bash
npm run dev
```

## Build

Build for production:
```bash
npm run build
```

## Production

Run in production mode:
```bash
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update profile
- `PUT /api/v1/users/password` - Change password
- `POST /api/v1/users/avatar` - Upload avatar
- `GET /api/v1/users/favorites` - Get favorite providers
- `POST /api/v1/users/favorites` - Add favorite
- `DELETE /api/v1/users/favorites/:providerId` - Remove favorite

### Providers
- `GET /api/v1/providers` - List all providers
- `GET /api/v1/providers/:id` - Get provider details
- `POST /api/v1/providers` - Create provider profile
- `PUT /api/v1/providers/:id` - Update provider
- `DELETE /api/v1/providers/:id` - Delete provider
- `GET /api/v1/providers/:id/services` - Get provider services
- `GET /api/v1/providers/:id/availability` - Check availability
- `GET /api/v1/providers/:id/stats` - Get provider statistics

### Services
- `GET /api/v1/services` - List all services
- `GET /api/v1/services/categories` - Get service categories
- `GET /api/v1/services/search` - Search services
- `GET /api/v1/services/:id` - Get service details
- `POST /api/v1/services/providers/:providerId/services` - Create service
- `PUT /api/v1/services/providers/:providerId/services/:serviceId` - Update service
- `DELETE /api/v1/services/providers/:providerId/services/:serviceId` - Delete service

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings/user` - Get user bookings
- `GET /api/v1/bookings/provider/:providerId` - Get provider bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `PATCH /api/v1/bookings/:id/status` - Update booking status
- `POST /api/v1/bookings/:id/cancel` - Cancel booking
- `POST /api/v1/bookings/:id/reschedule` - Reschedule booking

### Payments
- `POST /api/v1/payments` - Process payment
- `GET /api/v1/payments/history` - Payment history
- `POST /api/v1/payments/:paymentId/refund` - Request refund

### Reviews
- `POST /api/v1/reviews` - Create review
- `GET /api/v1/reviews/providers/:providerId` - Get provider reviews
- `PUT /api/v1/reviews/:id` - Update review

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Request handlers
├── middleware/     # Express middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── app.ts          # Express app setup
└── server.ts       # Server entry point
```

## Testing

Run tests:
```bash
npm test
```

## License

ISC