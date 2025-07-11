# Supabase Integration for BeautyCort Mobile

This directory contains the Supabase client configuration and authentication utilities for the BeautyCort React Native app.

## Setup

1. **Install required dependencies:**
   ```bash
   npm install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and update with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Import and use:**
   ```typescript
   import { auth, supabase } from '@/lib/supabase';
   ```

## Features

### Authentication Functions

- **`sendOTP(phone)`** - Send OTP to a phone number
- **`verifyOTP(phone, otp)`** - Verify OTP code
- **`getSession()`** - Get current session
- **`signOut()`** - Sign out user
- **`getUser()`** - Get current user
- **`updateProfile(updates)`** - Update user profile

### Error Handling

All auth functions return a consistent response format:
```typescript
{
  success: boolean;
  data: T | null;
  error: string | null;
}
```

Error types are categorized for better UX:
- `NETWORK_ERROR` - Network connectivity issues
- `INVALID_CREDENTIALS` - Wrong OTP or credentials
- `OTP_EXPIRED` - OTP code has expired
- `RATE_LIMITED` - Too many attempts
- `UNKNOWN_ERROR` - Other errors

### Session Persistence

Sessions are automatically persisted using React Native AsyncStorage. The app will:
- Restore session on app launch
- Refresh tokens automatically
- Handle app state changes (background/foreground)

## Usage Examples

### Basic OTP Flow
```typescript
// Send OTP
const result = await auth.sendOTP('+962777123456');
if (result.success) {
  console.log('OTP sent!');
} else {
  console.error('Error:', result.error);
}

// Verify OTP
const verifyResult = await auth.verifyOTP('+962777123456', '123456');
if (verifyResult.success) {
  console.log('Logged in!', verifyResult.data);
}
```

### Using the Auth Hook
```typescript
import { useAuth } from '@/lib/supabase.example';

function MyComponent() {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <Text>Loading...</Text>;
  if (!isAuthenticated) return <LoginScreen />;
  
  return <Text>Welcome {user.phone}!</Text>;
}
```

### Protected API Calls
```typescript
// Get auth token for API calls
const { session } = await auth.getSession();
if (session) {
  const response = await fetch('your-api/endpoint', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });
}
```

### Listen to Auth Changes
```typescript
useEffect(() => {
  const unsubscribe = auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event); // 'SIGNED_IN', 'SIGNED_OUT', etc.
    if (session) {
      // User is logged in
    } else {
      // User is logged out
    }
  });
  
  return () => unsubscribe();
}, []);
```

## Database Operations

Basic database helpers are included:
```typescript
import { db } from '@/lib/supabase';

// Get user profile
const { data, error } = await db.getUserProfile(userId);

// Update user profile
const { data: updated } = await db.updateUserProfile(userId, {
  name: 'New Name',
  language: 'en'
});
```

## Error Handling Best Practices

```typescript
import { categorizeAuthError, AuthErrorType } from '@/lib/supabase';

try {
  const result = await auth.verifyOTP(phone, otp);
  if (!result.success) {
    const errorType = categorizeAuthError({ message: result.error });
    
    switch (errorType) {
      case AuthErrorType.NETWORK_ERROR:
        showAlert('No internet connection');
        break;
      case AuthErrorType.INVALID_CREDENTIALS:
        showAlert('Invalid OTP code');
        break;
      case AuthErrorType.OTP_EXPIRED:
        showAlert('OTP expired, please request a new one');
        break;
      case AuthErrorType.RATE_LIMITED:
        showAlert('Too many attempts, please wait');
        break;
      default:
        showAlert('Something went wrong');
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Security Notes

1. **Never expose service keys** - Only use the anon key in client apps
2. **Validate phone numbers** - Ensure proper international format
3. **Handle rate limits** - Implement retry logic with exponential backoff
4. **Secure storage** - AsyncStorage is used for session persistence
5. **Token refresh** - Tokens are automatically refreshed before expiry

## Troubleshooting

### Common Issues

1. **"Network request failed"**
   - Check internet connection
   - Verify Supabase URL is correct
   - Ensure URL polyfill is imported

2. **"Invalid phone number"**
   - Use international format: +962777123456
   - Verify phone number is registered with SMS provider

3. **"OTP expired"**
   - OTPs are valid for 60 seconds by default
   - Request a new OTP if expired

4. **Session not persisting**
   - Ensure AsyncStorage is properly installed
   - Check if app has storage permissions

## Testing

For development/testing without SMS:
1. Set up Supabase Auth to use a test SMS provider
2. Use test phone numbers configured in Supabase
3. Implement mock auth for development builds