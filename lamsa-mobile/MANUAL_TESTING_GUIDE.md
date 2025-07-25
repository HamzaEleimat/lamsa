# Manual Testing Guide for Dependency Updates

## Pre-Test Setup

### 1. Start the Development Environment

```bash
# Terminal 1: Start the API server (if needed)
cd lamsa-api
npm run dev

# Terminal 2: Start Expo
cd lamsa-mobile
npx expo start -c
```

### 2. Testing Devices
- **Physical Device**: Install Expo Go from App Store/Play Store
- **iOS Simulator**: Press `i` in Expo terminal
- **Android Emulator**: Press `a` in Expo terminal
- **Web Browser**: Press `w` in Expo terminal

## Test Execution Guide

### Test 1: App Startup & Navigation
1. **Launch the app**
   - Verify app loads without crashes
   - Check for console errors in Metro bundler
   - Verify splash screen displays correctly

2. **Initial Navigation**
   - Welcome screen loads
   - Language selector (Arabic/English) works
   - User type selection (Customer/Provider) displays

**Expected Result**: Smooth navigation without errors

### Test 2: Authentication Flow
1. **Phone Authentication**
   - Select "Customer" user type
   - Enter Jordanian phone number (e.g., 079XXXXXXX)
   - Verify number format validation
   - Mock OTP entry (if backend not connected)

2. **Error Handling**
   - Try invalid phone numbers
   - Test with non-Jordanian prefixes
   - Verify error messages display correctly

**Expected Result**: Proper validation and error handling

### Test 3: Map Features (Critical for react-native-maps 1.21.0)
1. **Provider Map View**
   - Navigate to provider search
   - Verify map loads correctly
   - Test zoom in/out gestures
   - Pan around the map
   - Check provider markers display

2. **Location Services**
   - Grant location permission when prompted
   - Verify "current location" button works
   - Test proximity search

**Expected Result**: Maps work with New Architecture

### Test 4: Localization & RTL
1. **Language Switching**
   - Switch to Arabic
   - Verify RTL layout applies
   - Check all text is properly translated
   - Test navigation in RTL mode

2. **Component Mirroring**
   - Verify buttons align correctly
   - Check text input direction
   - Validate icon positions

**Expected Result**: Proper RTL support

### Test 5: UI Components & Theming
1. **React Native Paper Components**
   - Test buttons, inputs, cards
   - Verify pink theme colors apply
   - Check Material Design 3 styling

2. **Custom Components**
   - Test date/time pickers
   - Verify calendar displays
   - Check flash messages

**Expected Result**: Consistent theming

### Test 6: Performance Checks
1. **Screen Transitions**
   - Navigate between screens rapidly
   - Check for janky animations
   - Monitor for memory warnings

2. **List Scrolling**
   - Test service lists
   - Scroll provider lists
   - Check booking history (if available)

**Expected Result**: Smooth performance

## Common Issues & Solutions

### Issue 1: Maps not loading
- **Solution**: Ensure react-native-maps 1.21.0 is properly linked
- Run `npx expo prebuild --clean` if using custom development client

### Issue 2: Metro bundler errors
- **Solution**: Clear cache with `npx expo start -c`
- Delete node_modules and reinstall

### Issue 3: Navigation crashes
- **Solution**: Check React Navigation 7 migration
- Verify screen names match navigation config

### Issue 4: Localization not working
- **Solution**: Check expo-localization plugin
- Verify translation files are loaded

## Test Results Documentation

For each test category, document:
1. ✅ Pass / ❌ Fail / ⚠️ Partial
2. Description of any issues
3. Screenshots of problems
4. Console error messages
5. Device/platform where issue occurred

## Post-Test Checklist

- [ ] All core features tested
- [ ] No console errors or warnings
- [ ] Performance acceptable
- [ ] Maps working correctly
- [ ] Localization functioning
- [ ] Navigation smooth
- [ ] Authentication flow complete
- [ ] UI components rendered properly

## Reporting Issues

When reporting issues, include:
1. Exact steps to reproduce
2. Expected vs actual behavior
3. Device info (iOS/Android version)
4. Screenshots/videos
5. Console logs
6. Related code files