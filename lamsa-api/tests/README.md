# Lamsa API Testing Documentation

## Overview
Comprehensive testing guide for the Lamsa API, covering unit tests, integration tests, E2E tests, and manual testing procedures.

## Test Structure

```
tests/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for API endpoints
├── e2e/           # End-to-end workflow tests
├── stress/        # Performance and stress tests
├── bilingual/     # Bilingual support tests
├── manual/        # Manual testing checklists
└── factories/     # Test data factories
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Coverage Report
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Categories

### 1. Authentication Testing
- **Phone OTP Flow**: Complete SMS OTP authentication for Jordan numbers
- **JWT Management**: Token generation, validation, and refresh
- **Role-Based Access**: Customer vs Provider authentication
- **Edge Cases**: Invalid numbers, expired OTPs, rate limiting

### 2. Booking Flow Testing
- **Availability Checking**: Time slot validation
- **Booking Creation**: Complete booking workflow
- **Status Management**: Confirmation, cancellation, completion
- **Payment Integration**: Fee calculation and processing

### 3. Provider Testing
- **Registration**: Business profile creation
- **Service Management**: Add/update/delete services
- **Availability Configuration**: Working hours and breaks
- **Dashboard Operations**: Analytics and reporting

### 4. Bilingual Support
- **Error Messages**: Arabic/English error responses
- **Content Translation**: Multi-language content
- **RTL Support**: Right-to-left layout testing

## Test Data

### Test Phone Numbers
```javascript
// Valid Jordan numbers for testing
const TEST_NUMBERS = {
  customer: '+962771234567',
  provider: '+962791234567',
  invalid: '+962761234567'  // Invalid prefix
};
```

### Test Credentials
```javascript
// Test accounts (development only)
const TEST_ACCOUNTS = {
  customer: {
    email: 'test.customer@lamsa.com',
    password: 'TestPass123!',
    phone: '+962771234567'
  },
  provider: {
    email: 'test.provider@lamsa.com',
    password: 'ProviderPass123!',
    phone: '+962791234567',
    businessName: 'Test Beauty Salon'
  }
};
```

## Manual Testing Checklists

### Authentication Checklist
- [ ] Customer signup with email/password
- [ ] Customer phone OTP verification
- [ ] Provider signup with business details
- [ ] Provider phone OTP verification
- [ ] Login with email/password
- [ ] JWT token refresh
- [ ] Logout and token invalidation

### Booking Checklist
- [ ] Search for providers
- [ ] View provider services
- [ ] Check availability
- [ ] Create booking
- [ ] Receive confirmation
- [ ] Cancel booking
- [ ] Complete service
- [ ] Leave review

### Provider Dashboard Checklist
- [ ] View bookings
- [ ] Manage services
- [ ] Set availability
- [ ] View analytics
- [ ] Update business profile
- [ ] Manage gallery

## Postman Collection

Complete API testing collection available in `/postman` directory:
- Import collection: `postman/collections/`
- Import environment: `postman/environments/`
- Run tests: `npm run test:postman`

## Stress Testing

Performance benchmarks:
- **Target Response Time**: <200ms for API calls
- **Concurrent Users**: Support 100+ concurrent users
- **Database Queries**: <50ms for complex queries
- **Rate Limiting**: 100 requests/minute per IP

Run stress tests:
```bash
cd tests/stress
npm test
```

## Test Coverage Goals

- **Unit Tests**: 80% coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows
- **Manual Tests**: Edge cases and UI flows

## Debugging Tests

### Run Specific Test
```bash
npm test -- --testNamePattern="should create booking"
```

### Debug Mode
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### Verbose Output
```bash
npm test -- --verbose
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main/dev branches
- Pre-deployment checks

## Known Issues

1. Some unit tests fail due to recent refactoring (being fixed)
2. Stress tests require Redis connection
3. E2E tests need test database setup

## Contributing

When adding new features:
1. Write unit tests first (TDD)
2. Add integration tests for API endpoints
3. Update E2E tests if flow changes
4. Document test scenarios here