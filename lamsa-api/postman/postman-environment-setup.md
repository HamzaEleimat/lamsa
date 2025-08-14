# Postman Environment Setup Guide

## Overview

This guide explains how to set up and manage Postman environments for testing the Lamsa API across different stages of development.

## Environment Files

The Lamsa API includes three pre-configured environments:

1. **development.postman_environment.json** - Local development
2. **staging.postman_environment.json** - Staging server testing  
3. **production.postman_environment.json** - Production testing (use with caution)

## Setting Up Your Local Development Environment

### Prerequisites

Before setting up Postman, ensure you have:

1. **Node.js and npm installed**
   ```bash
   node --version  # Should be v14 or higher
   npm --version   # Should be v6 or higher
   ```

2. **Lamsa API dependencies installed**
   ```bash
   cd lamsa-api
   npm install
   ```

3. **Supabase configured**
   ```bash
   # Check .env file exists
   ls -la lamsa-api/.env
   
   # Verify required variables are set
   grep SUPABASE_URL lamsa-api/.env
   grep SUPABASE_ANON_KEY lamsa-api/.env
   ```

4. **Database initialized**
   ```bash
   cd lamsa-api
   ./setup-database.sh  # Run the setup script
   ```

### Starting the Development Server

1. **Start the API server:**
   ```bash
   cd lamsa-api
   npm run dev
   ```
   
   You should see:
   ```
   Server started on port 3001
   Supabase connected successfully
   ```

2. **Verify server is running:**
   ```bash
   curl http://localhost:3001/api/health
   ```

## Importing Environments in Postman

### Method 1: Direct Import

1. Open Postman
2. Click **Environments** in the left sidebar
3. Click **Import** button
4. Select the environment file:
   - Navigate to `lamsa-api/postman/environments/`
   - Choose `development.postman_environment.json`
5. Click **Import**

### Method 2: Drag and Drop

1. Open your file explorer
2. Navigate to `lamsa-api/postman/environments/`
3. Drag the environment file directly into Postman

### Method 3: Copy-Paste JSON

1. Open the environment file in a text editor
2. Copy all contents
3. In Postman, click **Environments** → **Create Environment**
4. Click **Bulk Edit** (top right)
5. Paste the JSON content
6. Click **Save**

## Environment Variables Explained

### Core Variables

| Variable | Description | Development Value | Notes |
|----------|-------------|------------------|-------|
| `api_url` | Base API URL | `http://localhost:3001` | Change port if needed |
| `mock_mode` | Enable mock responses | `true` | Set to `false` for real SMS/payments |

### Authentication Variables

| Variable | Description | How It's Set | Usage |
|----------|-------------|--------------|-------|
| `jwt_token` | Customer auth token | Auto-set after login | Used in Authorization header |
| `provider_token` | Provider auth token | Auto-set after provider login | For provider-specific endpoints |
| `admin_token` | Admin auth token | Auto-set after admin login | For admin operations |
| `refresh_token` | Token refresh | Auto-set with JWT | For refreshing expired tokens |

### Test Data Variables

| Variable | Description | Example | Can Modify? |
|----------|-------------|---------|-------------|
| `customer_phone` | Test customer phone | `+962771234567` | Yes, use valid format |
| `provider_phone` | Test provider phone | `+962791234567` | Yes, use valid format |
| `test_otp` | Mock OTP code | `123456` | Only in dev mode |
| `customer_name` | Test customer name | `Test Customer` | Yes |
| `business_name_ar` | Arabic business name | `صالون الجمال` | Yes |
| `business_name_en` | English business name | `Beauty Salon` | Yes |

### Dynamic Variables

These are set automatically by test scripts:

| Variable | Set By | Used For |
|----------|--------|----------|
| `customer_id` | Customer registration | Customer-specific operations |
| `provider_id` | Provider registration | Provider operations |
| `booking_id` | Booking creation | Booking management |
| `service_id` | Service creation | Service operations |
| `payment_id` | Payment initialization | Payment confirmation |

## Configuring for Different Scenarios

### Scenario 1: Testing with Real SMS (Development)

1. Edit environment variables:
   ```json
   {
     "mock_mode": "false"
   }
   ```

2. Ensure Twilio is configured in `.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### Scenario 2: Testing with Different Port

If your API runs on a different port:

1. In Postman, edit environment
2. Change `api_url` to `http://localhost:YOUR_PORT`
3. Save environment

### Scenario 3: Testing Against Remote Server

1. Create a new environment or edit staging
2. Set `api_url` to remote server URL
3. Disable `mock_mode`
4. Use real phone numbers

### Scenario 4: Load Testing Setup

For load testing with multiple users:

1. Duplicate the development environment
2. Create arrays of test data:
   ```javascript
   // In Pre-request Script
   const phones = [
     "+962771234567",
     "+962771234568",
     "+962771234569"
   ];
   pm.environment.set("customer_phone", 
     phones[Math.floor(Math.random() * phones.length)]
   );
   ```

## Managing Secrets

### Never Commit Sensitive Data

**DO NOT** put real credentials in environment files that will be committed:

❌ Wrong:
```json
{
  "key": "production_api_key",
  "value": "sk_live_abcd1234"  // Never commit this!
}
```

✅ Correct:
```json
{
  "key": "production_api_key",
  "value": ""  // Leave empty in committed file
}
```

### Using Postman Cloud (Optional)

For team collaboration with secrets:

1. Create a Postman account
2. Create a team workspace
3. Store environments in cloud
4. Set sensitive variables as "Secret" type
5. Share workspace with team

## Environment-Specific Configurations

### Development Environment

Optimized for local testing:
- Mock mode enabled
- Test OTP provided
- Verbose error messages
- No rate limiting

### Staging Environment

Mirrors production closely:
- Real SMS/email services
- Actual payment gateway (test mode)
- Rate limiting enabled
- Production-like data

### Production Environment

Use with extreme caution:
- All services are real
- Real payments processed
- Real customer data
- Full security enabled

## Switching Between Environments

### Quick Switch

1. Click environment dropdown (top right)
2. Select desired environment
3. Run your requests

### Comparing Environments

1. Click **Environments** in sidebar
2. Select an environment
3. Click **...** → **Duplicate**
4. Compare side by side

### Bulk Updates

1. Select environment
2. Click **Bulk Edit**
3. Find and replace values
4. Save changes

## Troubleshooting Environment Issues

### Issue: Variable Not Resolving

**Symptom**: You see `{{variable_name}}` in request instead of value

**Solutions**:
1. Check environment is selected
2. Verify variable exists in environment
3. Check for typos in variable name
4. Ensure variable has a value

### Issue: Wrong Environment Active

**Symptom**: Requests going to wrong server

**Solutions**:
1. Check environment dropdown
2. Verify `api_url` value
3. Look for hardcoded URLs in requests

### Issue: Token Expired

**Symptom**: 401 Unauthorized errors

**Solutions**:
1. Re-run authentication flow
2. Check token expiration time
3. Use refresh token endpoint
4. Clear and reset token variable

### Issue: Variables Not Saving

**Symptom**: Variables reset after requests

**Solutions**:
1. Check test scripts for errors
2. Ensure environment isn't read-only
3. Click "Persist" if using temporary variables
4. Check Postman console for errors

## Best Practices

### 1. Version Control

- Commit environment files without sensitive data
- Document any special setup needed
- Use git to track changes

### 2. Naming Conventions

Use clear, consistent names:
- `dev_` prefix for development
- `test_` prefix for test data
- `temp_` prefix for temporary values

### 3. Documentation

Add descriptions to variables:
1. Edit environment
2. Hover over variable
3. Click description icon
4. Add helpful description

### 4. Regular Cleanup

- Remove unused variables
- Update outdated values
- Clear test data periodically

### 5. Security

- Never share production tokens
- Rotate credentials regularly
- Use "Secret" type for sensitive data
- Clear tokens after testing

## Advanced Environment Features

### Using External Data Files

1. Create a CSV/JSON data file:
   ```csv
   phone,name,email
   +962771234567,John Doe,john@example.com
   +962771234568,Jane Doe,jane@example.com
   ```

2. In Collection Runner:
   - Select "Select File"
   - Choose your data file
   - Run iterations with different data

### Environment Scripts

Add scripts to environment for reuse:

```javascript
// In environment pre-request script
utils = {
  generatePhone: function() {
    const prefixes = ['77', '78', '79'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return '+962' + prefix + Math.floor(Math.random() * 10000000);
  },
  
  generateOTP: function() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
};
```

### Dynamic Environment Values

Set values based on conditions:

```javascript
// In pre-request script
if (pm.environment.get("mock_mode") === "true") {
  pm.environment.set("test_otp", "123456");
} else {
  // Wait for real OTP
  pm.environment.unset("test_otp");
}
```

## Integration with CI/CD

### Export for CI/CD

```bash
# Export environment
postman environment export lamsa-dev-env > env.json

# Use in Newman
newman run collection.json -e env.json
```

### Environment Variables from System

```javascript
// In Postman scripts
pm.environment.set("api_url", 
  pm.environment.get("CI_API_URL") || "http://localhost:3001"
);
```

## Monitoring and Debugging

### View Current Environment

1. Click eye icon next to environment dropdown
2. See all current values
3. Check which are set/unset

### Console Logging

```javascript
// In test scripts
console.log("Current API URL:", pm.environment.get("api_url"));
console.log("Token present:", !!pm.environment.get("jwt_token"));
```

### Reset Environment

To start fresh:
1. Select environment
2. Click **...** → **Reset All**
3. Re-import from file if needed

---

Remember: Proper environment setup is crucial for effective API testing. Take time to configure it correctly!