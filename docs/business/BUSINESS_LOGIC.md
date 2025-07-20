# Lamsa Business Logic Documentation

## 1. Overview

This document outlines the core business logic and rules implemented in the Lamsa platform. It serves as a reference for developers to understand the constraints, calculations, and workflows that govern the system's behavior.

## 2. User Authentication & Authorization

### 2.1 Customer Authentication
- **Phone-based authentication** only (no passwords)
- **Phone validation rules**:
  - Must be Jordanian mobile number
  - Valid prefixes: 77, 78, 79
  - Accepted formats: +962XXXXXXXXX, 962XXXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
  - Automatically normalized to +962XXXXXXXXX format
- **OTP verification** (6-digit numeric code)
- **No account creation during login** - must signup first
- **JWT token expiration**: 7 days

### 2.2 Provider Authentication
- **Email/password-based authentication**
- **Password requirements**: Minimum 6 characters
- **Manual verification required** before login allowed
- **Unverified providers receive 403 error** on login attempts
- **Password reset** via email token (minimum 32 characters)
- **JWT token contains**: provider ID, email, type

### 2.3 Authorization Rules
- **Role-based access control** with three roles:
  - Customer: Can book services, view own bookings, leave reviews
  - Provider: Can manage services, view bookings, update availability
  - Admin: Full system access
- **Token validation** on all protected endpoints
- **Provider-specific resources** require matching provider ID

## 3. Provider Management

### 3.1 Provider Registration
- **Required fields**:
  - Business name (both Arabic and English)
  - Owner name
  - Valid email (unique constraint)
  - Valid phone number (unique constraint)
  - GPS location (latitude/longitude)
  - Address object (street, city, district, country)
- **Optional fields**:
  - Business license number
  - License image URL
- **Initial state**:
  - Verified: false
  - Rating: 0.0
  - Total reviews: 0

### 3.2 Location Validation
- **Jordan boundaries**:
  - Latitude: 29.185 to 33.375
  - Longitude: 34.960 to 39.301
- **Default location** (Amman): 31.9539, 35.9106
- **Search radius**: 1-50km (default 10km)
- **Distance calculation** using PostGIS ST_Distance

### 3.3 Provider Availability
- **Weekly schedule** (0=Sunday to 6=Saturday)
- **Time constraints**: end_time must be > start_time
- **Unique constraint**: One schedule per day per provider
- **Availability toggle**: is_available flag per day

## 4. Service Management

### 4.1 Service Categories (Predefined)
1. Women's Salon (صالون نسائي)
2. Men's Salon (صالون رجالي)
3. Spa & Massage (سبا ومساج)
4. Nails (أظافر)
5. Makeup (مكياج)
6. Skincare (العناية بالبشرة)
7. Hair Removal (إزالة الشعر)
8. Beauty Clinic (عيادة تجميل)

### 4.2 Service Constraints
- **Name requirements**:
  - Both Arabic and English required
  - Length: 3-255 characters
  - Unique per provider
- **Price constraints**:
  - Minimum: 1 JOD
  - Maximum: 1000 JOD
  - Up to 3 decimal places
- **Duration**: 
  - Minimum: 15 minutes
  - Maximum: 480 minutes (8 hours)
  - Must be positive integer
- **Active/inactive status** for availability control

## 5. Booking System

### 5.1 Booking Creation Rules
- **Date constraints**:
  - Cannot book past dates
  - Maximum 30 days in advance
  - Date must be >= current date
- **Time validation**:
  - 24-hour format (HH:MM)
  - Must fall within provider's working hours
  - End time calculated from start time + service duration
- **Availability checking**:
  - Provider must be available on selected day
  - No time slot conflicts with existing bookings
- **Initial status**: 'pending'

### 5.2 Booking Status Workflow
```
pending → confirmed → completed
   ↓         ↓          ↓
cancelled  cancelled   (reviews enabled)
   ↓         ↓
no_show   no_show
```

### 5.3 Booking Status Rules
- **Pending**: Initial state, awaiting provider confirmation
- **Confirmed**: Provider accepted, appointment scheduled
- **Completed**: Service delivered, enables review creation
- **Cancelled**: Can be cancelled by customer or provider
- **No-show**: Customer didn't arrive

### 5.4 Booking Modifications
- **Cancellation**: Allowed by both customer and provider
- **Rescheduling**: New date/time must meet all creation rules
- **Status updates**: Only providers can confirm/complete bookings

## 6. Payment & Financial Logic

### 6.1 Fee Calculation
- **Platform fee rate**: 15% (configurable)
- **Automatic calculation on booking creation**:
  ```sql
  platform_fee = ROUND(amount * 0.15, 2)
  provider_fee = amount - platform_fee
  ```
- **Fee calculation trigger** executes before insert

### 6.2 Payment Methods
- **Cash**: Default, on-service delivery
- **Card**: Future implementation (Tap integration)
- **Online**: Future implementation (Tap integration)

### 6.3 Settlement Generation
- **Monthly settlements** per provider
- **Aggregates completed bookings** by month/year
- **Settlement fields**:
  - Total bookings count
  - Total amount (sum of all bookings)
  - Total fees (sum of platform fees)
  - Fee rate (15%)
- **Settlement statuses**:
  - Pending: Initial state
  - Processing: Payment in progress
  - Paid: Settlement completed
  - Failed: Payment failed
- **Conflict handling**: Updates existing settlement, preserves 'paid' status

## 7. Review System

### 7.1 Review Creation Rules
- **One review per booking** (unique constraint)
- **Only completed bookings** can be reviewed
- **Only booking customer** can create review
- **Rating scale**: 1-5 (integer only)
- **Comment**: Optional, 10-500 characters

### 7.2 Rating Calculation
- **Automatic provider rating update** on review insert/update
- **Calculation**:
  ```sql
  rating = ROUND(AVG(all_reviews.rating), 1)
  total_reviews = COUNT(all_reviews)
  ```
- **Trigger-based update** ensures consistency

## 8. Data Validation Rules

### 8.1 String Length Constraints
- **Name**: 2-100 characters
- **Password**: 6-128 characters
- **Phone**: 9-15 characters
- **Email**: Maximum 255 characters
- **Business name**: 3-255 characters
- **License number**: 5-50 characters
- **Service name**: 3-255 characters
- **Description**: 10-1000 characters
- **Review comment**: 10-500 characters
- **Booking notes**: Maximum 500 characters
- **Address fields**: 3-255 characters

### 8.2 Input Validation Patterns
- **Email**: Standard email format
- **Phone**: Numeric, Jordan format
- **OTP**: 6 digits exactly
- **Time**: HH:MM format (24-hour)
- **Date**: ISO format (YYYY-MM-DD)
- **Price**: Decimal with up to 3 places

### 8.3 File Upload Constraints
- **Images**:
  - Maximum size: 5MB
  - Allowed types: JPEG, PNG, WebP
- **License documents**:
  - Maximum size: 10MB
  - Allowed types: JPEG, PNG, PDF

## 9. Temporal Business Rules

### 9.1 Timestamp Management
- **Automatic updated_at** on users, providers, bookings
- **Immutable created_at** timestamps
- **Timezone**: All times stored in UTC

### 9.2 Time-based Constraints
- **Booking window**: Current date to +30 days
- **Working hours**: Provider-specific daily schedules
- **OTP expiration**: Implementation pending
- **Password reset token**: Implementation pending

## 10. Geospatial Business Logic

### 10.1 Location Storage
- **PostGIS GEOGRAPHY type** for accurate distance calculations
- **SRID 4326** (WGS84) coordinate system
- **Point geometry** for provider locations

### 10.2 Proximity Search
- **Default radius**: 10km
- **Maximum radius**: 50km
- **Distance calculation**: Great circle distance
- **Results sorted** by distance (nearest first)
- **Only verified providers** in search results

## 11. Multi-language Support

### 11.1 Language Rules
- **Supported languages**: Arabic (ar), English (en)
- **Default language**: Arabic
- **Required bilingual fields**:
  - Provider business names
  - Service names and descriptions
  - Category names
- **User preference**: Stored per customer

### 11.2 RTL Support
- **Arabic content**: Right-to-left display
- **English content**: Left-to-right display
- **Mixed content**: Follows user's language preference

## 12. Security & Privacy Rules

### 12.1 Row-Level Security (RLS)
- **Users**: Can only view/update own profile
- **Providers**: Public view if verified, full access to own data
- **Services**: Public view if active, provider manages own
- **Bookings**: Visible to involved customer and provider only
- **Reviews**: Public read, customer creates for own bookings
- **Settlements**: Provider views own only

### 12.2 Data Access Patterns
- **Public data**: Verified providers, active services, reviews
- **Private data**: User profiles, bookings, settlements
- **Restricted operations**: Provider verification (admin only)

## 13. Business Constraints & Invariants

### 13.1 Unique Constraints
- User phone numbers must be unique
- Provider emails must be unique
- Provider phones must be unique
- One review per booking
- One availability schedule per provider per day
- Service names unique per provider
- One settlement per provider per month

### 13.2 Referential Integrity
- Bookings reference valid users, providers, and services
- Reviews reference completed bookings
- Services belong to providers
- Cascading deletes on provider removal

### 13.3 Business Invariants
- Provider rating always between 0.0 and 5.0
- Booking end time > start time
- Service price >= 0
- Platform fee + provider fee = total amount
- Only completed bookings can have reviews
- Settlements only for completed bookings

## 14. Future Business Logic (Planned)

### 14.1 SMS/OTP System
- 6-digit code generation
- 5-minute expiration
- Maximum 3 attempts
- Rate limiting per phone number

### 14.2 Payment Gateway Integration
- Tap payment processing
- Automatic settlement tracking
- Refund workflows
- Payment failure handling

### 14.3 Notification Rules
- Booking confirmation notifications
- Appointment reminders (24h, 2h before)
- Cancellation notifications
- Review reminders post-service

### 14.4 Loyalty Program
- Points per booking
- Tier-based benefits
- Redemption rules
- Expiration policies