# Upstash Redis Setup Guide

This guide walks you through setting up Upstash Redis for Lamsa production deployment.

## Why Upstash Redis?

Upstash is a serverless Redis service that offers:
- **Pay-per-request pricing** - Cost-effective for startup workloads
- **Global edge locations** - Low latency worldwide
- **Built-in monitoring** - Performance metrics and alerts
- **No server management** - Fully managed service
- **Easy integration** - Works seamlessly with Vercel and other platforms

## Step 1: Create Upstash Account

1. Go to [upstash.com](https://upstash.com)
2. Sign up with your email or GitHub account
3. Verify your email address
4. Complete the onboarding process

## Step 2: Create Redis Database

1. **Access Dashboard**:
   - Login to Upstash Console
   - Click "Create Database" button

2. **Configure Database**:
   ```
   Database Name: lamsa-production
   Type: Regional
   Region: Europe (Frankfurt) - Closest to Jordan
   TLS: Enabled (recommended)
   Eviction: allkeys-lru
   ```

3. **Advanced Settings**:
   ```
   Max Memory: 256MB (start small, can upgrade later)
   Max Connections: 1000
   Max Request Size: 1MB
   ```

## Step 3: Get Connection Details

After creating the database, you'll see:

1. **Database URL**: `redis://eu1-driven-cat-12345.upstash.io:6379`
2. **Password**: `AQICAHgMGx...` (long string)
3. **REST API**: `https://eu1-driven-cat-12345.upstash.io`
4. **REST Token**: `AAAIyODMxN...` (for REST API access)

## Step 4: Update Environment Variables

Update your `.env.production` file:

```bash
# Upstash Redis Configuration
REDIS_URL=redis://eu1-driven-cat-12345.upstash.io:6379
REDIS_PASSWORD=AQICAHgMGx...your-actual-password...
REDIS_TLS=true

# Optional: REST API (for serverless functions)
UPSTASH_REDIS_REST_URL=https://eu1-driven-cat-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AAAIyODMxN...your-actual-token...
```

## Step 5: Test Connection

Run the Redis connection test:

```bash
cd lamsa-api
npm run test:redis:prod
```

Expected output:
```
✅ Basic Connection: PING response: PONG
✅ Set/Get Operation: SET/GET operations working
✅ Expiration (TTL): TTL working (2 seconds)
✅ Hash Operations: Hash operations working
✅ List Operations: List operations working (3 items)
✅ Performance Test: Avg operation time: 15.23ms
```

## Step 6: Configure Application

### API Configuration (lamsa-api)

Update your Redis client configuration:

```javascript
// src/config/redis.js
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
  socket: {
    tls: process.env.REDIS_TLS === 'true'
  }
});

module.exports = redisClient;
```

### Rate Limiting Configuration

```javascript
// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'lamsa:rate-limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

## Step 7: Session Management

```javascript
// src/middleware/session.js
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const sessionConfig = {
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};
```

## Step 8: Caching Implementation

```javascript
// src/services/cache.js
class CacheService {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      await this.redis.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  // Cache provider search results
  async cacheProviderSearch(lat, lng, radius, data) {
    const key = `providers:search:${lat}:${lng}:${radius}`;
    await this.set(key, data, 300); // 5 minutes
  }

  async getCachedProviderSearch(lat, lng, radius) {
    const key = `providers:search:${lat}:${lng}:${radius}`;
    return await this.get(key);
  }
}

module.exports = new CacheService(redisClient);
```

## Step 9: Monitoring and Alerts

### Upstash Dashboard Monitoring

1. **Access Metrics**:
   - Go to Upstash Console → Your Database → Metrics
   - Monitor: Requests/sec, Response time, Memory usage

2. **Set Up Alerts**:
   - High memory usage (>80%)
   - High response time (>50ms)
   - Connection errors

### Application Monitoring

```javascript
// src/middleware/metrics.js
const prometheus = require('prom-client');

const redisMetrics = {
  requests: new prometheus.Counter({
    name: 'redis_requests_total',
    help: 'Total Redis requests',
    labelNames: ['operation', 'status']
  }),
  
  responseTime: new prometheus.Histogram({
    name: 'redis_response_time_seconds',
    help: 'Redis response time',
    labelNames: ['operation']
  })
};

// Wrap Redis operations with metrics
const wrapRedisOperation = (operation, operationName) => {
  return async (...args) => {
    const start = Date.now();
    try {
      const result = await operation(...args);
      redisMetrics.requests.labels(operationName, 'success').inc();
      redisMetrics.responseTime.labels(operationName).observe((Date.now() - start) / 1000);
      return result;
    } catch (error) {
      redisMetrics.requests.labels(operationName, 'error').inc();
      throw error;
    }
  };
};
```

## Step 10: Production Best Practices

### Connection Management

```javascript
// src/config/redis.js
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
  socket: {
    tls: process.env.REDIS_TLS === 'true',
    connectTimeout: 5000,
    lazyConnect: true
  },
  retry_strategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 50, 2000);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing Redis connection...');
  await redisClient.quit();
  process.exit(0);
});

module.exports = redisClient;
```

### Error Handling

```javascript
// src/middleware/errorHandler.js
const handleRedisError = (error, req, res, next) => {
  if (error.code === 'ECONNREFUSED') {
    console.error('Redis connection refused');
    // Fallback to non-cached response
    delete req.useCache;
    return next();
  }
  
  console.error('Redis error:', error);
  next(error);
};
```

## Pricing and Scaling

### Upstash Pricing (as of 2024)

```
Free Tier:
- 10,000 requests/month
- 256MB storage
- 1 database

Pay-as-you-go:
- $0.2 per 100K requests
- $0.25 per GB storage/month
- Additional databases: $0.01/day each
```

### Estimated Monthly Costs

```
Development: $0 (free tier)
Production (moderate usage): $10-25/month
Production (high usage): $50-100/month
```

### Scaling Strategy

1. **Start Small**: Use free tier for development
2. **Monitor Usage**: Track requests and memory
3. **Optimize First**: Implement efficient caching patterns
4. **Scale Up**: Increase memory/requests as needed

## Troubleshooting

### Common Issues

1. **Connection Timeout**:
   - Check TLS settings
   - Verify region selection
   - Test network connectivity

2. **Authentication Failed**:
   - Confirm password is correct
   - Check environment variable loading
   - Verify database is active

3. **High Latency**:
   - Choose closer region
   - Optimize cache keys
   - Use connection pooling

### Performance Optimization

```javascript
// Batch operations
const pipe = redisClient.pipeline();
pipe.set('key1', 'value1');
pipe.set('key2', 'value2');
pipe.set('key3', 'value3');
await pipe.exec();

// Use appropriate data types
await redisClient.hSet('user:123', 'name', 'John');
await redisClient.hSet('user:123', 'email', 'john@example.com');

// Set appropriate TTL
await redisClient.setEx('temp:data', 300, JSON.stringify(data));
```

## Next Steps

1. ✅ Create Upstash account and database
2. ✅ Update .env.production with connection details
3. ✅ Test Redis connection
4. ✅ Configure application caching
5. ✅ Set up monitoring and alerts
6. ✅ Deploy to production

## Integration with Vercel

When deploying to Vercel, add environment variables:

```bash
# Vercel environment variables
REDIS_URL=redis://eu1-driven-cat-12345.upstash.io:6379
REDIS_PASSWORD=AQICAHgMGx...
REDIS_TLS=true
```

Upstash works seamlessly with Vercel's serverless functions and provides optimal performance for edge deployments.