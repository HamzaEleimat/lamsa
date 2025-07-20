# Certificate Pinning Setup Guide

## Overview

Certificate pinning is implemented to prevent man-in-the-middle (MITM) attacks by ensuring the app only communicates with servers presenting expected SSL certificates.

## Getting Certificate Hashes

### Step 1: Extract Certificate from Server

```bash
# For production API
openssl s_client -connect api.lamsa.com:443 -servername api.lamsa.com < /dev/null | \
  openssl x509 -outform DER > api.lamsa.com.der

# For main domain
openssl s_client -connect lamsa.com:443 -servername lamsa.com < /dev/null | \
  openssl x509 -outform DER > lamsa.com.der
```

### Step 2: Generate Certificate Hashes

```bash
# Generate SHA-256 hash for API certificate
cat api.lamsa.com.der | openssl dgst -sha256 -binary | openssl enc -base64

# Generate SHA-256 hash for main domain certificate
cat lamsa.com.der | openssl dgst -sha256 -binary | openssl enc -base64
```

### Step 3: Get Backup Certificate Hashes

Also get the intermediate certificate hashes as backups:

```bash
# Get full certificate chain
openssl s_client -connect api.lamsa.com:443 -servername api.lamsa.com -showcerts < /dev/null > chain.pem

# Extract each certificate and generate hashes
# You'll need to manually split the chain.pem file and process each certificate
```

## Implementation

### 1. Update Certificate Hashes

Edit `/src/services/core/secureHttpClient.ts`:

```typescript
const CERTIFICATE_HASHES = {
  production: [
    // Replace with your actual certificate hashes
    'sha256/YourPrimaryCertificateHashHere=',
    'sha256/YourBackupCertificateHashHere=',
  ],
  staging: [
    'sha256/YourStagingCertificateHashHere=',
  ],
};
```

### 2. Configure for React Native SSL Pinning

For `react-native-ssl-pinning`, you need the actual certificate files:

1. Create directory: `android/app/src/main/assets/certs/`
2. Copy your `.der` certificate files there
3. For iOS, add certificates to the app bundle

### 3. Platform-Specific Setup

#### Android

Add to `android/app/src/main/assets/certs/`:
- `api.lamsa.com.der`
- `lamsa.com.der`

#### iOS

1. Add certificates to Xcode project
2. Ensure they're included in "Copy Bundle Resources"

## Testing Certificate Pinning

### 1. Test in Development

```javascript
// Temporarily enable pinning in development
const client = new PinnedHTTPClient('https://api.lamsa.com');
client.setPinningEnabled(true);

// Make a test request
try {
  const response = await client.get('/api/health');
  console.log('Certificate pinning working:', response);
} catch (error) {
  console.error('Certificate pinning failed:', error);
}
```

### 2. Test Certificate Rotation

1. Use an incorrect certificate hash
2. Verify the app refuses to connect
3. Update to correct hash
4. Verify connection succeeds

### 3. Test with Proxy Tools

1. Set up Charles Proxy or similar
2. Try to intercept HTTPS traffic
3. Verify the app refuses to connect when MITM is attempted

## Certificate Rotation Strategy

### 1. Plan Ahead

- Add new certificate hash before old one expires
- Keep both hashes active during transition
- Remove old hash after full deployment

### 2. Emergency Rotation

If certificates are compromised:

1. Deploy app update with new certificate hashes
2. Force app update through version check
3. Block old app versions at API level

### 3. Monitoring

Implement analytics to track:
- Certificate validation failures
- Which certificate hash is being used
- Client version distribution

## Best Practices

1. **Multiple Hashes**: Always include at least 2 certificate hashes (primary + backup)
2. **Pin Intermediate**: Consider pinning intermediate certificates for stability
3. **Version Control**: Track certificate updates in version control
4. **Documentation**: Document certificate expiry dates and rotation schedule
5. **Testing**: Test certificate pinning in every release
6. **Fallback Plan**: Have a mechanism to disable pinning in emergencies

## Troubleshooting

### Common Issues

1. **Certificate Expired**
   - Update certificate hashes
   - Deploy app update

2. **Wrong Certificate Format**
   - Ensure using DER format for the library
   - Check Base64 encoding

3. **Platform Differences**
   - iOS and Android may handle certificates differently
   - Test on both platforms

### Debug Mode

For debugging certificate issues:

```javascript
// Enable verbose logging
if (__DEV__) {
  console.log('Certificate Pinning Status:', client.getPinningStatus());
}
```

## Security Considerations

1. **Never** disable certificate pinning in production without careful consideration
2. **Never** log certificate hashes or full certificates
3. **Always** test certificate rotation before certificates expire
4. **Consider** having a remote config to manage certificate updates
5. **Monitor** certificate validation failures for potential attacks

## References

- [OWASP Certificate Pinning Guide](https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning)
- [Android Network Security Config](https://developer.android.com/training/articles/security-config)
- [iOS App Transport Security](https://developer.apple.com/documentation/security/preventing_insecure_network_connections)