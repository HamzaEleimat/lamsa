# Lamsa API Testing Checklist

## Quick Reference Guide

Use this checklist to ensure comprehensive testing of the Lamsa API. Check off items as you complete them.

---

## 🚀 Pre-Testing Setup

### Environment Setup
- [ ] Node.js installed (v14+)
- [ ] npm dependencies installed (`npm install`)
- [ ] Supabase configured and running
- [ ] `.env` file configured with required variables
- [ ] Database migrations run
- [ ] API server running (`npm run dev`)
- [ ] Postman installed and configured

### Postman Setup
- [ ] Collections imported
- [ ] Environment imported
- [ ] Environment selected (Development/Staging/Production)
- [ ] Base URL verified (`{{api_url}}`)
- [ ] Mock mode configured appropriately

---

## 🔐 Authentication Testing

### Customer Authentication
- [ ] Send OTP - Valid phone number
- [ ] Send OTP - Invalid phone formats
- [ ] Verify OTP - Correct code
- [ ] Verify OTP - Incorrect code
- [ ] Verify OTP - Expired code
- [ ] Customer signup with email/password
- [ ] Token refresh works
- [ ] Token expiration handled
- [ ] Logout clears session

### Provider Authentication
- [ ] Provider phone verification
- [ ] Provider signup with business details
- [ ] Provider login with email/password
- [ ] Provider login with MFA (if enabled)
- [ ] Password reset flow
- [ ] Provider profile completion

### Security Checks
- [ ] Rate limiting on OTP requests (max 3 per minute)
- [ ] Rate limiting on login attempts
- [ ] Token validation on protected routes
- [ ] Cross-user data access prevented
- [ ] SQL injection prevention
- [ ] XSS prevention in inputs

---

## 👥 User Management

### Customer Operations
- [ ] View profile
- [ ] Update profile information
- [ ] Change phone number
- [ ] Upload profile picture
- [ ] View booking history
- [ ] Manage saved addresses
- [ ] Delete account

### Provider Operations
- [ ] View provider profile
- [ ] Update business information
- [ ] Update working hours
- [ ] Manage service offerings
- [ ] Upload business license
- [ ] Update location/GPS coordinates
- [ ] Manage employees (if applicable)

---

## 🔍 Search & Discovery

### Provider Search
- [ ] Search by location (GPS-based)
- [ ] Search by service category
- [ ] Search by price range
- [ ] Search by availability
- [ ] Search by rating
- [ ] Combined filters work correctly
- [ ] Pagination works
- [ ] Distance calculation accurate

### Service Browse
- [ ] List all services
- [ ] Filter by category
- [ ] Sort by price
- [ ] Sort by popularity
- [ ] Service details display correctly

---

## 📅 Booking System

### Booking Creation
- [ ] Check availability before booking
- [ ] Create booking with valid data
- [ ] Prevent double booking
- [ ] Booking outside hours rejected
- [ ] Platform fee calculated correctly
- [ ] Confirmation sent to both parties

### Booking Management
- [ ] View booking details
- [ ] List user bookings
- [ ] List provider bookings
- [ ] Filter bookings by status
- [ ] Cancel booking (customer)
- [ ] Cancel booking (provider)
- [ ] Reschedule booking
- [ ] Booking status updates work

### Edge Cases
- [ ] Booking at boundary times (open/close)
- [ ] Booking across day boundaries
- [ ] Booking during provider breaks
- [ ] Concurrent booking attempts
- [ ] Booking far in advance
- [ ] Last-minute bookings

---

## 💳 Payment System

### Payment Flow
- [ ] Initialize payment
- [ ] Payment amount correct (service + fee)
- [ ] Payment gateway integration (Tap)
- [ ] Successful payment confirmation
- [ ] Failed payment handling
- [ ] Payment timeout handling
- [ ] Refund processing

### Financial Calculations
- [ ] Services ≤25 JOD: 2 JOD fee
- [ ] Services >25 JOD: 5 JOD fee
- [ ] Provider earnings calculated correctly
- [ ] Tax calculations (if applicable)

---

## ⭐ Review System

### Review Operations
- [ ] Create review after service
- [ ] Rating 1-5 stars works
- [ ] Review text in Arabic/English
- [ ] Edit own review
- [ ] Delete own review
- [ ] Cannot review without booking
- [ ] Cannot review twice

### Review Display
- [ ] Provider reviews listed
- [ ] Average rating calculated
- [ ] Review count accurate
- [ ] Reviews sorted by date
- [ ] Pagination works

---

## 🔔 Notifications

### Notification Triggers
- [ ] Booking confirmation notification
- [ ] Booking cancellation notification
- [ ] Booking reminder (24h before)
- [ ] Payment confirmation
- [ ] New review notification
- [ ] Promotional notifications

### Notification Management
- [ ] List notifications
- [ ] Mark as read
- [ ] Mark all as read
- [ ] Delete notification
- [ ] Notification preferences

---

## 🌍 Localization

### Arabic Support
- [ ] Arabic content displays correctly
- [ ] RTL layout works
- [ ] Arabic error messages
- [ ] Date format localized
- [ ] Currency format localized
- [ ] Number format (٠١٢٣٤٥٦٧٨٩)

### Phone Number Formats
- [ ] +962771234567 accepted
- [ ] 0771234567 accepted
- [ ] 771234567 accepted
- [ ] Spaces handled (+962 77 123 4567)
- [ ] Dashes handled (+962-77-123-4567)

---

## 🎯 Admin Operations

### User Management
- [ ] List all users
- [ ] Search users
- [ ] Suspend user account
- [ ] Activate user account
- [ ] Reset user password
- [ ] View user activity

### Provider Management
- [ ] Approve provider registration
- [ ] Verify provider license
- [ ] Suspend provider
- [ ] View provider statistics

### Platform Management
- [ ] View platform analytics
- [ ] Generate reports
- [ ] Manage platform fees
- [ ] Process settlements
- [ ] Handle disputes

---

## 📊 Analytics & Reporting

### Provider Analytics
- [ ] Daily revenue
- [ ] Booking statistics
- [ ] Service popularity
- [ ] Customer retention
- [ ] Average ratings

### Platform Analytics
- [ ] Total users
- [ ] Active users
- [ ] Revenue reports
- [ ] Popular services
- [ ] Geographic distribution

---

## 🚨 Error Handling

### Client Errors (4xx)
- [ ] 400 Bad Request - Clear message
- [ ] 401 Unauthorized - Auth required
- [ ] 403 Forbidden - Permission denied
- [ ] 404 Not Found - Resource missing
- [ ] 409 Conflict - Duplicate/conflict
- [ ] 422 Unprocessable - Validation errors
- [ ] 429 Too Many Requests - Rate limited

### Server Errors (5xx)
- [ ] 500 errors logged properly
- [ ] 503 Service Unavailable handled
- [ ] Graceful degradation
- [ ] Error messages don't leak info

### Error Messages
- [ ] Bilingual error messages
- [ ] User-friendly descriptions
- [ ] Actionable error hints
- [ ] Consistent error format

---

## ⚡ Performance Testing

### Response Times
- [ ] Search < 500ms
- [ ] Get requests < 200ms
- [ ] Create/Update < 1000ms
- [ ] Image upload < 5s
- [ ] Batch operations < 3s

### Load Testing
- [ ] 100 concurrent searches
- [ ] 50 concurrent bookings
- [ ] 10 concurrent image uploads
- [ ] No memory leaks after 1h
- [ ] Database connections managed

---

## 🔄 Integration Testing

### External Services
- [ ] SMS delivery (Twilio)
- [ ] Payment gateway (Tap)
- [ ] Email delivery
- [ ] Push notifications
- [ ] Image storage
- [ ] Map services

### Database Operations
- [ ] Transactions work correctly
- [ ] Rollback on errors
- [ ] Constraints enforced
- [ ] Indexes used efficiently
- [ ] Migrations reversible

---

## 📱 Mobile App Integration

### API Compatibility
- [ ] CORS configured correctly
- [ ] Mobile auth tokens work
- [ ] File uploads from mobile
- [ ] Push token registration
- [ ] Offline handling

### Data Optimization
- [ ] Pagination implemented
- [ ] Partial responses available
- [ ] Image compression
- [ ] Caching headers set
- [ ] Gzip enabled

---

## 🧪 Regression Testing

After updates, verify:
- [ ] All auth flows work
- [ ] Search returns results
- [ ] Bookings can be created
- [ ] Payments process correctly
- [ ] Reviews can be submitted
- [ ] Notifications delivered
- [ ] No breaking changes in API

---

## 📝 Documentation Checks

### API Documentation
- [ ] All endpoints documented
- [ ] Request examples provided
- [ ] Response examples provided
- [ ] Error codes documented
- [ ] Authentication explained

### Testing Documentation
- [ ] Setup guide accurate
- [ ] Environment variables documented
- [ ] Test data provided
- [ ] Common issues addressed
- [ ] Update procedures clear

---

## 🎬 Final Checks

### Production Readiness
- [ ] All tests passing
- [ ] Security review complete
- [ ] Performance acceptable
- [ ] Error handling robust
- [ ] Monitoring configured
- [ ] Backup procedures tested
- [ ] Rollback plan ready

### Sign-off
- [ ] Development testing complete
- [ ] QA testing complete
- [ ] UAT testing complete
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Stakeholder approval

---

## 📌 Quick Commands

### Start Testing Environment
```bash
# Terminal 1: Start API
cd lamsa-api
npm run dev

# Terminal 2: Run database
supabase start

# Terminal 3: Run tests
newman run postman/collections/Lamsa-API-Complete.postman_collection.json \
  -e postman/environments/development.postman_environment.json
```

### Reset Test Data
```bash
# Reset database
cd lamsa-api
supabase db reset

# Re-run migrations
supabase db push
```

### Run Specific Tests
```bash
# Auth tests only
newman run collection.json --folder "Authentication"

# Booking tests only  
newman run collection.json --folder "Booking System"
```

---

## 🔗 Useful Links

- [Postman Documentation](https://learning.postman.com/)
- [Newman CLI Guide](https://github.com/postmanlabs/newman)
- [Supabase Docs](https://supabase.io/docs)
- [Jordan Phone Formats](https://en.wikipedia.org/wiki/Telephone_numbers_in_Jordan)

---

**Remember**: A thorough testing process ensures a reliable and user-friendly platform for all Lamsa users!