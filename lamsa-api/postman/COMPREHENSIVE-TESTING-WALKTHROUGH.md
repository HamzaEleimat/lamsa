# Comprehensive Testing Walkthrough for Lamsa API

## Table of Contents
1. [Complete User Journeys](#complete-user-journeys)
2. [Provider Operations](#provider-operations)
3. [Admin Workflows](#admin-workflows)
4. [Error Scenarios](#error-scenarios)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Integration Testing](#integration-testing)
8. [Localization Testing](#localization-testing)

---

## Complete User Journeys

### Journey 1: First-Time Customer Complete Flow

This journey simulates a new customer from registration to completing their first booking and review.

#### Prerequisites
- API server running on port 3001
- Development environment selected in Postman
- Test Data Setup collection already run

#### Steps

**1. Customer Registration**
```
Collection: Lamsa API Complete
Folder: 1. Authentication → Customer Authentication
```

1. **Send Customer OTP**
   - Phone: `+962771234567`
   - Expected: 200 OK, mockOtp in response
   - Verify: OTP is exactly 6 digits

2. **Verify Customer OTP**
   - Use the mockOtp from previous response
   - Add name: "Sarah Ahmad"
   - Expected: 200 OK, JWT token and user object
   - Verify: Role is "customer"

**2. Browse and Search Providers**
```
Folder: 2. Provider Management
```

3. **Search Providers**
   - Set location: Amman center (31.9539, 35.9106)
   - Radius: 5000 meters
   - Filter: Services include "hair" and "nails"
   - Price range: 10-50 JOD
   - Expected: List of providers with distance calculated
   - Verify: All providers are within radius

4. **Get Provider Details**
   - Select a provider from search results
   - Expected: Full provider profile with ratings
   - Verify: Arabic and English names present

5. **Get Provider Services**
   - Use same provider ID
   - Expected: List of available services
   - Verify: Prices include platform fee information

6. **Check Provider Availability**
   - Date: Tomorrow's date
   - Expected: Available time slots
   - Verify: No overlapping slots

**3. Create and Manage Booking**
```
Folder: 4. Booking System
```

7. **Create Booking**
   - Select service from step 5
   - Choose available slot from step 6
   - Add notes: "First time, prefer female staff"
   - Expected: 201 Created, booking confirmation
   - Verify: Total amount includes service + platform fee

8. **Get Booking Details**
   - Use booking ID from step 7
   - Expected: Full booking information
   - Verify: Status is "pending"

**4. Payment Process**
```
Folder: 5. Payment System
```

9. **Initialize Payment**
   - Booking ID from step 7
   - Payment method: "card"
   - Expected: Payment URL or token
   - Verify: Amount matches booking total

10. **Confirm Payment** (Simulated)
    - Use test payment token
    - Expected: Payment success
    - Verify: Booking status updated to "confirmed"

**5. Post-Service Flow**
```
Folder: 6. Review System
```

11. **Create Review**
    - Wait for booking to be marked "completed"
    - Rating: 5 stars
    - Comment: "Amazing service! Very professional"
    - Expected: 201 Created
    - Verify: Review linked to booking

12. **View Review**
    - Get provider reviews
    - Expected: Your review appears
    - Verify: Average rating updated

### Journey 2: Repeat Customer with Cancellation

This journey tests a returning customer who needs to cancel and reschedule.

**1. Quick Login**
```
Use existing customer credentials
```

1. **Send OTP** → **Verify OTP**
   - Use same phone from Journey 1
   - Expected: User data retrieved with history

**2. View History**
```
Folder: 4. Booking System
```

2. **Get User Bookings**
   - Filter: All statuses
   - Expected: Previous bookings listed
   - Verify: Completed booking from Journey 1 appears

**3. Book Favorite Provider**

3. **Create New Booking**
   - Use same provider as before
   - Different service this time
   - Expected: Booking created with "returning customer" flag

**4. Handle Cancellation**

4. **Cancel Booking**
   - Reason: "Schedule conflict"
   - Expected: 200 OK
   - Verify: Refund policy applied correctly
   - Check: Notification sent to provider

5. **Reschedule Alternative**
   - Create another booking
   - Different time slot
   - Expected: Success with no cancellation fee

### Journey 3: Provider Daily Operations

**1. Provider Login**
```
Folder: 1. Authentication → Provider Authentication
```

1. **Provider Login**
   - Email: provider@lamsa.com
   - Password: Test123!@#
   - Expected: JWT token with provider role

**2. Manage Today's Bookings**
```
Folder: 4. Booking System
```

2. **Get Provider Bookings**
   - Filter: Today only
   - Status: Confirmed
   - Expected: List of today's appointments
   - Verify: Sorted by time

3. **Update Booking Status**
   - First booking: Mark "in_progress"
   - Expected: Status updated
   - Verify: Customer notified

4. **Complete Service**
   - Same booking: Mark "completed"
   - Add notes: "Service completed successfully"
   - Expected: Ready for payment/review

**3. Manage Services**
```
Folder: 3. Service Management
```

5. **Update Service Pricing**
   - Increase price by 5 JOD
   - Expected: Future bookings use new price
   - Verify: Existing bookings keep old price

6. **Deactivate Service**
   - Mark service as inactive
   - Expected: Not available for new bookings
   - Verify: Existing bookings unaffected

**4. Check Earnings**
```
Folder: Dashboard Analytics
```

7. **Get Daily Revenue**
   - Date: Today
   - Expected: Revenue breakdown
   - Verify: Platform fees calculated correctly

## Provider Operations

### Setting Up a New Provider

**1. Complete Registration**

1. **Phone Verification**
   ```
   POST /api/auth/provider/send-otp
   POST /api/auth/provider/verify-otp
   ```
   - Verify phone ownership
   - Mark as verified for signup

2. **Business Registration**
   ```
   POST /api/auth/provider/signup
   ```
   Required fields:
   - Business name (Arabic & English)
   - Owner name
   - Complete address
   - GPS coordinates
   - Business license (optional)

3. **Profile Completion**
   ```
   PUT /api/providers/{id}
   ```
   - Add business description
   - Upload logo/images
   - Set working hours
   - Add payment details

### Service Management

**1. Create Service Catalog**

For each service type:
```
POST /api/service-management/services
```

Required service data:
- Name (Arabic & English)
- Description (Arabic & English)
- Category (hair/nails/skin/makeup)
- Base price
- Duration (minutes)
- Requirements/notes

**2. Set Availability**

```
POST /api/availability/schedule
```

Weekly schedule format:
```json
{
  "monday": {
    "isOpen": true,
    "openTime": "09:00",
    "closeTime": "18:00",
    "breaks": [
      {"start": "13:00", "end": "14:00"}
    ]
  }
}
```

**3. Manage Employees** (Multi-staff providers)

```
POST /api/employees
```
- Add staff members
- Assign services they can perform
- Set individual schedules

### Booking Management

**Daily Operations Checklist:**

1. **Morning Routine**
   - Check today's bookings
   - Verify customer contacts
   - Prepare necessary supplies

2. **During Service**
   - Mark booking "in_progress"
   - Track actual vs estimated time
   - Note any add-on services

3. **After Service**
   - Mark "completed"
   - Process payment
   - Request customer review

4. **End of Day**
   - Review completed bookings
   - Check tomorrow's schedule
   - Update availability if needed

## Admin Workflows

### Platform Administration

**1. User Management**
```
Folder: Admin Operations
```

- View all users
- Suspend suspicious accounts
- Reset user passwords
- Verify provider licenses

**2. Financial Operations**
```
Folder: Settlement System
```

Daily settlements:
1. Calculate provider earnings
2. Deduct platform fees
3. Process payouts
4. Generate invoices

**3. Content Moderation**

Review flagged content:
- Inappropriate reviews
- Suspicious service descriptions
- Verify provider credentials

**4. Analytics Dashboard**

Key metrics to monitor:
- Daily active users
- Booking completion rate
- Average service rating
- Revenue by category
- Provider performance

## Error Scenarios

### Authentication Errors

**Test Invalid Phone Numbers:**
```javascript
// Test cases
"+1234567890"     // Wrong country
"+962761234567"   // Invalid prefix  
"0771234"         // Too short
"notaphone"       // Invalid format
```

Expected errors:
- 400: Invalid phone format
- 429: Too many attempts (rate limiting)

**Test Invalid OTP:**
```javascript
// After sending OTP
"000000"    // Wrong OTP
"12345"     // Too short
"ABCDEF"    // Non-numeric
```

Expected: 400 with "INVALID_OTP" error code

### Booking Conflicts

**Double Booking Prevention:**
1. Create booking for 2pm slot
2. Try to book same slot again
3. Expected: 409 Conflict error

**Availability Violations:**
1. Try booking outside working hours
2. Try booking on provider's day off
3. Expected: 400 Bad Request

### Payment Failures

**Insufficient Funds:**
1. Initialize payment
2. Simulate failed payment
3. Expected: Booking remains pending
4. Verify: Can retry payment

**Timeout Handling:**
1. Initialize payment
2. Don't complete within timeout
3. Expected: Payment expires
4. Verify: Booking can be cancelled

## Performance Testing

### Load Testing Scenarios

**1. Search Performance**
```
Concurrent users: 100
Actions: Search providers within 5km
Expected: < 500ms response time
```

**2. Booking Creation**
```
Concurrent users: 50
Actions: Create bookings
Expected: No double bookings
Verify: All bookings unique
```

**3. Image Upload**
```
File size: 5MB
Concurrent uploads: 10
Expected: < 3s per upload
```

### Response Time Benchmarks

| Endpoint | Expected Time | Max Time |
|----------|--------------|----------|
| Search | < 200ms | 500ms |
| Get Provider | < 100ms | 200ms |
| Create Booking | < 300ms | 1000ms |
| Upload Image | < 2s | 5s |

## Security Testing

### Authentication Security

**1. Token Expiration**
- Use expired token
- Expected: 401 Unauthorized
- Verify: Need to re-authenticate

**2. Token Tampering**
- Modify token signature
- Expected: 401 Invalid token
- Verify: Token validation works

**3. Cross-User Access**
- Try accessing other user's data
- Expected: 403 Forbidden
- Verify: Proper authorization

### Input Validation

**SQL Injection Tests:**
```javascript
// In search query
"'; DROP TABLE users; --"
"1 OR 1=1"
```
Expected: Escaped properly, no DB errors

**XSS Prevention:**
```javascript
// In review comment
"<script>alert('XSS')</script>"
```
Expected: Sanitized output

### Rate Limiting

**OTP Flooding:**
1. Send 5 OTP requests rapidly
2. Expected: 429 after 3rd request
3. Verify: Retry-After header present

**Brute Force Prevention:**
1. Try 10 wrong OTPs
2. Expected: Account locked temporarily
3. Verify: Lock duration increases

## Integration Testing

### SMS Integration (Production)

**Test OTP Delivery:**
1. Use real phone number
2. Send OTP request
3. Verify: SMS received within 30s
4. Check: Correct format and sender

### Payment Gateway Integration

**Tap Payment Flow:**
1. Initialize payment
2. Redirect to Tap
3. Complete payment
4. Handle callback
5. Verify: Booking updated

### Push Notifications

**Booking Notifications:**
- New booking → Provider notified
- Booking confirmed → Customer notified
- Reminder → Both parties notified

## Localization Testing

### Arabic Content Validation

**RTL Layout Tests:**
1. Set language to Arabic
2. Verify all text right-aligned
3. Check number formatting (٠١٢٣٤٥٦٧٨٩)

**Translation Completeness:**
- All error messages in Arabic
- Service descriptions bilingual
- Date/time in correct format

### Currency and Number Formats

**Price Display:**
- Arabic: ١٥ د.أ
- English: 15 JOD
- Verify: Consistent calculation

**Phone Number Formats:**
Test acceptance of:
- +962771234567 (International)
- 0771234567 (Local)
- 771234567 (Short)

### Cultural Considerations

**Gender Preferences:**
- Test female-only provider filter
- Verify privacy in service descriptions
- Check appropriate imagery

**Prayer Time Considerations:**
- Test bookings during prayer times
- Verify automatic breaks in schedule

## Regression Testing Checklist

After any code changes, verify:

### Core Functionality
- [ ] Customer registration works
- [ ] Provider registration works
- [ ] Search returns results
- [ ] Booking creation succeeds
- [ ] Payment processing works
- [ ] Reviews can be submitted

### Data Integrity
- [ ] No duplicate bookings
- [ ] Prices calculate correctly
- [ ] Availability updates properly
- [ ] User data remains secure

### Performance
- [ ] Search under 500ms
- [ ] No memory leaks
- [ ] Database queries optimized
- [ ] Image uploads work

### Security
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] Input validation active
- [ ] Rate limiting works

## Automated Test Execution

### Newman CLI Commands

**Run Full Test Suite:**
```bash
newman run Lamsa-API-Complete.postman_collection.json \
  -e development.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export test-results.html
```

**Run Specific Folder:**
```bash
newman run Lamsa-API-Complete.postman_collection.json \
  -e development.postman_environment.json \
  --folder "Authentication" \
  --iteration-count 3
```

**Parallel Execution:**
```bash
# Run multiple collections simultaneously
newman run Setup.postman_collection.json -e dev.json & \
newman run Auth.postman_collection.json -e dev.json & \
newman run Booking.postman_collection.json -e dev.json
```

### CI/CD Integration

**GitHub Actions Example:**
```yaml
- name: Run API Tests
  run: |
    npm install -g newman
    newman run postman/collections/*.json \
      -e postman/environments/staging.json \
      --bail
```

## Troubleshooting Common Issues

### Issue: Tests Pass Individually but Fail Together

**Cause**: State dependency between tests
**Solution**: 
- Add cleanup in test teardown
- Use unique data per test
- Reset database between runs

### Issue: Intermittent Test Failures

**Cause**: Timing issues or external dependencies
**Solution**:
- Add retry logic
- Increase timeouts
- Mock external services

### Issue: Different Results in Different Environments

**Cause**: Environment-specific configuration
**Solution**:
- Verify environment variables
- Check database state
- Confirm service availability

---

## Best Practices Summary

1. **Always run Test Data Setup first** when starting fresh
2. **Use unique data** for each test run (timestamps help)
3. **Clean up after tests** to avoid state pollution
4. **Test both success and failure** scenarios
5. **Verify Arabic and English** content
6. **Check Jordan-specific** features (phone format, currency)
7. **Monitor performance** during testing
8. **Document any issues** found during testing

---

Remember: Comprehensive testing ensures a reliable platform for both customers and providers!