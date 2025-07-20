# Lamsa Constants

This directory contains all application constants, organized by domain.

## Files

### `index.ts`
Main constants file containing:
- Service categories (bilingual)
- Booking statuses
- Payment methods
- Time slots (9 AM - 9 PM)
- Jordan phone number validation
- Default service durations
- Platform fee structure
- Provider tier system
- Currency formatting
- Days of the week
- Languages

### `api.ts`
API-related constants:
- API endpoints
- HTTP status codes
- Error messages (bilingual)
- Request headers
- Timeouts
- Query keys for React Query
- Pagination defaults

### `validation.ts`
Validation rules and constraints:
- Field length limits
- Price constraints
- Rating constraints
- Location boundaries (Jordan)
- File upload limits
- Validation messages (bilingual)
- Regex patterns
- Helper functions

## Usage Examples

### Service Categories
```typescript
import { SERVICE_CATEGORIES } from '@/constants';

// Get all categories
SERVICE_CATEGORIES.forEach(category => {
  console.log(category.name_ar); // Arabic name
  console.log(category.name_en); // English name
});
```

### Phone Validation
```typescript
import { validateJordanPhone, normalizeJordanPhone } from '@/constants';

const phone = '0791234567';
if (validateJordanPhone(phone)) {
  const normalized = normalizeJordanPhone(phone); // +962791234567
}
```

### Platform Fees
```typescript
import { calculatePlatformFee } from '@/constants';

const bookingAmount = 30; // JOD
const fee = calculatePlatformFee(bookingAmount); // Returns 5 JOD
```

### Provider Tiers
```typescript
import { getProviderTier, PROVIDER_TIERS } from '@/constants';

const totalBookings = 150;
const tier = getProviderTier(totalBookings); // Returns 'SILVER'
const tierInfo = PROVIDER_TIERS[tier];
```

### Currency Formatting
```typescript
import { formatCurrency } from '@/constants';

const amount = 25.500;
const arabic = formatCurrency(amount, 'ar');  // "25.500 د.أ"
const english = formatCurrency(amount, 'en'); // "JD 25.500"
```

### API Endpoints
```typescript
import { API_ENDPOINTS } from '@/constants/api';

// Static endpoint
const categoriesUrl = API_ENDPOINTS.SERVICES.CATEGORIES;

// Dynamic endpoint
const providerId = '123';
const providerUrl = API_ENDPOINTS.PROVIDERS.DETAILS(providerId);
```

### Validation
```typescript
import { VALIDATION_MESSAGES, ValidationHelpers } from '@/constants/validation';

// Check email
if (!ValidationHelpers.isValidEmail(email)) {
  showError(VALIDATION_MESSAGES.EMAIL.INVALID[language]);
}

// Check location
if (!ValidationHelpers.isWithinJordan(lat, lng)) {
  showError(VALIDATION_MESSAGES.LOCATION.OUTSIDE_JORDAN[language]);
}
```

## TypeScript Types

The constants export helpful TypeScript types:

```typescript
import type {
  ServiceCategoryId,
  BookingStatus,
  PaymentMethod,
  TimeSlot,
  ProviderTierName,
  LanguageCode,
} from '@/constants';
```

## Platform Fee Structure

- **≤ 25 JOD**: 2 JOD flat fee
- **> 25 JOD**: 5 JOD flat fee

## Provider Tier Benefits

1. **Bronze** (0-50 bookings): 15% commission
2. **Silver** (51-200 bookings): 12% commission
3. **Gold** (201-500 bookings): 10% commission
4. **Platinum** (500+ bookings): 8% commission