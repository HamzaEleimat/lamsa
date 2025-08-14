# Error Handling Migration Guide

## Overview

This guide documents the migration from `AppError` to `BilingualAppError` across the Lamsa API codebase, completed on 2025-08-13. This migration enables proper Arabic/English bilingual error messages for the Jordan market.

## What Changed

### Before (AppError)
```typescript
import { AppError } from '../middleware/error.middleware';

// Basic error - English only
throw new AppError('Invalid phone number', 400);
```

### After (BilingualAppError)
```typescript
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';

// Using predefined error codes
throw new BilingualAppError('INVALID_PHONE_FORMAT', 400);

// Using custom bilingual messages
throw new BilingualAppError('INVALID_OTP', 400, {
  en: `Invalid OTP. ${attempts} attempts remaining`,
  ar: `رمز التحقق غير صحيح. ${attempts} محاولات متبقية`
});
```

## Migration Statistics

### Files Updated: 32 Total

**Controllers (18 files):**
- auth.controller.ts ✅
- provider.controller.ts ✅ 
- booking.controller.ts ✅
- payment.controller.ts ✅
- user.controller.ts ✅
- service.controller.ts ✅
- availability.controller.ts ✅
- service-management.controller.ts ✅
- admin.controller.ts ✅
- cache.controller.ts ✅
- dashboard.controller.ts ✅
- gamification.controller.ts ✅
- image.controller.ts ✅
- notification.controller.ts ✅
- performance.controller.ts ✅
- realtime.controller.ts ✅
- review.controller.ts ✅

**Middleware (4 files):**
- enhanced-error.middleware.ts ✅
- file-validation.middleware.ts ✅
- provider.middleware.ts ✅
- resource-ownership.middleware.ts ✅

**Services (6 files):**
- availability.service.ts ✅
- booking-audit.service.ts ✅
- image-storage.service.ts ✅
- prayer-time.service.ts ✅
- query-cache.service.ts ✅
- verification.service.ts ✅

**Utilities (2 files):**
- date-validation.ts ✅
- null-safety.ts ✅

**Types (1 file):**
- booking-errors.ts ✅

## Common Error Code Mappings

### Authentication Errors
| Old Message | New Error Code |
|-------------|----------------|
| "Phone number is required" | `PHONE_REQUIRED` |
| "Invalid phone number" | `INVALID_PHONE_FORMAT` |
| "Invalid OTP" | `INVALID_OTP` |
| "OTP expired" | `OTP_EXPIRED` |
| "Too many failed attempts" | `OTP_MAX_ATTEMPTS` |
| "Failed to send SMS" | `OTP_SEND_FAILED` |

### Authorization Errors  
| Old Message | New Error Code |
|-------------|----------------|
| "Unauthorized" | `INSUFFICIENT_PERMISSIONS` |
| "Token expired" | `TOKEN_EXPIRED` |
| "Invalid token" | `TOKEN_INVALID` |
| "User not found" | `USER_NOT_FOUND` |

### Validation Errors
| Old Message | New Error Code |
|-------------|----------------|
| "Required field missing" | `FIELD_REQUIRED` |
| "Invalid input" | `VALIDATION_ERROR` |
| "Invalid file type" | `FILE_TYPE_NOT_ALLOWED` |
| "File too large" | `FILE_TOO_LARGE` |

## BilingualAppError Constructor

```typescript
new BilingualAppError(
  errorCode: string,           // Error code from error-messages.ts
  statusCode: number = 500,    // HTTP status code
  customMessage?: Partial<BilingualMessage>, // Optional custom messages
  data?: any                   // Optional additional data
)
```

### Examples

**Basic Usage:**
```typescript
throw new BilingualAppError('USER_NOT_FOUND', 404);
```

**With Custom Message:**
```typescript
throw new BilingualAppError('INVALID_OTP', 400, {
  en: `Invalid OTP. ${attempts} attempts remaining`,
  ar: `رمز التحقق غير صحيح. ${attempts} محاولات متبقية`
});
```

**With Additional Data:**
```typescript
throw new BilingualAppError('VALIDATION_ERROR', 400, null, {
  field: 'phone',
  attempts: 3
});
```

## Response Format

**Client receives:**
```json
{
  "success": false,
  "error": "INVALID_OTP",
  "message": "Invalid verification code",
  "messageAr": "رمز التحقق غير صحيح", 
  "data": {
    "errorCode": 400,
    "category": "authentication",
    "timestamp": "2025-08-13T13:04:46.432Z",
    "language": "ar"
  }
}
```

## Language Detection

The bilingual error handler detects language from:

1. **JWT token language preference** (highest priority)
2. **Accept-Language header** (e.g., `Accept-Language: ar`)
3. **Query parameter** (e.g., `?lang=ar`)
4. **Default to Arabic** (Jordan market default)

## Testing with Postman

**To see Arabic errors:**
```
Headers:
Accept-Language: ar
```

**To see English errors:**
```  
Headers:
Accept-Language: en
```

## Available Error Codes

Error codes are defined in `src/utils/error-messages.ts`:

**Authentication:**
- `PHONE_REQUIRED`, `INVALID_PHONE_FORMAT`, `PHONE_NOT_JORDAN`
- `OTP_REQUIRED`, `INVALID_OTP`, `OTP_EXPIRED`, `OTP_MAX_ATTEMPTS`
- `TOKEN_REQUIRED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`

**Authorization:**
- `INSUFFICIENT_PERMISSIONS`, `ACCOUNT_SUSPENDED`, `USER_NOT_FOUND`

**Validation:**  
- `VALIDATION_ERROR`, `FIELD_REQUIRED`, `INVALID_INPUT`

**File Operations:**
- `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `INVALID_FILE_NAME`

## Best Practices

### ✅ Do:
```typescript
// Use predefined error codes when available
throw new BilingualAppError('INVALID_PHONE_FORMAT', 400);

// Provide custom messages for dynamic content  
const arMessage = `رمز التحقق غير صحيح. ${attempts} محاولات متبقية`;
throw new BilingualAppError('INVALID_OTP', 400, {
  en: `Invalid OTP. ${attempts} attempts remaining`,
  ar: arMessage
});
```

### ❌ Don't:
```typescript
// Don't use generic error codes for specific cases
throw new BilingualAppError('INTERNAL_SERVER_ERROR', 400);

// Don't hardcode English-only messages
throw new BilingualAppError('CUSTOM_ERROR', 400, {
  en: 'Something went wrong',
  ar: 'Something went wrong' // Same as English!
});
```

## Fallback Behavior

The enhanced bilingual error handler includes fallback logic:

1. **BilingualAppError**: Uses structured bilingual responses
2. **Standard Error**: Converts to bilingual format automatically  
3. **Unknown Error**: Falls back to generic `INTERNAL_SERVER_ERROR`

## Migration Verification

**Check for remaining AppError usage:**
```bash
grep -r "new AppError(" src/
grep -r "import.*AppError.*from.*error\.middleware" src/
```

**Should return no results if migration is complete.**

## Future Enhancements

1. **Add more error codes** to `error-messages.ts` as needed
2. **Implement parameter interpolation** for complex messages
3. **Add error categorization** for better client handling
4. **Consider client-side i18n** for even richer localization

---

**Migration completed:** 2025-08-13  
**Total files updated:** 32  
**Total changes:** ~150+ replacements