# BeautyCort API Documentation

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://api.beautycort.com/api`

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- OTP requests: 3 requests per hour
- File uploads: 20 requests per hour

## API Endpoints

### Authentication

#### Customer Authentication

##### Send OTP
```http
POST /auth/send-otp
```
**Body:**
```json
{
  "phone": "+962791234567"
}
```
**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "expiresIn": 300,
    "phone": "+962791234567"
  }
}
```

##### Verify OTP
```http
POST /auth/verify-otp
```
**Body:**
```json
{
  "phone": "+962791234567",
  "otp": "123456"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+962791234567",
      "name": "User Name"
    },
    "token": "jwt_token"
  }
}
```

#### Provider Authentication

##### Provider Send OTP
```http
POST /auth/provider/send-otp
```
**Body:**
```json
{
  "phone": "+962791234567"
}
```

##### Provider Verify OTP
```http
POST /auth/provider/verify-otp
```
**Body:**
```json
{
  "phone": "+962791234567",
  "otp": "123456"
}
```

##### Provider Signup
```http
POST /auth/provider/signup
```
**Body:**
```json
{
  "email": "provider@example.com",
  "password": "SecurePass123!",
  "phone": "+962791234567",
  "business_name_ar": "صالون الجمال",
  "business_name_en": "Beauty Salon",
  "owner_name": "John Doe",
  "latitude": 31.9539,
  "longitude": 35.9106,
  "address": {
    "street": "123 Main St",
    "city": "Amman",
    "district": "Abdoun",
    "country": "Jordan"
  }
}
```

##### Provider Login
```http
POST /auth/provider/login
```
**Body:**
```json
{
  "email": "provider@example.com",
  "password": "SecurePass123!"
}
```

##### Logout
```http
POST /auth/logout
```
**Headers:** Requires authentication

##### Refresh Token
```http
POST /auth/refresh
```
**Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### Provider Management

#### Get Provider Profile
```http
GET /providers/:id
```

#### Update Provider Profile
```http
PUT /providers/:id
```
**Body:**
```json
{
  "business_name_ar": "صالون الجمال المحدث",
  "business_name_en": "Updated Beauty Salon",
  "bio_ar": "نحن صالون متخصص",
  "bio_en": "We are a specialized salon",
  "phone": "+962791234567"
}
```

#### Upload Provider Images
```http
POST /providers/:id/images
```
**Body:** Multipart form data with image files

#### Get Provider Services
```http
GET /providers/:id/services
```

#### Get Provider Availability
```http
GET /providers/:id/availability
```
**Query Parameters:**
- `date`: YYYY-MM-DD
- `service_id`: UUID of the service

#### Search Providers
```http
GET /providers/search
```
**Query Parameters:**
- `lat`: Latitude
- `lng`: Longitude
- `radius`: Search radius in km (default: 10)
- `category`: Service category ID
- `query`: Search text
- `women_only`: Boolean
- `home_service`: Boolean

### Service Management

#### Create Service
```http
POST /services
```
**Body:**
```json
{
  "provider_id": "uuid",
  "category_id": "uuid",
  "name_ar": "قص شعر",
  "name_en": "Haircut",
  "description_ar": "قص شعر احترافي",
  "description_en": "Professional haircut",
  "price": 20.00,
  "duration_minutes": 30,
  "preparation_minutes": 5,
  "cleanup_minutes": 5
}
```

#### Update Service
```http
PUT /services/:id
```

#### Delete Service
```http
DELETE /services/:id
```

#### Get Service Categories
```http
GET /services/categories
```

### Availability Management

#### Get Availability Settings
```http
GET /providers/:id/availability/settings
```

#### Update Availability Settings
```http
PUT /providers/:id/availability/settings
```
**Body:**
```json
{
  "advance_booking_days": 30,
  "min_advance_booking_hours": 2,
  "enable_prayer_breaks": true,
  "allow_instant_booking": false
}
```

#### Get Working Schedule
```http
GET /providers/:id/availability/schedule
```

#### Update Working Schedule
```http
PUT /providers/:id/availability/schedule
```
**Body:**
```json
{
  "schedule": [
    {
      "day_of_week": 0,
      "shifts": [
        {
          "start_time": "09:00",
          "end_time": "17:00",
          "shift_type": "regular"
        }
      ],
      "breaks": [
        {
          "break_type": "lunch",
          "start_time": "12:00",
          "end_time": "13:00"
        }
      ]
    }
  ]
}
```

#### Create Time Off
```http
POST /providers/:id/availability/time-off
```
**Body:**
```json
{
  "start_date": "2025-01-20",
  "end_date": "2025-01-22",
  "reason": "vacation",
  "description": "Family vacation"
}
```

### Booking Management

#### Create Booking
```http
POST /bookings
```
**Body:**
```json
{
  "provider_id": "uuid",
  "service_id": "uuid",
  "booking_date": "2025-01-15",
  "booking_time": "14:00",
  "customer_name": "Jane Doe",
  "customer_phone": "+962791234567",
  "notes": "First time customer"
}
```

#### Get User Bookings
```http
GET /bookings/user/:userId
```

#### Get Provider Bookings
```http
GET /bookings/provider/:providerId
```

#### Update Booking Status
```http
PUT /bookings/:id/status
```
**Body:**
```json
{
  "status": "confirmed"
}
```

#### Cancel Booking
```http
POST /bookings/:id/cancel
```
**Body:**
```json
{
  "reason": "Customer request"
}
```

### Reviews

#### Create Review
```http
POST /reviews
```
**Body:**
```json
{
  "booking_id": "uuid",
  "rating": 5,
  "comment": "Excellent service!"
}
```

#### Get Provider Reviews
```http
GET /reviews/provider/:providerId
```

### Provider Dashboard

#### Get Dashboard Overview
```http
GET /dashboard/overview
```

#### Get Today's Appointments
```http
GET /dashboard/appointments/today
```

#### Get Revenue Analytics
```http
GET /dashboard/revenue
```
**Query Parameters:**
- `period`: day, week, month, year
- `start_date`: YYYY-MM-DD
- `end_date`: YYYY-MM-DD

#### Get Performance Metrics
```http
GET /dashboard/performance
```

### Real-time Updates (WebSocket)

#### Connect to WebSocket
```
ws://localhost:3000/ws
```

#### Authentication Message
```json
{
  "type": "auth",
  "data": {
    "providerId": "uuid",
    "token": "jwt_token"
  }
}
```

#### Subscribe to Events
```json
{
  "type": "subscribe",
  "data": {
    "events": ["booking", "notification", "metrics"]
  }
}
```

### Payment (Coming Soon)

#### Process Payment
```http
POST /payments/process
```

#### Get Payment History
```http
GET /payments/history
```

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message in English",
  "error_ar": "رسالة الخطأ بالعربية",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT`: Rate limit exceeded
- `SERVER_ERROR`: Internal server error

## Webhook Events (Future)

- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `payment.completed`
- `review.created`

---

Last Updated: 2025-01-14