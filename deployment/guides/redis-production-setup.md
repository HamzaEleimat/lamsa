# Redis Production Setup Guide

This guide walks you through setting up Redis for production deployment of Lamsa.

## Why Redis is Required

Lamsa uses Redis for:
- **Session management** - User authentication sessions
- **Caching** - API response caching for better performance
- **Rate limiting** - Request throttling and abuse prevention
- **Real-time features** - WebSocket connection management

## Cloud Provider Options

### 1. AWS ElastiCache (Recommended)
**Pros:**
- Fully managed service
- Automatic failover and backup
- High availability with Multi-AZ
- Integrated with AWS ecosystem

**Setup Steps:**
1. Go to AWS Console → ElastiCache
2. Create Redis cluster:
   - **Engine**: Redis 7.x
   - **Node type**: cache.t3.micro (for testing) or cache.m6g.large (production)
   - **Replicas**: 1 (for high availability)
   - **Subnet group**: Default or custom VPC
   - **Security group**: Allow port 6379 from your application

**Connection String Format:**
```
redis://your-cluster.cache.amazonaws.com:6379
```

**Monthly Cost**: $15-50 depending on instance size

### 2. Azure Cache for Redis
**Pros:**
- Integrated with Azure ecosystem
- Good performance and reliability
- Built-in monitoring

**Setup Steps:**
1. Go to Azure Portal → Create Resource → Azure Cache for Redis
2. Configure:
   - **Pricing tier**: Basic C1 (testing) or Standard C2 (production)
   - **Location**: Choose closest to your application
   - **Networking**: Configure access rules

**Connection String Format:**
```
redis://your-cache.redis.cache.windows.net:6380
```

**Monthly Cost**: $20-60 depending on tier

### 3. Google Cloud Memorystore
**Pros:**
- Fully managed by Google
- Good integration with GCP
- Automatic scaling

**Setup Steps:**
1. Go to GCP Console → Memorystore → Redis
2. Create instance:
   - **Tier**: Basic (testing) or Standard (production)
   - **Memory size**: 1GB minimum
   - **Region**: Closest to your application

**Connection String Format:**
```
redis://10.0.0.1:6379
```

**Monthly Cost**: $25-70 depending on size

### 4. UpCloud Managed Redis (Budget Option)
**Pros:**
- Cost-effective
- Good performance
- European data centers

**Setup Steps:**
1. Go to UpCloud Console → Databases → Redis
2. Create service:
   - **Plan**: 1 CPU, 1GB RAM minimum
   - **Location**: Choose closest to Jordan (Frankfurt/London)

**Connection String Format:**
```
redis://username:password@redis-service.upcloud.com:6379
```

**Monthly Cost**: $10-30 (most affordable)

## Production Configuration

### Required Settings in .env.production

```bash
# Redis Configuration
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your_secure_redis_password
REDIS_DB=0
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Cache Configuration
CACHE_TTL=3600
ENABLE_CACHING=true
```

### Security Configuration

1. **Enable Authentication**:
   - Set a strong password
   - Use AUTH command for connections

2. **Network Security**:
   - Configure security groups/firewalls
   - Only allow connections from your application servers
   - Use VPC/private networking when possible

3. **Encryption**:
   - Enable encryption in transit (TLS)
   - Enable encryption at rest (if supported)

## Testing Redis Connection

After setting up Redis, test the connection:

```bash
# Test Redis connection
cd lamsa-api
npm run test:redis
```

## Performance Optimization

### Redis Configuration
```bash
# Memory optimization
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence (for production)
save 900 1
save 300 10
save 60 10000

# Connection limits
maxclients 10000
```

### Application-Level Caching
```javascript
// Cache frequently accessed data
const cacheKey = `providers:nearby:${lat}:${lng}`;
const ttl = 300; // 5 minutes
```

## Monitoring and Alerts

### Key Metrics to Monitor
1. **Memory Usage**: Should stay under 80%
2. **Connection Count**: Monitor for connection leaks
3. **Hit Rate**: Should be > 90% for effective caching
4. **Response Time**: Should be < 1ms for most operations

### Alerting Setup
- Memory usage > 80%
- Connection count > 80% of max
- Hit rate < 70%
- Response time > 5ms

## Backup Strategy

### Automatic Backups
- Enable daily backups
- Retain backups for 7 days minimum
- Test restore procedures regularly

### Manual Backup Commands
```bash
# Create backup
redis-cli --rdb backup.rdb

# Restore from backup
redis-cli --pipe < backup.rdb
```

## Scaling Strategy

### Vertical Scaling
- Start with 1GB RAM
- Monitor memory usage
- Upgrade to 2GB/4GB as needed

### Horizontal Scaling
- Use Redis Cluster for > 4GB datasets
- Implement sharding in application layer
- Consider read replicas for read-heavy workloads

## Cost Optimization

### Development Environment
- Use smaller instances (512MB-1GB)
- Single node without replication
- Shorter backup retention

### Production Environment
- Use appropriate instance sizes
- Enable replication for high availability
- Set up proper monitoring to avoid over-provisioning

## Troubleshooting

### Common Issues

1. **Connection Timeout**:
   - Check network connectivity
   - Verify security groups/firewall rules
   - Confirm Redis is running

2. **Memory Issues**:
   - Monitor memory usage
   - Implement proper eviction policies
   - Consider upgrading instance size

3. **Performance Issues**:
   - Check for slow queries
   - Monitor connection pool usage
   - Optimize cache key patterns

## Next Steps

1. Choose your Redis provider
2. Create the Redis instance
3. Update `.env.production` with connection details
4. Run connection tests
5. Configure monitoring and alerts
6. Set up backup procedures

## Recommended Choice for Lamsa

For a Jordan-based beauty booking platform, I recommend:

**For Budget-Conscious Setup**: UpCloud Managed Redis (Frankfurt)
- Cost: ~$15/month
- Good performance to Europe/Middle East
- Simple setup

**For Enterprise Setup**: AWS ElastiCache (eu-central-1)
- Cost: ~$40/month
- High availability and reliability
- Integrated monitoring and backup

Choose based on your budget and reliability requirements.