# Lamsa Provider Testing Checklist

This comprehensive checklist covers manual testing for the complete provider workflow including registration, profile setup, service creation, availability configuration, booking management, and earnings tracking with Arabic/English bilingual support.

## Table of Contents
1. [Pre-Testing Setup](#pre-testing-setup)
2. [Provider Registration and Authentication](#provider-registration-and-authentication)
3. [Business Profile Setup](#business-profile-setup)
4. [Location and Photos Management](#location-and-photos-management)
5. [Service Creation and Pricing](#service-creation-and-pricing)
6. [Availability Configuration](#availability-configuration)
7. [Prayer Times Integration](#prayer-times-integration)
8. [Booking Management](#booking-management)
9. [Earnings and Platform Fees](#earnings-and-platform-fees)
10. [Arabic Text and RTL Layout Testing](#arabic-text-and-rtl-layout-testing)
11. [Jordan-Specific Features](#jordan-specific-features)
12. [Provider Dashboard Workflows](#provider-dashboard-workflows)

---

## Pre-Testing Setup

### Environment Configuration
- [ ] API server running (`npm run dev`)
- [ ] Database accessible and clean
- [ ] JWT_SECRET configured
- [ ] Supabase connection active
- [ ] SMS service configured (or mock enabled)
- [ ] File upload storage configured
- [ ] Prayer time service accessible

### Test Data Preparation
- [ ] Valid Jordan phone numbers: `+962771234567`, `+962781234567`, `+962791234567`
- [ ] Valid Jordan business addresses and coordinates
- [ ] Sample business photos (JPEG/PNG format)
- [ ] Test service data with Arabic/English content
- [ ] Mock customer accounts for booking tests

### Testing Tools
- [ ] Postman collection imported
- [ ] Browser with Arabic language support
- [ ] Device for SMS testing (if using real SMS)
- [ ] Screenshots for RTL layout verification

---

## Provider Registration and Authentication

### Test Case: PRV-REG-001 - Complete Provider Registration
**Objective**: Verify provider can register with complete business details

**Test Data**:
```json
{
  "businessName": "Beauty Oasis صالون الواحة",
  "businessNameAr": "واحة الجمال للسيدات",
  "ownerName": "Layla Ahmad",
  "ownerNameAr": "ليلى أحمد",
  "phone": "+962771234567",
  "email": "layla@beautyoasis.jo",
  "businessType": "beauty_salon",
  "address": "Rainbow Street, Jabal Amman",
  "addressAr": "شارع الرينبو، جبل عمان",
  "location": {
    "lat": 31.9539,
    "lng": 35.9285,
    "address": "Rainbow Street, Jabal Amman",
    "addressAr": "شارع الرينبو، جبل عمان"
  }
}
```

**Steps**:
1. Send POST request to `/api/auth/provider/signup`
2. Verify response contains provider ID and status
3. Check bilingual success messages

**Expected Results**:
- [ ] Status Code: 201
- [ ] Response contains `success: true`
- [ ] Provider ID generated
- [ ] Status is `pending_verification`
- [ ] English and Arabic messages present
- [ ] Business name correctly stored with Arabic content

**Validation Points**:
- [ ] Business name contains Arabic characters (if businessNameAr provided)
- [ ] Phone number normalized to +962 format
- [ ] Location coordinates within Jordan boundaries
- [ ] Email format valid
- [ ] Business type from allowed list

### Test Case: PRV-REG-002 - Phone Verification Flow
**Objective**: Verify provider phone verification with OTP

**Steps**:
1. Send OTP request: POST `/api/auth/provider/send-otp`
2. Wait for SMS or check mock OTP in development
3. Verify OTP: POST `/api/auth/provider/verify-otp`
4. Store JWT token for subsequent requests

**Expected Results**:
- [ ] OTP sent successfully (SMS received or mock OTP returned)
- [ ] OTP verification returns JWT token
- [ ] Token works for authenticated requests
- [ ] Provider status updated to `phone_verified`

### Test Case: PRV-REG-003 - Arabic Content Validation
**Objective**: Validate Arabic text fields during registration

**Test Scenarios**:
1. **Valid Arabic content**:
   - `businessNameAr`: "صالون الجمال للسيدات"
   - `ownerNameAr`: "فاطمة الزهراء"
   - `addressAr`: "شارع الرينبو، جبل عمان"

2. **Invalid Arabic content** (should fail):
   - `businessNameAr`: "Beauty Salon" (English instead of Arabic)
   - `ownerNameAr`: "123456" (Numbers only)
   - `addressAr`: "" (Empty string)

**Expected Results**:
- [ ] Valid Arabic content accepted
- [ ] Invalid Arabic content rejected with specific error
- [ ] Error messages in both English and Arabic
- [ ] Error code: `INVALID_ARABIC_CONTENT`

### Test Case: PRV-REG-004 - Duplicate Registration Prevention
**Objective**: Prevent duplicate provider registrations

**Steps**:
1. Register provider with phone `+962771234567`
2. Attempt to register another provider with same phone
3. Verify appropriate error response

**Expected Results**:
- [ ] Second registration fails
- [ ] Status Code: 409
- [ ] Error: `BUSINESS_ALREADY_EXISTS`
- [ ] Bilingual error messages

---

## Business Profile Setup

### Test Case: PRV-PROF-001 - Complete Profile Setup
**Objective**: Set up complete business profile with bilingual content

**Prerequisites**: Authenticated provider with valid JWT token

**Profile Data**:
```json
{
  "description": "Premier beauty salon offering professional services in Amman",
  "descriptionAr": "صالون جمال راقي يقدم خدمات احترافية في عمان",
  "specialties": ["haircut", "makeup", "facial", "manicure", "pedicure"],
  "specialtiesAr": ["قص الشعر", "المكياج", "العناية بالوجه", "العناية بالأظافر", "العناية بالقدمين"],
  "businessHours": {
    "sunday": { "open": "09:00", "close": "18:00", "closed": false },
    "monday": { "open": "09:00", "close": "18:00", "closed": false },
    "tuesday": { "open": "09:00", "close": "18:00", "closed": false },
    "wednesday": { "open": "09:00", "close": "18:00", "closed": false },
    "thursday": { "open": "09:00", "close": "18:00", "closed": false },
    "friday": { "closed": true },
    "saturday": { "open": "10:00", "close": "16:00", "closed": false }
  },
  "contactInfo": {
    "whatsapp": "+962771234567",
    "instagram": "@beauty_oasis_jo",
    "facebook": "Beauty Oasis Jordan"
  }
}
```

**Steps**:
1. PUT `/api/provider/profile` with complete profile data
2. Verify profile updated successfully
3. GET `/api/provider/profile` to confirm changes

**Expected Results**:
- [ ] Profile updated successfully
- [ ] All bilingual content stored correctly
- [ ] Contact information validated and stored
- [ ] Business hours respect Jordan work week (Friday closed)
- [ ] Completion percentage increased

### Test Case: PRV-PROF-002 - Profile Validation
**Objective**: Validate profile field requirements and formats

**Validation Tests**:

1. **Description Length Validation**:
   - Valid: 50-2000 characters
   - Invalid: Empty, 1 character, 2001+ characters

2. **Specialties Validation**:
   - Valid: Array of recognized specialties
   - Invalid: Unknown specialties, non-array format

3. **Contact Information Validation**:
   - WhatsApp: Valid Jordan phone format
   - Instagram: Starts with @, valid characters
   - Facebook: 1-100 characters

4. **Arabic Content Validation**:
   - Must contain Arabic characters for Arabic fields
   - Mixed content acceptable in English fields

**Expected Results**:
- [ ] Field length validations enforced
- [ ] Invalid data rejected with specific errors
- [ ] Arabic content requirements validated
- [ ] Contact info format validated

---

## Location and Photos Management

### Test Case: PRV-LOC-001 - Business Location Setup
**Objective**: Set up business location within Jordan

**Valid Jordan Locations**:
```json
{
  "address": "Downtown Amman, King Hussein Street",
  "addressAr": "وسط البلد عمان، شارع الملك حسين",
  "coordinates": { "lat": 31.9566, "lng": 35.9457 },
  "district": "Downtown",
  "districtAr": "وسط البلد",
  "city": "Amman",
  "cityAr": "عمان",
  "landmarks": ["Jordan Gate", "King Hussein Mosque"],
  "landmarksAr": ["بوابة الأردن", "مسجد الملك حسين"]
}
```

**Steps**:
1. PUT `/api/provider/location` with valid Jordan coordinates
2. Verify location accepted
3. Try with invalid coordinates (outside Jordan)
4. Verify rejection with appropriate error

**Expected Results**:
- [ ] Valid Jordan coordinates accepted
- [ ] Invalid coordinates rejected
- [ ] Error: `LOCATION_OUTSIDE_JORDAN`
- [ ] Jordan boundaries enforced (lat: 29.1850-33.3663, lng: 34.8844-39.3012)

### Test Case: PRV-PHO-001 - Business Photos Upload
**Objective**: Upload and manage business photos

**Photo Requirements**:
- Format: JPEG, PNG, WebP
- Size: Max 5MB per photo
- Count: Max 10 photos per upload
- Types: interior, exterior, team, services, certificates

**Steps**:
1. Prepare sample photos meeting requirements
2. POST `/api/provider/photos` with multipart form data
3. Verify successful upload
4. Test with invalid photos (wrong format, too large)
5. Test bulk upload (>10 photos)

**Expected Results**:
- [ ] Valid photos uploaded successfully
- [ ] Photo URLs returned
- [ ] Invalid format rejected: `INVALID_FILE_TYPE`
- [ ] Oversized files rejected: `FILE_TOO_LARGE`
- [ ] Bulk limit enforced: `TOO_MANY_FILES`
- [ ] Photo captions in Arabic and English

---

## Service Creation and Pricing

### Test Case: PRV-SRV-001 - Create Service with Bilingual Content
**Objective**: Create service with complete Arabic/English details

**Service Data**:
```json
{
  "name": "Hair Styling and Cut قص وتصفيف الشعر",
  "nameAr": "قص وتصفيف الشعر الاحترافي",
  "description": "Professional hair cutting, washing, and styling services for all hair types",
  "descriptionAr": "خدمات قص وغسيل وتصفيف الشعر الاحترافية لجميع أنواع الشعر",
  "category": "hair_services",
  "categoryAr": "خدمات الشعر",
  "duration": 60,
  "basePrice": 25.00,
  "currency": "JOD",
  "tags": ["haircut", "styling", "wash", "blow-dry"],
  "tagsAr": ["قص الشعر", "التصفيف", "الغسيل", "التجفيف"],
  "includes": ["Hair wash", "Cut", "Basic styling", "Hair mask"],
  "includesAr": ["غسيل الشعر", "القص", "التصفيف الأساسي", "ماسك الشعر"],
  "requirements": ["Clean hair preferred", "Arrive 5 minutes early"],
  "requirementsAr": ["يفضل شعر نظيف", "الحضور قبل 5 دقائق من الموعد"],
  "pricing": {
    "type": "fixed",
    "basePrice": 25.00,
    "currency": "JOD",
    "discounts": {
      "firstTime": { "percentage": 15, "description": "First time client discount" },
      "loyalty": { "minVisits": 5, "percentage": 10, "description": "Loyal client discount" }
    }
  }
}
```

**Steps**:
1. POST `/api/provider/services` with complete service data
2. Verify service created successfully
3. GET `/api/provider/services` to list services
4. Update service with PUT `/api/provider/services/{serviceId}`

**Expected Results**:
- [ ] Service created with bilingual content
- [ ] Service ID generated
- [ ] All Arabic content validated
- [ ] Pricing structure stored correctly
- [ ] Category from allowed list
- [ ] Duration within valid range (15-480 minutes)
- [ ] Currency is JOD

### Test Case: PRV-SRV-002 - Service Pricing Models
**Objective**: Test different pricing models and validation

**Pricing Model Tests**:

1. **Fixed Pricing**:
```json
{
  "type": "fixed",
  "basePrice": 25.00,
  "currency": "JOD"
}
```

2. **Tiered Pricing**:
```json
{
  "type": "tiered",
  "basePrice": 20.00,
  "currency": "JOD",
  "tiers": [
    { "duration": 30, "price": 20.00, "name": "Basic", "nameAr": "أساسي" },
    { "duration": 60, "price": 35.00, "name": "Standard", "nameAr": "قياسي" },
    { "duration": 90, "price": 50.00, "name": "Premium", "nameAr": "مميز" }
  ]
}
```

3. **Seasonal Pricing**:
```json
{
  "seasonalPricing": {
    "enabled": true,
    "ramadan": { "multiplier": 0.9, "description": "Ramadan discount", "descriptionAr": "خصم رمضان" },
    "eid": { "multiplier": 1.2, "description": "Eid premium", "descriptionAr": "علاوة العيد" },
    "wedding": { "multiplier": 1.5, "description": "Wedding season premium", "descriptionAr": "علاوة موسم الزفاف" }
  }
}
```

**Expected Results**:
- [ ] All pricing models accepted
- [ ] Tier validation (ascending order by duration)
- [ ] Discount percentages valid (0-100%)
- [ ] Seasonal multipliers reasonable (0.5-2.0)
- [ ] Currency validation (JOD only for Jordan)

### Test Case: PRV-SRV-003 - Service Categories and Validation
**Objective**: Validate service categories and business rules

**Allowed Categories**:
- `hair_services` (خدمات الشعر)
- `facial_services` (خدمات الوجه)
- `nail_services` (خدمات الأظافر)
- `massage_services` (خدمات التدليك)
- `makeup_services` (خدمات المكياج)
- `spa_services` (خدمات السبا)
- `threading_services` (خدمات النتف)

**Validation Tests**:
- [ ] Valid categories accepted
- [ ] Invalid categories rejected
- [ ] Category names consistent with business type
- [ ] Arabic category names correctly mapped

---

## Availability Configuration

### Test Case: PRV-AVL-001 - Jordan Work Week Configuration
**Objective**: Configure provider availability for Jordan work schedule

**Jordan Work Week Pattern**:
```json
{
  "workingDays": {
    "sunday": {
      "isWorking": true,
      "shifts": [
        { "start": "09:00", "end": "13:00", "name": "Morning", "nameAr": "الصباح" },
        { "start": "15:00", "end": "19:00", "name": "Evening", "nameAr": "المساء" }
      ],
      "breakTimes": [
        { "start": "13:00", "end": "15:00", "name": "Lunch Break", "nameAr": "استراحة الغداء" }
      ]
    },
    "monday": {
      "isWorking": true,
      "shifts": [
        { "start": "09:00", "end": "13:00", "name": "Morning", "nameAr": "الصباح" },
        { "start": "15:00", "end": "19:00", "name": "Evening", "nameAr": "المساء" }
      ]
    },
    "tuesday": {
      "isWorking": true,
      "shifts": [
        { "start": "09:00", "end": "13:00", "name": "Morning", "nameAr": "الصباح" },
        { "start": "15:00", "end": "19:00", "name": "Evening", "nameAr": "المساء" }
      ]
    },
    "wednesday": {
      "isWorking": true,
      "shifts": [
        { "start": "09:00", "end": "13:00", "name": "Morning", "nameAr": "الصباح" },
        { "start": "15:00", "end": "19:00", "name": "Evening", "nameAr": "المساء" }
      ]
    },
    "thursday": {
      "isWorking": true,
      "shifts": [
        { "start": "09:00", "end": "13:00", "name": "Morning", "nameAr": "الصباح" },
        { "start": "15:00", "end": "19:00", "name": "Evening", "nameAr": "المساء" }
      ]
    },
    "friday": {
      "isWorking": false,
      "note": "Day off - Friday prayer day",
      "noteAr": "يوم عطلة - يوم صلاة الجمعة"
    },
    "saturday": {
      "isWorking": true,
      "shifts": [
        { "start": "10:00", "end": "16:00", "name": "Weekend Hours", "nameAr": "ساعات نهاية الأسبوع" }
      ]
    }
  },
  "timezone": "Asia/Amman",
  "slotDuration": 30,
  "bufferTime": 15,
  "maxAdvanceBooking": 30
}
```

**Steps**:
1. PUT `/api/provider/availability` with Jordan work week
2. Verify configuration accepted
3. Test time format validation
4. Test shift overlap validation
5. Test timezone validation

**Expected Results**:
- [ ] Jordan work week pattern accepted
- [ ] Friday typically marked as non-working
- [ ] Time format HH:MM enforced
- [ ] Shift end time after start time
- [ ] No overlapping shifts
- [ ] Asia/Amman timezone accepted
- [ ] Slot duration 15-120 minutes
- [ ] Buffer time 0-30 minutes

### Test Case: PRV-AVL-002 - Special Hours Configuration
**Objective**: Configure special hours for Ramadan and holidays

**Ramadan Hours**:
```json
{
  "type": "ramadan",
  "period": {
    "start": "2024-03-11",
    "end": "2024-04-09"
  },
  "workingDays": {
    "sunday": {
      "isWorking": true,
      "shifts": [
        { "start": "10:00", "end": "14:00", "name": "Pre-Iftar", "nameAr": "ما قبل الإفطار" },
        { "start": "20:00", "end": "23:00", "name": "Post-Iftar", "nameAr": "ما بعد الإفطار" }
      ]
    },
    "friday": {
      "isWorking": true,
      "shifts": [
        { "start": "14:30", "end": "17:00", "name": "After Jummah", "nameAr": "بعد صلاة الجمعة" }
      ]
    }
  },
  "description": "Special working hours during Ramadan",
  "descriptionAr": "ساعات عمل خاصة خلال شهر رمضان"
}
```

**Eid Holiday**:
```json
{
  "type": "eid_holiday",
  "period": {
    "start": "2024-07-17",
    "end": "2024-07-19"
  },
  "workingDays": {
    "sunday": { "isWorking": false },
    "monday": { "isWorking": false },
    "tuesday": { "isWorking": false }
  },
  "description": "Eid Al-Adha holiday",
  "descriptionAr": "عطلة عيد الأضحى المبارك"
}
```

**Expected Results**:
- [ ] Special hours configured successfully
- [ ] Date range validation (end after start)
- [ ] Holiday periods marked correctly
- [ ] Ramadan hours accommodate cultural practices
- [ ] Existing appointments handling considered

---

## Prayer Times Integration

### Test Case: PRV-PRA-001 - Prayer Time Configuration
**Objective**: Configure automatic prayer time blocking

**Prayer Time Settings**:
```json
{
  "enabled": true,
  "autoBlock": true,
  "prayerTimes": ["fajr", "dhuhr", "asr", "maghrib", "isha"],
  "customSettings": {
    "fajr": { "enabled": false },
    "dhuhr": { "enabled": true, "blockBefore": 10, "blockAfter": 20 },
    "asr": { "enabled": true, "blockBefore": 5, "blockAfter": 15 },
    "maghrib": { "enabled": true, "blockBefore": 15, "blockAfter": 30 },
    "isha": { "enabled": false }
  },
  "location": {
    "city": "Amman",
    "cityAr": "عمان",
    "coordinates": { "lat": 31.9566, "lng": 35.9457 }
  },
  "calculationMethod": "Jordan"
}
```

**Steps**:
1. PUT `/api/provider/prayer-times` with settings
2. Verify prayer times calculated for location
3. GET `/api/provider/availability/slots?date=2024-07-17` 
4. Verify prayer time slots blocked automatically

**Expected Results**:
- [ ] Prayer time settings saved
- [ ] Prayer times calculated for Amman
- [ ] Blocked slots during prayer times
- [ ] Custom block durations applied
- [ ] Only enabled prayers block slots
- [ ] Jordan calculation method used

### Test Case: PRV-PRA-002 - Prayer Time Calculations
**Objective**: Verify accurate prayer time calculations for Jordan

**Test Locations in Jordan**:
- Amman: lat 31.9566, lng 35.9457
- Aqaba: lat 29.5267, lng 35.0072
- Irbid: lat 32.5556, lng 35.8500

**Steps**:
1. Configure prayer times for each location
2. GET prayer times for specific dates
3. Verify times are reasonable for Jordan
4. Test different calculation methods

**Expected Results**:
- [ ] Prayer times calculated correctly
- [ ] Times appropriate for Jordan timezone
- [ ] Different locations yield different times
- [ ] Seasonal variations in prayer times
- [ ] Fajr before sunrise, Maghrib after sunset

---

## Booking Management

### Test Case: PRV-BOK-001 - Provider Booking Overview
**Objective**: View and manage provider bookings

**Steps**:
1. GET `/api/provider/bookings` to list all bookings
2. Filter by status: `confirmed`, `pending`, `completed`
3. Filter by date range
4. Test pagination

**Expected Results**:
- [ ] Bookings listed with customer details
- [ ] Customer names in Arabic and English
- [ ] Service details included
- [ ] Booking status clearly indicated
- [ ] Date/time in Jordan timezone
- [ ] Pagination working correctly

### Test Case: PRV-BOK-002 - Booking Status Updates
**Objective**: Update booking status through provider workflow

**Booking Status Flow**:
1. `pending` → `confirmed`
2. `confirmed` → `in_progress`
3. `in_progress` → `completed`
4. Any status → `cancelled` (with reason)
5. `confirmed` → `no_show`

**Steps**:
1. PUT `/api/provider/bookings/{bookingId}/status`
2. Test each status transition
3. Add notes in Arabic and English
4. Test cancellation with refund calculation

**Expected Results**:
- [ ] Valid status transitions allowed
- [ ] Invalid transitions rejected
- [ ] Cancellation reasons required
- [ ] Refund amounts calculated correctly
- [ ] Customer notifications triggered
- [ ] Billing updates processed

### Test Case: PRV-BOK-003 - Booking Completion and Rating
**Objective**: Complete booking and handle service completion

**Completion Data**:
```json
{
  "status": "completed",
  "actualDuration": 70,
  "serviceNotes": "Service completed successfully. Client very satisfied.",
  "serviceNotesAr": "تم إكمال الخدمة بنجاح. العميلة راضية جداً",
  "upsellServices": ["hair_treatment"],
  "finalAmount": 35.00,
  "tips": 5.00
}
```

**Steps**:
1. Mark booking as `in_progress`
2. Complete booking with details
3. Verify earnings calculation
4. Check platform fee deduction

**Expected Results**:
- [ ] Booking marked completed
- [ ] Actual duration recorded
- [ ] Service notes in both languages
- [ ] Upsell services tracked
- [ ] Final amount includes upsells and tips
- [ ] Earnings calculated correctly

---

## Earnings and Platform Fees

### Test Case: PRV-EAR-001 - Earnings Calculation
**Objective**: Verify accurate earnings calculation with platform fees

**Test Booking Scenario**:
- Service Price: 50.00 JOD
- Upsell: 10.00 JOD
- Tips: 5.00 JOD
- Total: 65.00 JOD

**Expected Fee Calculation**:
- Platform Fee (10%): 6.50 JOD
- Payment Processing (2.5%): 1.63 JOD
- Net Earnings: 56.87 JOD

**Steps**:
1. Complete booking with above amounts
2. GET `/api/provider/earnings?from=2024-07-01&to=2024-07-31`
3. Verify fee calculations
4. Test different provider tiers (standard vs premium)

**Expected Results**:
- [ ] Platform fees calculated correctly
- [ ] Payment processing fees applied
- [ ] Net earnings accurate
- [ ] Different rates for premium providers
- [ ] Currency in JOD
- [ ] Breakdown by service type

### Test Case: PRV-EAR-002 - Earnings Dashboard and Reports
**Objective**: View comprehensive earnings analytics

**Steps**:
1. GET `/api/provider/earnings/breakdown?from=2024-07-01&to=2024-07-31`
2. Group by different periods (daily, weekly, monthly)
3. View earnings by service category
4. Generate payout report

**Expected Results**:
- [ ] Total earnings for period
- [ ] Breakdown by service
- [ ] Daily/weekly/monthly trends
- [ ] Average booking value
- [ ] Most popular services
- [ ] Growth rate vs previous period

### Test Case: PRV-EAR-003 - Seasonal and Cultural Adjustments
**Objective**: Test cultural pricing adjustments for Jordan market

**Cultural Pricing Scenarios**:
1. **Ramadan Discount**: 10% platform fee reduction
2. **Eid Premium**: 20% price increase allowed
3. **Wedding Season**: Special rates applicable

**Steps**:
1. Configure seasonal pricing
2. Test fee calculations during special periods
3. Verify cultural adjustments applied

**Expected Results**:
- [ ] Ramadan fees reduced appropriately
- [ ] Eid pricing premiums calculated
- [ ] Wedding season rates applied
- [ ] Cultural periods recognized automatically

---

## Arabic Text and RTL Layout Testing

### Test Case: PRV-RTL-001 - Arabic Text Display
**Objective**: Verify correct Arabic text rendering and RTL layout

**Arabic Text Elements to Test**:
- Business names and descriptions
- Service names and descriptions
- Customer names and notes
- Address and location information
- Success and error messages
- Form labels and placeholders

**Testing Checklist**:
- [ ] Arabic text displays correctly (not as question marks)
- [ ] RTL text direction applied appropriately
- [ ] Mixed Arabic-English content handled properly
- [ ] Arabic numerals vs English numerals consistency
- [ ] Diacritics (tashkeel) preserved if present
- [ ] Long Arabic text wraps correctly
- [ ] Arabic text in form inputs editable

### Test Case: PRV-RTL-002 - UI Layout in RTL Mode
**Objective**: Verify UI elements adapt correctly for RTL layout

**RTL Layout Elements**:
- Form field alignment
- Button placement
- Icon positioning
- Table column order
- Navigation menu layout
- Modal dialog alignment

**Browser Testing**:
1. Test in Chrome with Arabic locale
2. Test in Firefox with RTL developer tools
3. Test on mobile devices
4. Test with different Arabic fonts

**Expected Results**:
- [ ] Text flows right-to-left for Arabic content
- [ ] UI elements mirror appropriately
- [ ] Form alignment correct for RTL
- [ ] Icons and buttons in correct positions
- [ ] No layout breaking with mixed content

### Test Case: PRV-RTL-003 - Data Entry and Validation
**Objective**: Test Arabic data entry and validation

**Data Entry Tests**:
1. Enter Arabic business name: "صالون الجمال للسيدات"
2. Enter Arabic description with punctuation
3. Enter mixed Arabic-English text
4. Test copy/paste of Arabic content
5. Test Arabic content with special characters

**Expected Results**:
- [ ] Arabic text entry smooth and responsive
- [ ] Text selection works correctly
- [ ] Copy/paste preserves Arabic formatting
- [ ] Validation messages in Arabic display correctly
- [ ] Character counting accurate for Arabic text

---

## Jordan-Specific Features

### Test Case: PRV-JOR-001 - Location Validation for Jordan
**Objective**: Ensure business locations are within Jordan boundaries

**Jordan Coordinate Boundaries**:
- North: 33.3663
- South: 29.1850  
- East: 39.3012
- West: 34.8844

**Test Coordinates**:
- Valid: Amman (31.9566, 35.9457)
- Valid: Aqaba (29.5267, 35.0072)
- Invalid: Dubai (25.1972, 55.2796)
- Invalid: Damascus (33.5138, 36.2765)

**Expected Results**:
- [ ] Valid Jordan coordinates accepted
- [ ] Invalid coordinates rejected
- [ ] Error message mentions Jordan specifically
- [ ] Map integration shows Jordan properly

### Test Case: PRV-JOR-002 - Jordan Phone Number Validation
**Objective**: Validate Jordan phone number formats

**Valid Jordan Phone Formats**:
- `+962771234567` (International)
- `962771234567` (Without +)
- `0771234567` (Local)
- `771234567` (Short)

**Invalid Formats**:
- `+1234567890` (Wrong country)
- `+962761234567` (Invalid prefix)
- `077123456` (Too short)

**Expected Results**:
- [ ] All valid Jordan formats accepted
- [ ] Invalid formats rejected with specific errors
- [ ] Phone normalized to +962 format
- [ ] Prefixes 77, 78, 79 accepted only

### Test Case: PRV-JOR-003 - Cultural and Religious Considerations
**Objective**: Verify cultural adaptations for Jordan market

**Cultural Features**:
1. **Friday as Rest Day**: Default in business hours
2. **Prayer Time Integration**: Automatic blocking available
3. **Ramadan Hours**: Special scheduling support
4. **Eid Holidays**: Predefined holiday periods
5. **Gender-Specific Services**: Categorization support

**Expected Results**:
- [ ] Friday marked as non-working by default
- [ ] Prayer times calculated for Jordan locations
- [ ] Ramadan period recognition
- [ ] Eid dates configured correctly
- [ ] Cultural sensitivity in service categorization

---

## Provider Dashboard Workflows

### Test Case: PRV-DASH-001 - Dashboard Overview
**Objective**: Verify provider dashboard displays key metrics

**Dashboard Metrics**:
- Today's bookings count and revenue
- This week's performance vs last week
- Upcoming appointments (next 24 hours)
- Recent customer reviews and ratings
- Service performance analytics
- Outstanding payment amounts

**Steps**:
1. GET `/api/provider/dashboard/overview`
2. Verify all metrics present
3. Check data accuracy with individual API calls

**Expected Results**:
- [ ] All key metrics displayed
- [ ] Data matches individual API responses
- [ ] Performance comparisons accurate
- [ ] Revenue figures include platform fees
- [ ] Arabic and English labels present

### Test Case: PRV-DASH-002 - Calendar and Appointment Management
**Objective**: Verify appointment calendar functionality

**Calendar Features**:
- Monthly/weekly/daily views
- Appointment details on hover/click
- Drag-and-drop rescheduling
- Prayer time indicators
- Availability gaps highlighted
- Customer information accessible

**Steps**:
1. GET `/api/provider/appointments/calendar?month=2024-07`
2. Verify appointments display correctly
3. Test appointment detail modal
4. Verify prayer time indicators

**Expected Results**:
- [ ] Appointments displayed on correct dates/times
- [ ] Customer names in preferred language
- [ ] Service details accessible
- [ ] Prayer times marked clearly
- [ ] Availability gaps visible

### Test Case: PRV-DASH-003 - Analytics and Reporting
**Objective**: Verify comprehensive analytics dashboard

**Analytics Features**:
- Revenue trends (daily, weekly, monthly)
- Most popular services
- Peak hours and days analysis
- Customer demographics
- Booking conversion rates
- Seasonal performance patterns

**Steps**:
1. GET `/api/provider/analytics/revenue?period=monthly`
2. GET `/api/provider/analytics/services`
3. GET `/api/provider/analytics/customers`
4. Verify data visualization readiness

**Expected Results**:
- [ ] Revenue trends accurate
- [ ] Service popularity ranking correct
- [ ] Peak time analysis reasonable
- [ ] Customer data anonymized appropriately
- [ ] Data formatted for charts/graphs

---

## Test Execution Checklist

### Before Testing
- [ ] Environment configured correctly
- [ ] Test data prepared and validated
- [ ] Authentication tokens ready
- [ ] Database in clean state

### During Testing
- [ ] Record all test results systematically
- [ ] Capture screenshots for UI tests
- [ ] Note performance observations
- [ ] Document any unexpected behavior

### Arabic/RTL Specific
- [ ] Test on Arabic-enabled browsers
- [ ] Verify UTF-8 encoding throughout
- [ ] Check font rendering for Arabic text
- [ ] Validate RTL layout on different screen sizes

### After Testing
- [ ] Compile test results summary
- [ ] Report bugs with reproduction steps
- [ ] Validate fixes when available
- [ ] Update test cases based on findings

---

## Common Issues and Troubleshooting

### Arabic Text Issues
- **Problem**: Arabic text shows as question marks
- **Solution**: Check UTF-8 encoding, browser language settings
- **Verification**: Text should display properly in Arabic

### RTL Layout Issues  
- **Problem**: UI elements not mirroring correctly
- **Solution**: Check CSS RTL rules, browser developer tools
- **Verification**: Layout should mirror naturally for Arabic

### Jordan Location Issues
- **Problem**: Valid Jordan coordinates rejected
- **Solution**: Check coordinate precision, boundary validation
- **Verification**: Map should show location within Jordan

### Prayer Time Issues
- **Problem**: Prayer times incorrect or not calculated
- **Solution**: Verify location coordinates, calculation method
- **Verification**: Times should match local Jordan prayer times

### Cultural Feature Issues
- **Problem**: Ramadan/Eid features not working
- **Solution**: Check date range configuration, cultural settings
- **Verification**: Special periods should be recognized automatically

This comprehensive checklist ensures thorough testing of all provider functionality with particular attention to Arabic content, RTL layout, and Jordan-specific features essential for the Lamsa platform.