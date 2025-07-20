# Lamsa Provider Dashboard System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Services](#services)
6. [Real-time Features](#real-time-features)
7. [Caching Strategy](#caching-strategy)
8. [Jordan-Specific Features](#jordan-specific-features)
9. [Authentication & Security](#authentication--security)
10. [Performance Considerations](#performance-considerations)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting](#troubleshooting)

## Overview

The Lamsa Provider Dashboard System is a comprehensive analytics and management platform designed specifically for beauty service providers in the Jordan market. It provides real-time insights, performance analytics, customer management, revenue tracking, and gamification features.

### Key Features
- **Real-time Analytics**: Live dashboard metrics with WebSocket updates
- **Revenue Tracking**: Comprehensive financial analytics with Jordan tax compliance
- **Customer Analytics**: Segmentation, retention, and churn prediction
- **Gamification**: Achievement system with levels and leaderboards
- **Performance Insights**: AI-driven recommendations and market intelligence
- **Multi-language Support**: Arabic (RTL) and English support
- **Caching System**: Redis-based caching with memory fallback

## Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web Dashboard │    │   Admin Panel   │
│  (React Native)│    │   (Next.js)     │    │   (Next.js)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Express.js API       │
                    │  ┌─────────────────────┐  │
                    │  │   Controllers       │  │
                    │  ├─────────────────────┤  │
                    │  │   Services          │  │
                    │  ├─────────────────────┤  │
                    │  │   Middleware        │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐    ┌───────────▼──────────┐    ┌────────▼────────┐
│   Supabase     │    │      Redis Cache     │    │   WebSocket     │
│  (PostgreSQL)  │    │   (with fallback)    │    │   (Real-time)   │
└────────────────┘    └──────────────────────┘    └─────────────────┘
```

### Technology Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Cache**: Redis with in-memory fallback
- **Real-time**: WebSocket (ws library)
- **Authentication**: JWT tokens
- **Validation**: express-validator
- **Documentation**: Swagger/OpenAPI

## Database Schema

### Core Analytics Tables

#### `provider_reviews_analytics`
Stores review analytics with sentiment analysis and response tracking.

```sql
CREATE TABLE provider_reviews_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    review_id UUID NOT NULL REFERENCES reviews(id),
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    aspects JSONB DEFAULT '{}',
    response_time_hours INTEGER,
    has_provider_response BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `provider_analytics_cache`
High-performance caching table for frequently accessed analytics data.

```sql
CREATE TABLE provider_analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    cache_key VARCHAR(255) NOT NULL,
    cache_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `provider_customer_retention`
Tracks customer behavior patterns and retention metrics.

```sql
CREATE TABLE provider_customer_retention (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    first_booking_date DATE NOT NULL,
    last_booking_date DATE NOT NULL,
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    avg_days_between_bookings DECIMAL(5,2),
    customer_lifetime_value DECIMAL(10,2),
    risk_score DECIMAL(3,2) CHECK (risk_score >= 0 AND risk_score <= 1),
    segment VARCHAR(20) CHECK (segment IN ('new', 'regular', 'vip', 'at_risk', 'churned')),
    preferred_services TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Performance and Gamification Tables

#### `provider_achievements`
Manages the achievement system for provider gamification.

```sql
CREATE TABLE provider_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    points_awarded INTEGER DEFAULT 0,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    progress JSONB DEFAULT '{}'
);
```

#### `provider_performance_scores`
Tracks comprehensive performance metrics and scoring.

```sql
CREATE TABLE provider_performance_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    date DATE NOT NULL,
    overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
    customer_satisfaction DECIMAL(5,2),
    booking_efficiency DECIMAL(5,2),
    revenue_performance DECIMAL(5,2),
    response_time_score DECIMAL(5,2),
    service_quality_score DECIMAL(5,2),
    factors JSONB DEFAULT '{}',
    recommendations TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Real-time Metrics Table

#### `provider_realtime_metrics`
Stores real-time dashboard metrics for instant updates.

```sql
CREATE TABLE provider_realtime_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Dashboard Controller (`/api/dashboard`)

#### Core Dashboard Endpoints

##### `GET /api/dashboard/overview/today/:providerId?`
**Description**: Retrieves today's comprehensive dashboard overview with real-time metrics.

**Parameters**:
- `providerId` (optional): Provider UUID (defaults to authenticated user)

**Response**:
```json
{
  "success": true,
  "data": {
    "date": "2025-01-14",
    "appointments": {
      "total": 8,
      "completed": 5,
      "pending": 2,
      "cancelled": 1,
      "data": [...]
    },
    "stats": {
      "revenue": 450.00,
      "customers": 7,
      "avgRating": 4.8,
      "completionRate": 87.5
    },
    "realtime": {
      "activeBookings": 2,
      "pendingPayments": 1,
      "unreadMessages": 3
    },
    "nextAppointment": {...},
    "dailyGoals": {...},
    "lastUpdated": "2025-01-14T10:30:00Z"
  }
}
```

##### `GET /api/dashboard/statistics/:providerId?`
**Description**: Provides weekly/monthly statistics with growth comparisons.

**Query Parameters**:
- `period`: "week" | "month" (default: "week")
- `date`: ISO date string (default: current date)

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "week",
    "dateRange": {
      "start": "2025-01-07",
      "end": "2025-01-13"
    },
    "current": {
      "revenue": 2800.00,
      "bookings": 45,
      "customers": 32,
      "avgRating": 4.7
    },
    "previous": {
      "revenue": 2400.00,
      "bookings": 38,
      "customers": 28,
      "avgRating": 4.6
    },
    "growth": {
      "revenue": 16.67,
      "bookings": 18.42,
      "customers": 14.29,
      "avgRating": 2.17
    },
    "trends": [...],
    "newAchievements": [...]
  }
}
```

#### Revenue Analytics

##### `GET /api/dashboard/revenue/:providerId?`
**Description**: Comprehensive revenue reporting with breakdowns and tax information.

**Query Parameters**:
- `period`: "week" | "month" | "custom"
- `date`: Reference date for period calculation
- `groupBy`: "day" | "week" | "month"
- `startDate`, `endDate`: For custom periods

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "month",
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-01-31"
    },
    "summary": {
      "totalRevenue": 12450.00,
      "netRevenue": 10582.50,
      "taxAmount": 1867.50,
      "averageOrder": 95.40,
      "totalTransactions": 134
    },
    "timeline": [...],
    "serviceBreakdown": [...],
    "paymentMethods": [...],
    "tax": {
      "vatAmount": 1867.50,
      "vatRate": 0.15,
      "taxableAmount": 12450.00
    },
    "pendingPayouts": [...]
  }
}
```

#### Customer Analytics

##### `GET /api/dashboard/customers/analytics/:providerId?`
**Description**: Customer segmentation, retention metrics, and churn analysis.

**Query Parameters**:
- `period`: "month" | "quarter"
- `includeChurned`: boolean (default: false)

**Response**:
```json
{
  "success": true,
  "data": {
    "segments": {
      "new": 15,
      "regular": 45,
      "vip": 12,
      "at_risk": 8,
      "churned": 3
    },
    "retention": {
      "rate": 78.5,
      "averageLifetime": 156,
      "repeatBookingRate": 65.2
    },
    "lifetimeValue": {
      "average": 325.50,
      "median": 280.00,
      "top10Percent": 850.00
    },
    "churnRisk": [...],
    "topCustomers": [...],
    "acquisitionChannels": [...]
  }
}
```

### Review Analytics Controller (`/api/review-analytics`)

#### `GET /api/review-analytics/sentiment/:providerId?`
**Description**: Sentiment analysis of customer reviews with actionable insights.

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalReviews": 145,
      "averageRating": 4.6,
      "responseRate": 87.5
    },
    "sentiment": {
      "positive": 78.6,
      "neutral": 15.2,
      "negative": 6.2
    },
    "aspectAnalysis": {
      "service_quality": 4.7,
      "timeliness": 4.5,
      "cleanliness": 4.8,
      "staff_friendliness": 4.6
    },
    "trends": [...],
    "actionableInsights": [...]
  }
}
```

### Gamification Controller (`/api/gamification`)

#### `GET /api/gamification/profile/:providerId?`
**Description**: Complete gamification profile with achievements, levels, and progress.

**Response**:
```json
{
  "success": true,
  "data": {
    "level": {
      "current": 15,
      "name": "Expert Provider",
      "progress": 75.5,
      "pointsToNext": 850
    },
    "stats": {
      "totalPoints": 12450,
      "currentStreak": 7,
      "longestStreak": 21,
      "completedGoals": 45
    },
    "achievements": [...],
    "dailyGoals": [...],
    "leaderboard": {...}
  }
}
```

### Cache Controller (`/api/cache`)

#### `GET /api/cache/stats`
**Description**: Cache performance statistics and health metrics.

**Response**:
```json
{
  "success": true,
  "data": {
    "type": "redis",
    "totalKeys": 1250,
    "memoryUsage": "45.2MB",
    "uptime": 86400,
    "hitRate": 89.5,
    "hits": 15420,
    "misses": 1820
  }
}
```

## Services

### Analytics Service (`analytics.service.ts`)

The core analytics service coordinates multiple specialized services and provides unified data processing.

#### Key Methods

##### `getPeriodStatistics(providerId, startDate, endDate, period)`
Calculates comprehensive statistics for a given period including revenue, bookings, customers, and ratings.

##### `getReviewInsights(providerId)`
Analyzes review data to provide sentiment trends, response rates, and improvement recommendations.

##### `getBookingPatterns(providerId)`
Identifies booking patterns including peak hours, popular services, and seasonal trends.

### Revenue Service (`revenue.service.ts`)

Specialized service for financial analytics and reporting.

#### Key Features
- **Jordan Tax Compliance**: Automatic VAT calculation (15%)
- **Multi-currency Support**: JOD primary with USD/EUR conversion
- **Payment Method Analysis**: Cash, card, digital wallet breakdowns
- **Revenue Projections**: ML-based forecasting
- **Expense Tracking**: Cost analysis and profit margins

#### Example Usage
```typescript
import { revenueService } from '../services/revenue.service';

// Get revenue timeline
const timeline = await revenueService.getRevenueTimeline(
  providerId, 
  startDate, 
  endDate, 
  'day'
);

// Calculate tax report
const taxReport = await revenueService.getTaxReport(
  providerId, 
  startDate, 
  endDate
);
```

### Customer Analytics Service (`customer-analytics.service.ts`)

Handles customer segmentation, retention analysis, and churn prediction.

#### Customer Segmentation Logic
- **New**: First booking within 30 days
- **Regular**: 2-10 bookings, active within 60 days
- **VIP**: 10+ bookings or high lifetime value
- **At Risk**: No bookings in 45-90 days
- **Churned**: No bookings in 90+ days

#### Churn Prediction Algorithm
```typescript
const churnScore = calculateChurnScore({
  daysSinceLastBooking,
  bookingFrequencyTrend,
  averageRating,
  complaintsCount,
  responseToPromotions
});
```

### Gamification Service (`gamification.service.ts`)

Implements a comprehensive achievement and leveling system.

#### Achievement Categories
- **Milestone Achievements**: Booking count milestones (10, 50, 100, 500)
- **Quality Achievements**: High ratings streaks
- **Growth Achievements**: Revenue milestones
- **Engagement Achievements**: Review response rates
- **Special Events**: Ramadan specials, holiday bonuses

#### Level Calculation
```typescript
const level = calculateLevel(totalPoints);
const pointsForNextLevel = getLevelRequirement(level + 1) - totalPoints;
```

### Performance Insights Service (`performance-insights.service.ts`)

AI-driven analytics providing actionable business recommendations.

#### Insight Categories
1. **Revenue Optimization**: Pricing recommendations, service bundling
2. **Customer Experience**: Service quality improvements
3. **Operational Efficiency**: Scheduling optimization
4. **Market Intelligence**: Competitor analysis, trend insights
5. **Growth Opportunities**: New service recommendations

#### Jordan-Specific Insights
- Prayer time scheduling optimization
- Ramadan business patterns
- Local holiday impact analysis
- Cultural preference trends

### Cache Service (`cache.service.ts`)

High-performance caching layer with Redis and memory fallback.

#### Caching Strategy
- **L1 Cache**: In-memory for ultra-fast access
- **L2 Cache**: Redis for distributed caching
- **Automatic Fallback**: Memory cache when Redis unavailable
- **TTL Management**: Configurable expiration times
- **Cache Warming**: Proactive data loading

#### Cache Key Patterns
```typescript
// Dashboard data
`dashboard:${providerId}:${date}`

// Analytics data
`analytics:${providerId}:${period}:${startDate}`

// Revenue data
`revenue:${providerId}:${period}:${startDate}`
```

## Real-time Features

### WebSocket Implementation

Real-time dashboard updates using WebSocket connections for instant data synchronization.

#### Connection Setup
```typescript
import { realtimeService } from '../services/realtime.service';

// Initialize WebSocket server
const wss = realtimeService.initialize(server);

// Client connection
const ws = new WebSocket('ws://localhost:3000');
```

#### Real-time Events
- **Booking Updates**: New bookings, cancellations, completions
- **Payment Notifications**: Payment received, refunds processed
- **Review Alerts**: New reviews, response needed
- **Achievement Unlocks**: New achievements earned
- **Goal Progress**: Daily goal updates

#### Message Format
```json
{
  "type": "booking_completed",
  "providerId": "uuid",
  "data": {
    "bookingId": "uuid",
    "revenue": 85.00,
    "customerId": "uuid",
    "timestamp": "2025-01-14T10:30:00Z"
  }
}
```

### Real-time Metrics Updates

Automatic dashboard metric updates without page refresh.

#### Metrics Tracked
- Active bookings count
- Today's revenue (live)
- Customer satisfaction (rolling average)
- Response time to messages
- Goal progress percentage

## Caching Strategy

### Multi-Level Caching Architecture

#### Level 1: In-Memory Cache
- **Use Case**: Ultra-fast access for frequently used data
- **TTL**: 1-5 minutes
- **Size Limit**: 1000 entries (configurable)
- **Eviction**: LRU (Least Recently Used)

#### Level 2: Redis Cache
- **Use Case**: Distributed caching across instances
- **TTL**: 5-60 minutes based on data type
- **Persistence**: Optional persistence for critical data
- **Clustering**: Support for Redis clusters

#### Cache Invalidation Strategies

1. **Time-Based**: Automatic expiration with TTL
2. **Event-Based**: Invalidate on data changes
3. **Pattern-Based**: Bulk invalidation by key patterns
4. **Manual**: Admin-triggered cache clearing

#### Cache Performance Monitoring

```typescript
// Get cache statistics
const stats = await cacheService.getStats();

// Monitor hit rates
const hitRate = stats.hits / (stats.hits + stats.misses) * 100;

// Health check
const health = await cacheController.getCacheHealth();
```

### Caching Best Practices

1. **Cache Frequently Accessed Data**: Dashboard overview, today's stats
2. **Short TTL for Real-time Data**: Live metrics (30 seconds)
3. **Longer TTL for Stable Data**: Historical analytics (1 hour)
4. **Cache Warming**: Pre-load data for peak hours
5. **Graceful Degradation**: Memory fallback when Redis fails

## Jordan-Specific Features

### Cultural and Business Adaptations

#### Prayer Time Integration
```typescript
// Prayer time aware scheduling
const prayerTimes = await getPrayerTimes(date, location);
const availableSlots = filterByPrayerTimes(slots, prayerTimes);
```

#### Ramadan Business Patterns
- Adjusted operating hours
- Special Ramadan services
- Pre-Eid booking surge analysis
- Iftar time considerations

#### Local Business Intelligence
- Jordan market trends analysis
- Local competitor benchmarking
- Cultural event impact on bookings
- Regional preference patterns

### Currency and Taxation

#### Jordan Dinar (JOD) Support
- Primary currency for all transactions
- Exchange rate integration for USD/EUR
- Cultural pricing patterns (round numbers)

#### VAT Compliance
```typescript
const taxReport = {
  vatRate: 0.15, // 15% VAT in Jordan
  taxableAmount: revenue,
  vatAmount: revenue * 0.15,
  netAmount: revenue - (revenue * 0.15)
};
```

### Language and Localization

#### Arabic (RTL) Support
- Arabic service names and descriptions
- RTL-optimized analytics displays
- Arabic number formatting
- Cultural date formats (Hijri calendar support)

#### Multi-language Data Structure
```json
{
  "name_en": "Hair Styling",
  "name_ar": "تصفيف الشعر",
  "description_en": "Professional hair styling service",
  "description_ar": "خدمة تصفيف شعر احترافية"
}
```

## Authentication & Security

### JWT Token Authentication

All dashboard endpoints require valid JWT authentication tokens.

#### Token Structure
```json
{
  "sub": "provider_uuid",
  "role": "provider",
  "iat": 1642118400,
  "exp": 1642204800,
  "permissions": ["dashboard:read", "analytics:read"]
}
```

#### Middleware Implementation
```typescript
// Authentication middleware
router.use(authenticateToken);

// Provider validation
router.use(validateProvider);

// Rate limiting
router.use(rateLimitMiddleware);
```

### Rate Limiting

Protect API endpoints from abuse with configurable rate limiting.

#### Rate Limit Configuration
- **Dashboard Endpoints**: 100 requests/minute
- **Analytics Endpoints**: 50 requests/minute
- **Export Endpoints**: 10 requests/hour
- **Cache Management**: 20 requests/minute

### Data Privacy and GDPR Compliance

#### Data Anonymization
```typescript
// Anonymize customer data in analytics
const anonymizedData = anonymizeCustomerData(customerData);
```

#### Data Retention Policies
- Analytics data: 2 years
- Cache data: 24 hours
- Logs: 30 days
- Customer PII: As per consent

## Performance Considerations

### Database Optimization

#### Indexing Strategy
```sql
-- High-performance indexes for analytics queries
CREATE INDEX idx_bookings_provider_date ON bookings(provider_id, booking_date);
CREATE INDEX idx_reviews_provider_created ON reviews(provider_id, created_at);
CREATE INDEX idx_payments_provider_date ON payments(provider_id, payment_date);

-- Composite indexes for complex queries
CREATE INDEX idx_analytics_cache_lookup ON provider_analytics_cache(provider_id, cache_key, expires_at);
```

#### Query Optimization
- Use of prepared statements
- Efficient JOIN operations
- Pagination for large datasets
- Aggregation optimization

### API Performance

#### Response Time Targets
- Dashboard overview: < 200ms
- Analytics queries: < 500ms
- Export operations: < 5s
- Real-time updates: < 50ms

#### Performance Monitoring
```typescript
// Response time logging
const startTime = Date.now();
// ... process request
const duration = Date.now() - startTime;
logger.info(`Dashboard request took ${duration}ms`);
```

### Scalability Considerations

#### Horizontal Scaling
- Stateless service design
- Redis session storage
- Load balancer ready
- Database connection pooling

#### Vertical Scaling
- Efficient memory usage
- CPU optimization
- Connection management
- Resource monitoring

## Deployment Guide

### Environment Configuration

#### Required Environment Variables
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Redis Cache
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password

# Application
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret

# Cache Configuration
CACHE_TTL=300
```

#### Optional Configuration
```bash
# Analytics
ANALYTICS_BATCH_SIZE=1000
ANALYTICS_RETENTION_DAYS=730

# Performance
MAX_CACHE_SIZE=10000
QUERY_TIMEOUT=30000

# Jordan-specific
DEFAULT_TIMEZONE=Asia/Amman
DEFAULT_CURRENCY=JOD
VAT_RATE=0.15
```

### Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis server running and accessible
- [ ] SSL certificates installed
- [ ] Monitoring and logging configured
- [ ] Backup strategy implemented
- [ ] Health checks configured
- [ ] Rate limiting enabled
- [ ] Security headers configured

## Troubleshooting

### Common Issues

#### Cache Connection Issues
```bash
# Check Redis connectivity
redis-cli ping

# Check cache service status
curl http://localhost:3000/api/cache/health
```

#### Database Performance Issues
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'bookings';
```

#### Memory Issues
```bash
# Monitor Node.js memory usage
node --max-old-space-size=4096 server.js

# Check cache memory usage
curl http://localhost:3000/api/cache/stats
```

### Error Codes and Solutions

#### HTTP 500: Internal Server Error
- Check database connectivity
- Verify environment variables
- Review application logs
- Check Redis connection

#### HTTP 429: Rate Limit Exceeded
- Implement proper request throttling
- Consider upgrading rate limits
- Use caching to reduce API calls

#### WebSocket Connection Failed
- Check firewall settings
- Verify WebSocket port accessibility
- Review proxy configuration

### Monitoring and Alerts

#### Key Metrics to Monitor
- API response times
- Database query performance
- Cache hit rates
- Memory usage
- Error rates
- Active WebSocket connections

#### Recommended Alerts
- Response time > 1 second
- Error rate > 5%
- Cache hit rate < 70%
- Memory usage > 80%
- Database connection failures

### Performance Tuning

#### Database Optimization
```sql
-- Update table statistics
ANALYZE bookings;
ANALYZE reviews;
ANALYZE payments;

-- Check for missing indexes
SELECT * FROM pg_stat_user_tables WHERE seq_scan > 0;
```

#### Cache Optimization
```typescript
// Increase cache TTL for stable data
await cacheService.set(key, data, 3600); // 1 hour

// Implement cache warming
await cacheController.warmUpCache(providerId);
```

#### Application Optimization
```typescript
// Use connection pooling
const poolConfig = {
  max: 20,
  min: 5,
  acquire: 30000,
  idle: 10000
};
```

## API Testing Examples

### Using cURL

#### Get Today's Overview
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/dashboard/overview/today
```

#### Get Revenue Report
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:3000/api/dashboard/revenue?period=month&groupBy=day"
```

#### Cache Health Check
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/cache/health
```

### Using JavaScript/Node.js

```javascript
const response = await fetch('/api/dashboard/overview/today', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

### WebSocket Testing

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    providerId: 'your-provider-id'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Real-time update:', message);
});
```

---

## Conclusion

The Lamsa Provider Dashboard System provides a comprehensive, scalable, and culturally-adapted analytics platform for beauty service providers in Jordan. With its robust architecture, real-time capabilities, and Jordan-specific features, it empowers providers to make data-driven decisions and grow their businesses effectively.

For additional support or feature requests, please refer to the API documentation or contact the development team.