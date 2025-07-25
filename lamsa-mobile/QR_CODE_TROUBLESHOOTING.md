# QR Code Connection Troubleshooting Guide

## Common Issues and Solutions

### 1. Network Connection Issues

**Problem**: Phone cannot connect to development server through QR code.

**Solutions**:
- Ensure both phone and computer are on the same Wi-Fi network
- Check that your firewall is not blocking ports 3000 (API) and 8081 (Expo)
- Try disabling VPN connections on both devices
- Run `npm run get-ip` to verify the correct IP address

### 2. API Connection Failures

**Problem**: Mobile app cannot reach the API server.

**Checklist**:
- ✅ API server is running: `cd lamsa-api && npm run dev`
- ✅ API is accessible at: `http://192.168.1.16:3000/api/health`
- ✅ `.env` file has correct IP: `EXPO_PUBLIC_API_URL=http://192.168.1.16:3000`
- ✅ No trailing `/api` in the EXPO_PUBLIC_API_URL (it's added automatically)

### 3. Expo Go App Issues

**Problem**: Expo Go app shows errors or blank screen.

**Solutions**:
```bash
# Clear cache and restart
npm run start:clear

# Use tunnel mode (slower but more reliable)
npm run start:tunnel

# Reinstall dependencies
rm -rf node_modules
npm install
```

### 4. Configuration Issues

**Problem**: App cannot fetch configuration from API.

**What happens**:
- The app tries to fetch config from `/api/config/mobile`
- In development mode, it falls back to environment variables
- Check console logs for "Development mode: Using local configuration"

### 5. Platform-Specific Issues

**iOS (iPhone/iPad)**:
- Make sure you have the latest Expo Go app
- Check Settings > Privacy > Local Network - ensure Expo Go has permission
- Try using the manual connection option in Expo Go

**Android**:
- Enable "Developer options" and "USB debugging" if using USB
- Check that Expo Go has all required permissions
- Try using the tunnel option: `npm run start:tunnel`

### 6. Quick Diagnostic Commands

```bash
# Check if API is running and accessible
curl http://192.168.1.16:3000/api/health

# Check your current IP
npm run get-ip

# Test API config endpoint
curl http://192.168.1.16:3000/api/config/mobile

# Start with clean cache
npm run start:clear

# Use tunnel mode (works across networks)
npm run start:tunnel
```

### 7. Environment Setup Verification

Run this checklist:

1. **API Server**:
   ```bash
   cd lamsa-api
   cat .env | grep PORT  # Should show: PORT=3000
   npm run dev  # Should start on port 3000
   ```

2. **Mobile App**:
   ```bash
   cd lamsa-mobile
   cat .env | grep EXPO_PUBLIC_API_URL  # Should show your IP:3000
   npm start
   ```

3. **Test Connection**:
   - Open browser: `http://[YOUR_IP]:3000/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

### 8. If Nothing Works

Try the tunnel mode which works across different networks:
```bash
npm run start:tunnel
```

This creates a public URL that works even if devices are on different networks, though it's slower than local connection.

### Need More Help?

1. Check the Expo Go console logs for specific errors
2. Run `expo doctor` to check for common issues
3. Look at the API server logs for connection attempts
4. Try connecting via web browser first: `npm run web`