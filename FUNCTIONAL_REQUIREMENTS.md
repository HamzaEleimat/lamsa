# BeautyCort Functional Requirements Document

## 1. Executive Summary

BeautyCort is a mobile-first beauty services booking platform designed for the Jordan market. The platform connects customers with beauty service providers through a marketplace model, supporting both Arabic and English languages with full RTL support. The system facilitates appointment booking, payment processing, and service provider management.

## 2. System Overview

### 2.1 Platform Components
- **Mobile Application**: React Native app for iOS and Android (customers)
- **Web Dashboard**: Next.js web application for providers and admin
- **Backend API**: Node.js/Express RESTful API
- **Database**: PostgreSQL with PostGIS for geolocation support

### 2.2 User Roles
1. **Customer**: End users who book beauty services
2. **Provider**: Beauty service providers (salons, spas, freelancers)
3. **Admin**: Platform administrators

## 3. Functional Requirements

### 3.1 User Management

#### 3.1.1 Customer Registration & Authentication
- **Phone-based registration** with Jordanian mobile numbers (77, 78, 79 prefixes)
- **OTP verification** via SMS (6-digit code)
- **Profile management**: Name, email (optional), preferred language (Arabic/English)
- **No password required** - authentication via phone/OTP only
- **Session management** with JWT tokens (7-day expiration)

#### 3.1.2 Provider Registration & Authentication
- **Email/password-based registration**
- **Required information**:
  - Business name (Arabic & English)
  - Owner name
  - Phone number
  - Email address
  - Physical location (GPS coordinates)
  - Address details (street, city, district)
  - Business license (optional)
- **Manual verification** by admin before activation
- **Password reset** functionality via email
- **JWT-based authentication** with refresh tokens

### 3.2 Service Provider Management

#### 3.2.1 Provider Profile
- **Multi-language business names** (Arabic & English)
- **Location-based services** with GPS coordinates
- **Business verification** status
- **Rating system** (1-5 stars, auto-calculated from reviews)
- **License documentation** upload
- **Working hours** configuration by day of week

#### 3.2.2 Service Management
- **Service categories** (8 predefined):
  - Women's Salon
  - Men's Salon
  - Spa & Massage
  - Nails
  - Makeup
  - Skincare
  - Hair Removal
  - Beauty Clinic
- **Service details**:
  - Name (Arabic & English)
  - Description (Arabic & English)
  - Price (in JOD)
  - Duration (in minutes)
  - Active/inactive status
- **CRUD operations** for providers to manage their services

### 3.3 Search & Discovery

#### 3.3.1 Provider Search
- **Location-based search** with radius filtering (default 10km)
- **Category filtering**
- **Rating filtering**
- **Price range filtering**
- **Availability checking**
- **Distance calculation** from user location

#### 3.3.2 Service Search
- **Text-based search** in Arabic and English
- **Category filtering**
- **Price range filtering**
- **Provider filtering**

### 3.4 Booking System

#### 3.4.1 Booking Creation
- **Date and time selection**
- **Service selection** from provider's catalog
- **Availability checking** against provider's schedule
- **Conflict prevention** (no double-booking)
- **Booking notes** (optional)
- **Automatic fee calculation** (15% platform fee)

#### 3.4.2 Booking Management
- **Booking statuses**:
  - Pending (initial state)
  - Confirmed (provider accepted)
  - Completed (service delivered)
  - Cancelled (by customer or provider)
  - No-show (customer didn't arrive)
- **Rescheduling** functionality
- **Cancellation** with reason tracking
- **Booking history** for customers and providers

#### 3.4.3 Provider Availability
- **Weekly schedule configuration**
- **Time slot management** (start/end times per day)
- **Availability toggling** (available/unavailable per day)
- **Real-time availability checking**

### 3.5 Payment System

#### 3.5.1 Payment Methods
- **Cash** payment on service delivery
- **Card** payment (future - Tap integration)
- **Online** payment (future - Tap integration)

#### 3.5.2 Payment Processing
- **Amount tracking** per booking
- **Fee calculation**:
  - Platform fee: 15% (configurable)
  - Provider fee: 85% of total amount
- **Payment status tracking**
- **Refund functionality** with reason tracking

#### 3.5.3 Financial Settlements
- **Monthly settlement generation** for providers
- **Settlement tracking**:
  - Total bookings
  - Total amount
  - Platform fees
  - Settlement status (pending/processing/paid/failed)
- **Payment history** for customers and providers

### 3.6 Review & Rating System

#### 3.6.1 Review Creation
- **One review per completed booking**
- **Rating scale**: 1-5 stars (required)
- **Text comment** (optional)
- **Review timing**: Only after booking completion

#### 3.6.2 Review Management
- **Public visibility** of all reviews
- **Update capability** by review author
- **Automatic rating calculation** for providers
- **Review count tracking**

### 3.7 Notification System

#### 3.7.1 SMS Notifications (Future)
- **OTP delivery** for customer authentication
- **Booking confirmations**
- **Appointment reminders**
- **Cancellation notifications**

#### 3.7.2 Push Notifications (Future)
- **Booking status updates**
- **New booking requests** (for providers)
- **Promotional messages**
- **System announcements**

### 3.8 Internationalization

#### 3.8.1 Language Support
- **Arabic** (default language, RTL support)
- **English** (LTR support)
- **Language persistence** across sessions
- **Dynamic language switching**

#### 3.8.2 Localization
- **Currency**: Jordanian Dinar (JOD)
- **Date/Time**: Local Jordan timezone
- **Phone format**: Jordan mobile format (+962)

## 4. Technical Requirements

### 4.1 Performance
- **API response time**: < 200ms for standard queries
- **Location search**: < 500ms within 10km radius
- **Mobile app startup**: < 3 seconds
- **Concurrent users**: Support for 10,000+ active users

### 4.2 Security
- **HTTPS enforcement** in production
- **JWT token authentication**
- **Password hashing** with bcrypt
- **Row-level security** in database
- **Input validation** on all endpoints
- **Rate limiting** on authentication endpoints

### 4.3 Data Management
- **Automated backups** (database)
- **Data retention**: 2 years for bookings
- **GDPR compliance** for user data
- **Audit logging** for critical operations

### 4.4 Integration Requirements
- **Supabase**: Database and authentication
- **Twilio**: SMS delivery (future)
- **Tap Payment Gateway**: Online payments (future)
- **Expo Push Notifications**: Mobile notifications (future)

## 5. Non-Functional Requirements

### 5.1 Usability
- **Mobile-first design**
- **Intuitive navigation**
- **Minimal learning curve**
- **Accessibility compliance**

### 5.2 Reliability
- **99.9% uptime** target
- **Graceful error handling**
- **Offline capability** for critical features
- **Data synchronization** when connection restored

### 5.3 Scalability
- **Horizontal scaling** capability
- **Database indexing** for performance
- **Caching strategy** implementation
- **CDN usage** for static assets

## 6. Future Enhancements

1. **In-app messaging** between customers and providers
2. **Loyalty program** with points/rewards
3. **Social media integration** for authentication
4. **Advanced analytics** dashboard for providers
5. **AI-powered recommendations**
6. **Video consultations** for beauty advice
7. **Group bookings** for events
8. **Waitlist management**
9. **Dynamic pricing** based on demand
10. **Multi-branch support** for chain salons

## 7. Constraints & Assumptions

### 7.1 Constraints
- **Geographic limitation**: Jordan market only initially
- **Language limitation**: Arabic and English only
- **Payment limitation**: Cash-only at launch
- **Platform limitation**: Mobile app priority over web

### 7.2 Assumptions
- Users have smartphones with internet connectivity
- Providers have basic digital literacy
- SMS delivery is reliable in Jordan
- GPS location services are available
- Users are comfortable with phone-based authentication

## 8. Success Metrics

1. **User acquisition**: 1,000+ active customers in first 3 months
2. **Provider onboarding**: 100+ verified providers
3. **Booking volume**: 500+ successful bookings per month
4. **User retention**: 40% monthly active users
5. **Provider satisfaction**: 4+ star average rating
6. **Platform reliability**: < 0.1% downtime
7. **Response time**: < 2 seconds for 95% of requests
8. **Conversion rate**: 20% search-to-booking ratio