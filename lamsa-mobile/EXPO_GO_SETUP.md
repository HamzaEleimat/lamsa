# Expo Go Setup Guide for Lamsa Mobile App

This guide will help you run the Lamsa mobile app on Expo Go for preview and testing.

## Prerequisites

1. **Install Expo Go** on your mobile device:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Create an Expo account** (optional but recommended):
   - Visit [expo.dev](https://expo.dev) and sign up
   - This allows you to access your app from anywhere

## Configuration Steps

### 1. Configure Environment Variables

Edit the `.env` file in the `lamsa-mobile` directory:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# API Configuration
# IMPORTANT: For local development, use your machine's IP address, not localhost
# Find your IP:
# - Mac/Linux: ifconfig | grep inet
# - Windows: ipconfig
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000
```

### 2. Start the API Server

In a separate terminal, start the backend API:

```bash
cd ../lamsa-api
npm run dev
```

The API will run on port 3000 by default.

### 3. Configure API for Mobile Access

The mobile app uses a secure configuration service. Make sure your API has the `/api/config/mobile` endpoint configured. This endpoint should return:

```json
{
  "supabaseUrl": "your-supabase-url",
  "supabaseAnonKey": "your-anon-key",
  "apiBaseUrl": "http://your-ip:3000",
  "environment": "development",
  "features": {
    "enableOTP": true,
    "enablePushNotifications": true,
    "enableAnalytics": true
  }
}
```

### 4. Start Expo Development Server

```bash
cd lamsa-mobile
npm start
# or
expo start
```

This will:
- Start the Metro bundler
- Open Expo Developer Tools in your browser
- Display a QR code in the terminal

### 5. Connect Your Mobile Device

#### Option A: Scan QR Code (Recommended)
1. Open Expo Go app on your phone
2. Scan the QR code displayed in:
   - Terminal window, or
   - Expo Developer Tools in browser

#### Option B: Manual Connection
1. Make sure your phone and computer are on the same Wi-Fi network
2. In Expo Go, tap "Enter URL manually"
3. Enter: `exp://YOUR_IP_ADDRESS:8081`

#### Option C: Use Tunnel (If network issues)
```bash
expo start --tunnel
```
This uses ngrok to create a tunnel, useful if you can't connect locally.

## Testing Key Features

### 1. Authentication Flow
- Enter a Jordanian phone number (format: 07XXXXXXXX)
- In development mode, any OTP code works (e.g., 123456)
- Test both customer and provider flows

### 2. Language Switching
- Toggle between Arabic and English
- Verify RTL layout switches correctly in Arabic mode

### 3. Navigation
- Test bottom tab navigation
- Verify all screens load correctly

## Troubleshooting

### Cannot connect to development server
- Ensure phone and computer are on same network
- Use your computer's IP address, not localhost
- Try tunnel mode: `expo start --tunnel`
- Check firewall settings

### API connection errors
- Verify API is running on port 3000
- Check CORS configuration in Express server
- Ensure mobile app can reach your IP address

### Metro bundler issues
- Clear cache: `expo start -c`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### App crashes on launch
- Check console logs in Expo Developer Tools
- Verify all environment variables are set
- Ensure Supabase credentials are valid

## Development Tips

1. **Hot Reload**: Shake your device to open developer menu and enable Fast Refresh

2. **Debug Mode**: Shake device → "Debug Remote JS" to use Chrome DevTools

3. **View Logs**: 
   - Terminal shows Metro bundler logs
   - Expo Developer Tools show runtime logs

4. **Network Requests**: Use React Native Debugger or Flipper to inspect API calls

## Next Steps

Once you've verified the app works in Expo Go:

1. **Create Expo Account**: Run `expo login` to save your projects
2. **Initialize EAS**: Run `eas init` to prepare for builds
3. **Custom Development Client**: Consider creating a development build for features not supported in Expo Go (like SSL pinning)

## Useful Commands

```bash
# Start with clear cache
expo start -c

# Start with tunnel (for network issues)
expo start --tunnel

# Run on specific platform
expo start --ios
expo start --android

# Check Expo CLI version
expo --version

# Upgrade Expo SDK
expo upgrade
```

## Support

If you encounter issues:
1. Check Expo documentation: https://docs.expo.dev
2. Review error messages in terminal and Expo Developer Tools
3. Ensure all prerequisites are properly configured