# Authentication Screens

Modern, bilingual authentication screens for BeautyCort using React Native Paper.

## Features

### PhoneAuthScreen
- 🎨 Clean, modern UI with React Native Paper components
- 📱 Jordan phone number validation (9 digits, starts with 77/78/79)
- 🌍 Arabic/English language toggle
- 📞 Auto-formatting for phone numbers (7X XXX XXXX)
- ⚡ Loading states and error handling
- 🔒 Privacy information display
- ✨ Smooth animations and transitions

### OTPVerifyScreen
- 🔢 6-digit OTP input with auto-focus
- ⏱️ Resend timer (60 seconds)
- 📋 Paste support for OTP codes
- 🔄 Auto-submit when all digits entered
- ❌ Clear error handling with specific messages
- 🔙 Change phone number option
- 💅 Consistent theming with PhoneAuthScreen

## Usage

### Basic Setup

```tsx
import PhoneAuthScreen from '@/screens/auth/PhoneAuthScreen';
import OTPVerifyScreen from '@/screens/auth/OTPVerifyScreen';

// In your navigation
<Stack.Navigator>
  <Stack.Screen 
    name="PhoneAuth" 
    component={PhoneAuthScreen}
    options={{ headerShown: false }}
  />
  <Stack.Screen 
    name="OTPVerify" 
    component={OTPVerifyScreen}
    options={{ headerShown: false }}
  />
</Stack.Navigator>
```

### Theme Integration

The screens use React Native Paper theming. Wrap your app with PaperProvider:

```tsx
import { Provider as PaperProvider } from 'react-native-paper';
import { lightTheme } from '@/theme';

<PaperProvider theme={lightTheme}>
  <App />
</PaperProvider>
```

### Language Support

Currently, language is hardcoded in the components. To make it dynamic:

1. Create a language context
2. Replace the hardcoded language state with context value
3. Update RTL layout when language changes

```tsx
// In PhoneAuthScreen.tsx
const { language } = useLanguage(); // Your language context
const t = translations[language];
```

## Customization

### Colors

The screens use theme colors from React Native Paper. Key colors used:
- `primary` - Main brand color (buttons, active states)
- `surface` - Card backgrounds
- `onSurface` - Text on surfaces
- `error` - Error states

### Validation Rules

Jordan phone numbers must:
- Start with 77, 78, or 79
- Be exactly 9 digits long
- Format: 7X XXX XXXX

To modify validation, update the `validatePhoneNumber` function in PhoneAuthScreen.

### Error Messages

Error types handled:
- Network errors
- Rate limiting
- Invalid credentials
- Expired OTP
- Server errors

Customize error messages in the `translations` object.

## API Integration

The screens use the `useAuth` hook from AuthContext:

```tsx
const { sendOTP, verifyOTP } = useAuth();

// Send OTP
const result = await sendOTP('+962771234567');

// Verify OTP
const result = await verifyOTP('+962771234567', '123456');
```

## Styling

### Key Style Properties

```tsx
// Rounded corners
borderRadius: 12 // Buttons, cards
borderRadius: 16 // Main cards
borderRadius: 40 // Icons

// Spacing
padding: 24 // Screen horizontal padding
marginBottom: 32 // Section spacing
gap: 12 // Input spacing

// Elevations
elevation: 0 // Flat surfaces
elevation: 1 // Cards
```

### Responsive Design

The screens use:
- `KeyboardAvoidingView` for keyboard handling
- `ScrollView` for small screens
- Flexible spacing with margins

## Testing

### Manual Testing Checklist

1. **Phone Input**
   - [ ] Can enter phone number
   - [ ] Auto-formatting works
   - [ ] Validation shows errors
   - [ ] Language toggle works

2. **OTP Input**
   - [ ] Auto-focus on first digit
   - [ ] Can paste 6-digit code
   - [ ] Backspace navigation works
   - [ ] Auto-submit works

3. **Error States**
   - [ ] Network error display
   - [ ] Invalid phone error
   - [ ] Invalid OTP error
   - [ ] Resend functionality

4. **Loading States**
   - [ ] Button shows loading
   - [ ] Inputs are disabled
   - [ ] No duplicate requests

## Accessibility

- All inputs have proper labels
- Error messages are announced
- Loading states are indicated
- Touch targets meet minimum size (44x44)

## Future Enhancements

1. **Biometric Authentication** - Add fingerprint/face ID after initial login
2. **Social Login** - Add Google/Apple sign in options
3. **Remember Device** - Skip OTP on trusted devices
4. **Animations** - Add micro-interactions for better UX
5. **Accessibility** - Add screen reader support