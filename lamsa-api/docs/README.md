# Lamsa API Documentation

## Overview
Complete documentation for the Lamsa beauty booking platform API.

## Documentation Structure

### Core Documentation
- [API Reference](./API.md) - Complete API endpoints documentation
- [Authentication](./AUTHENTICATION.md) - Authentication system and JWT implementation
- [Business Logic](./BUSINESS-LOGIC.md) - Core business rules and logic
- [Mobile Integration](./MOBILE-INTEGRATION.md) - Mobile app integration guide
- [Error Reference](./ERROR-REFERENCE.md) - Error codes and handling

### Development Guides
- [Testing Guide](./TESTING-GUIDE.md) - Comprehensive testing documentation
- [Authentication Testing](./AUTHENTICATION_TESTING_PLAN.md) - Auth system testing procedures
- [Provider Dashboard](./PROVIDER_DASHBOARD_DOCUMENTATION.md) - Provider portal documentation
- [Booking System](./BOOKING_MANAGEMENT_SYSTEM.md) - Booking workflow documentation
- [Deployment Checklist](./DEPLOYMENT_SECURITY_CHECKLIST.md) - Production deployment guide

### API Documentation
- [Swagger UI](http://localhost:3001/api-docs) - Interactive API documentation (when server is running)
- [Swagger Definitions](./swagger/) - OpenAPI specifications

## Quick Links

### For Developers
- [Getting Started](../README.md)
- [Environment Setup](../README.md#environment-configuration)
- [Testing](./TESTING-GUIDE.md)

### For API Consumers
- [Authentication Flow](./AUTHENTICATION.md#authentication-flow)
- [API Endpoints](./API.md)
- [Error Handling](./ERROR-REFERENCE.md)

## Key Features

### Authentication
- Phone-based OTP authentication for Jordan (+962)
- JWT token management
- Provider and customer role separation
- Bilingual error messages (Arabic/English)

### Core Functionality
- Provider service management
- Booking system with availability checking
- Real-time notifications
- Gamification system
- Review and rating system

### Technical Stack
- Node.js + Express + TypeScript
- Supabase (PostgreSQL + PostGIS)
- JWT authentication
- WebSocket support
- SMS integration (Twilio ready)

## Support

For issues or questions:
- Check the [Error Reference](./ERROR-REFERENCE.md)
- Review the [Testing Guide](./TESTING-GUIDE.md)
- Consult the [API Documentation](./API.md)