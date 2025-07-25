# Running Lamsa Mobile on Expo Go

This guide provides step-by-step instructions to run the Lamsa mobile app using Expo Go.

## Quick Start

```bash
# 1. Get your IP address
npm run get-ip

# 2. Update .env with your IP and Supabase credentials

# 3. Start the app
npm start
# OR use the helper script
./start-expo.sh
```

## Detailed Setup

### Step 1: Install Expo Go

Download Expo Go on your mobile device:
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Step 2: Configure Environment

1. **Get your local IP address**:
   ```bash
   npm run get-ip
   ```

2. **Edit `.env` file**:
   ```bash
   # Supabase credentials (get from https://app.supabase.com)
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   
   # Use your local IP address (from step 1)
   EXPO_PUBLIC_API_URL=http://192.168.x.x:3001/api
   ```

### Step 3: Start Backend API

In a separate terminal:
```bash
cd ../lamsa-api
npm run dev
```

### Step 4: Start Expo

```bash
# Standard start
npm start

# With tunnel (if network issues)
npm run start:tunnel

# Clear cache and start
npm run start:clear
```

### Step 5: Connect Your Phone

1. **Scan QR Code**: Open Expo Go and scan the QR code
2. **Manual Entry**: Enter `exp://YOUR-IP:8081` in Expo Go

## Features to Test

### Authentication
- Phone: Use Jordanian format (07XXXXXXXX)
- OTP: In dev mode, any 6-digit code works (e.g., 123456)

### Language Support
- Toggle Arabic/English in settings
- Verify RTL layout in Arabic mode

### User Types
- Test both Customer and Provider flows
- Provider onboarding process

## Common Issues

### Cannot Connect to Server

**Problem**: "Unable to connect to development server"

**Solutions**:
1. Ensure phone and computer are on same Wi-Fi
2. Use computer's IP, not `localhost`
3. Try tunnel mode: `npm run start:tunnel`
4. Check firewall settings for ports 3001 and 8081

### API Connection Failed

**Problem**: "Network request failed"

**Solutions**:
1. Verify API is running: `cd ../lamsa-api && npm run dev`
2. Check `.env` has correct IP address
3. Test API directly: `http://YOUR-IP:3001/api/health`

### Metro Bundler Issues

**Problem**: "Metro has encountered an error"

**Solutions**:
```bash
# Clear everything and restart
rm -rf node_modules
npm install
npm run start:clear
```

### App Crashes on Launch

**Check**:
1. Console logs in terminal
2. Expo Developer Tools logs
3. All environment variables are set
4. Supabase project is active

## Development Tips

### Enable Fast Refresh
Shake device → "Enable Fast Refresh"

### Debug with Chrome
Shake device → "Debug Remote JS"

### View Network Requests
Use React Native Debugger or Flipper

### Check Logs
- Terminal: Metro bundler logs
- Browser: Expo Developer Tools logs

## Project Structure

```
src/
├── screens/          # All app screens
├── components/       # Reusable components
├── navigation/       # Navigation setup
├── services/         # API and services
├── contexts/         # Global state
├── i18n/            # Translations
└── config/          # App configuration
```

## Available Scripts

```bash
npm start              # Start Expo
npm run android        # Run on Android
npm run ios           # Run on iOS
npm run web           # Run in browser
npm run get-ip        # Get local IP address
npm run start:tunnel  # Start with tunnel
npm run start:clear   # Clear cache and start
```

## Environment Variables

All mobile environment variables must be prefixed with `EXPO_PUBLIC_`:

```
EXPO_PUBLIC_SUPABASE_URL      # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY # Supabase anonymous key
EXPO_PUBLIC_API_URL           # Backend API URL
EXPO_PUBLIC_ENV               # Environment (development/production)
```

## Next Steps

After confirming the app works in Expo Go:

1. **Create Expo Account**: 
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Initialize EAS Build**:
   ```bash
   eas init
   ```

3. **Create Development Build** (for features not in Expo Go):
   ```bash
   eas build --profile development --platform ios
   eas build --profile development --platform android
   ```

## Useful Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Project Issues](https://github.com/your-org/lamsa/issues)

## Support

If you need help:
1. Check the [troubleshooting guide](./EXPO_GO_SETUP.md)
2. Review error messages carefully
3. Ensure all prerequisites are met
4. Check the [main project README](../README.md)