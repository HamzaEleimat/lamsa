# Middleware Documentation

## Error Handling Middleware

This directory contains three error handling middleware implementations with different capabilities:

### 1. error.middleware.ts (Currently Active)
- **Status**: In production use
- **Purpose**: Basic error handling for MVP
- **Features**:
  - Simple AppError class for operational errors
  - Secure error logging
  - Basic error response format
  - Stack traces in development mode only

### 2. enhanced-error.middleware.ts
- **Status**: Available for future use
- **Purpose**: Enhanced error handling with detailed formatting
- **Features**:
  - Detailed validation error messages
  - Specialized error formatters:
    - Booking errors (conflicts, not found, invalid status)
    - Rate limiting errors
    - Business rule violations
    - Authentication errors
    - Database constraint errors
  - Structured error responses with suggestions

### 3. enhanced-bilingual-error.middleware.ts
- **Status**: Available for future use  
- **Purpose**: Comprehensive bilingual error handling
- **Features**:
  - Full Arabic/English support
  - Language detection integration
  - Error categorization
  - All features from enhanced-error.middleware
  - Bilingual validation messages

## MVP Decision

For the MVP release, we're using the basic `error.middleware.ts` to:
- Minimize complexity
- Reduce testing burden
- Avoid potential breaking changes
- Focus development on core features

## Future Migration Path

Post-MVP options include:
1. Gradually enable enhanced error handling on specific routes
2. A/B test different error handling approaches
3. Add bilingual support based on user feedback
4. Implement as opt-in features rather than global changes

## Usage

Current implementation (no changes needed):
```typescript
import { AppError, errorHandler } from './middleware/error.middleware';

// In controllers
throw new AppError('Resource not found', 404);

// In app.ts
app.use(errorHandler);
```

Future enhanced usage (when ready):
```typescript
// For specific routes needing enhanced validation
import { enhancedValidate } from './middleware/enhanced-error.middleware';

// For bilingual errors
import { BilingualAppError } from './middleware/enhanced-bilingual-error.middleware';
```