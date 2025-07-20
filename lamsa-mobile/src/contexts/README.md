# AuthContext Documentation

The AuthContext provides a centralized authentication state management solution for the Lamsa mobile app using React Context API with Supabase integration.

## Features

- 🔐 Phone-based OTP authentication
- 💾 Automatic session persistence with AsyncStorage
- 🔄 Auto token refresh
- 👤 User profile management
- 🛡️ Auth guards for protected routes
- 📱 React Native optimized
- 🏗️ TypeScript support

## Setup

1. **Wrap your app with AuthProvider:**

```tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <YourAppContent />
    </AuthProvider>
  );
}
```

2. **Configure environment variables:**

Ensure your `.env` file has the required Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Usage

### Basic Authentication Flow

```tsx
import { useAuth } from '@/contexts/AuthContext';

function LoginScreen() {
  const { sendOTP, verifyOTP, isLoading } = useAuth();
  
  // Send OTP
  const handleSendOTP = async (phone: string) => {
    const result = await sendOTP(phone);
    if (result.success) {
      // OTP sent successfully
    } else {
      // Handle error: result.error
    }
  };
  
  // Verify OTP
  const handleVerifyOTP = async (phone: string, otp: string) => {
    const result = await verifyOTP(phone, otp);
    if (result.success) {
      // User logged in successfully
    } else {
      // Handle error: result.error
    }
  };
}
```

### Accessing User Data

```tsx
function ProfileScreen() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginPrompt />;
  }
  
  return (
    <View>
      <Text>Welcome {user.name}</Text>
      <Text>Phone: {user.phone}</Text>
    </View>
  );
}
```

### Protected Routes with Navigation

```tsx
import { useAuth } from '@/contexts/AuthContext';

function AppNavigator() {
  const { isAuthenticated, isInitialized, user } = useAuth();
  
  if (!isInitialized) {
    return <SplashScreen />;
  }
  
  return (
    <NavigationContainer>
      {isAuthenticated ? (
        user?.role === 'provider' ? (
          <ProviderNavigator />
        ) : (
          <CustomerNavigator />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
```

### Using Auth Guards

```tsx
import { AuthGuard, ProviderGuard } from '@/contexts/AuthContext';

// Protect content that requires authentication
function ProtectedContent() {
  return (
    <AuthGuard fallback={<LoginScreen />}>
      <YourProtectedContent />
    </AuthGuard>
  );
}

// Protect provider-only content
function ProviderDashboard() {
  return (
    <ProviderGuard fallback={<AccessDenied />}>
      <ProviderContent />
    </ProviderGuard>
  );
}
```

### Profile Updates

```tsx
function EditProfile() {
  const { user, updateProfile } = useAuth();
  
  const handleUpdate = async () => {
    const result = await updateProfile({
      name: 'New Name',
      language: 'en'
    });
    
    if (result.success) {
      // Profile updated
    } else {
      // Handle error: result.error
    }
  };
}
```

### Logout

```tsx
function SettingsScreen() {
  const { logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    // User will be automatically redirected to login
  };
}
```

## API Reference

### useAuth Hook

Returns the complete auth context:

```tsx
const {
  // State
  user,              // Current user object or null
  session,           // Supabase session or null
  isAuthenticated,   // Boolean indicating if user is logged in
  isLoading,         // Boolean for loading states
  isInitialized,     // Boolean indicating if auth check is complete
  
  // Functions
  sendOTP,           // Send OTP to phone number
  verifyOTP,         // Verify OTP code
  logout,            // Sign out user
  updateProfile,     // Update user profile
  refreshSession,    // Manually refresh auth session
  checkAuth,         // Re-check authentication status
  clearAuth,         // Clear auth data (internal use)
} = useAuth();
```

### Helper Hooks

```tsx
// Get just the user
const user = useUser();

// Get just auth status
const isAuthenticated = useIsAuthenticated();
```

### Types

```typescript
interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  avatar_url?: string;
  language: 'ar' | 'en';
  role: 'customer' | 'provider';
  created_at: string;
  updated_at: string;
}

interface Provider extends User {
  role: 'provider';
  provider_profile?: {
    id: string;
    business_name_ar: string;
    business_name_en: string;
    owner_name: string;
    latitude: number;
    longitude: number;
    address: {
      street: string;
      city: string;
      district: string;
      country: string;
    };
    verified: boolean;
    active: boolean;
    rating?: number;
    review_count?: number;
  };
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}
```

## Error Handling

All auth functions return a consistent response format:

```typescript
{
  success: boolean;
  error?: string;
}
```

Example error handling:

```tsx
const result = await verifyOTP(phone, otp);

if (!result.success) {
  switch (result.error) {
    case 'Invalid OTP':
      Alert.alert('Wrong Code', 'Please check the code and try again');
      break;
    case 'OTP expired':
      Alert.alert('Code Expired', 'Please request a new code');
      break;
    default:
      Alert.alert('Error', result.error || 'Something went wrong');
  }
}
```

## Best Practices

1. **Always check isInitialized before rendering auth-dependent UI:**
   ```tsx
   if (!isInitialized) {
     return <LoadingScreen />;
   }
   ```

2. **Use AuthGuard for protected screens instead of manual checks:**
   ```tsx
   // Good
   <AuthGuard fallback={<LoginScreen />}>
     <ProtectedScreen />
   </AuthGuard>
   
   // Avoid
   {isAuthenticated ? <ProtectedScreen /> : <LoginScreen />}
   ```

3. **Handle loading states in UI:**
   ```tsx
   <Button
     onPress={handleLogin}
     disabled={isLoading}
   >
     {isLoading ? <ActivityIndicator /> : <Text>Login</Text>}
   </Button>
   ```

4. **Format phone numbers for Jordan:**
   ```tsx
   const formatPhoneForJordan = (phone: string) => {
     // Remove non-digits
     const digits = phone.replace(/\D/g, '');
     // Add +962 if needed
     if (digits.startsWith('7')) {
       return `+962${digits}`;
     }
     return `+${digits}`;
   };
   ```

## Troubleshooting

### Session not persisting after app restart
- Ensure AsyncStorage is properly installed
- Check that `persistSession: true` is set in Supabase config

### Auth state not updating
- Verify AuthProvider is at the root of your app
- Check that you're using the hook inside AuthProvider

### OTP not being received
- Verify phone number format (+962XXXXXXXXX)
- Check Supabase SMS provider configuration
- In development, use mock OTP from API response

### User profile not loading
- Ensure users table exists in Supabase
- Check RLS policies allow user to read own profile
- Verify profile is created on first login