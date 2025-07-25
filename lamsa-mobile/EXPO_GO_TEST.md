# Testing Lamsa Mobile App with Expo Go

## Current Setup Status

### ✅ API Server
- Running on: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`
- Status: **RUNNING**

### ✅ Mobile App Configuration
- API URL configured: `http://192.168.1.16:3000/api`
- Supabase configured with provided credentials
- All required Expo plugins installed

### ✅ Expo Development Server
- Running on: `http://localhost:8081`
- Status: **STARTING UP**

## How to Test on Your Phone

1. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Connect to the same Wi-Fi network** as your computer (192.168.1.16)

3. **Scan the QR code** that appears in the terminal where you ran `npm start`

4. **Alternative connection methods**:
   - In the terminal, press `w` to open in web browser
   - Press `a` to open in Android emulator
   - Press `i` to open in iOS simulator

## Test Checklist

- [ ] App loads in Expo Go
- [ ] Language switcher works (Arabic/English)
- [ ] API health check from app
- [ ] Supabase connection test
- [ ] Phone number input validation
- [ ] OTP screen displays

## Troubleshooting

### If API connection fails:
1. Ensure your phone is on the same network
2. Check firewall settings allow port 3000
3. Try accessing `http://192.168.1.16:3000/api/health` from your phone's browser

### If Expo Go can't connect:
1. Check that both devices are on the same network
2. Try using tunnel mode: `npm start -- --tunnel`
3. Restart the Expo server with cache clear: `npm start -- -c`

## Environment Variables
- All environment variables are properly configured in `.env`
- API URL uses local IP address for mobile device access
- Supabase credentials are active and valid