# Localization Fix for Expo Go

## Issue
The app was using `react-native-localize` which is not compatible with Expo Go, causing the error:
```
ERROR [runtime not ready]: Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'RNLocalize' could not be found
```

## Solution Applied

1. **Replaced react-native-localize with expo-localization**
   - Updated `src/i18n/index.ts` to use `expo-localization`
   - Changed from `Localization.getLocales()[0]` to `Localization.locale`

2. **Removed react-native-localize dependency**
   - Removed from package.json
   - Removed alias from metro.config.js

3. **Files Modified**:
   - `src/i18n/index.ts` - Updated import and usage
   - `package.json` - Removed react-native-localize dependency
   - `metro.config.js` - Removed localize alias

## Next Steps

1. **Clear cache and reinstall**:
   ```bash
   # Clear all caches
   rm -rf node_modules
   npm cache clean --force
   npx expo start -c
   
   # Reinstall dependencies
   npm install
   ```

2. **Start with tunnel mode**:
   ```bash
   npm run start:tunnel
   ```

## Why This Works

- `expo-localization` is built into Expo SDK and works with Expo Go
- `react-native-localize` requires native code that isn't available in Expo Go
- The API is similar, so minimal code changes were needed

## Testing

After clearing cache and reinstalling:
1. The app should start without the RNLocalize error
2. Language detection should still work correctly
3. Arabic/English switching should function as before