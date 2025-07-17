# BeautyCort Environment Variables Configuration

**Version:** 1.0  
**Last Updated:** 2025-07-16  
**Environment:** Production Configuration Guide  

---

## 📋 Overview

This document provides comprehensive documentation for all environment variables required for BeautyCort production deployment. Each variable includes its purpose, format, default values, and security considerations.

---

## 🚀 Quick Start

### Minimum Required Variables
```bash
# Core Application
NODE_ENV=production
PORT=3000

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Authentication
JWT_SECRET=your_64_character_secure_jwt_secret_here_minimum_32_chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis (Required for production)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_secure_redis_password
```

---

## 🔧 Core Application Configuration

### Node.js Environment
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `NODE_ENV` | Application environment | Yes | `development` | `production` |
| `PORT` | Server port number | No | `3000` | `3000` |
| `APP_NAME` | Application name for branding | No | `BeautyCort` | `BeautyCort` |
| `APP_VERSION` | Application version for monitoring | No | `1.0.0` | `1.2.3` |

### Localization
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DEFAULT_LANGUAGE` | Default application language | No | `ar` | `ar` |
| `CURRENCY` | Default currency code | No | `JOD` | `JOD` |
| `TIMEZONE` | Application timezone | No | `Asia/Amman` | `Asia/Amman` |

---

## 🗄️ Database Configuration

### Supabase (Primary Database)
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `SUPABASE_URL` | Supabase project URL | Yes | Low | `https://abcdef.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anonymous key | Yes | Low | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_KEY` | Private service role key | Yes | **CRITICAL** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

**Security Notes:**
- ⚠️ `SUPABASE_SERVICE_KEY` has admin privileges - never expose in client code
- 🔒 Store in secure secrets manager (AWS Secrets Manager, HashiCorp Vault)
- 🔄 Rotate keys quarterly or if compromised

---

## 🔐 Authentication & Security

### JWT Configuration
| Variable | Description | Required | Security Level | Format | Example |
|----------|-------------|----------|----------------|---------|---------|
| `JWT_SECRET` | JWT signing secret | Yes | **CRITICAL** | Min 32 chars | `your_64_character_secure_random_string_here_for_jwt_signing` |
| `JWT_EXPIRES_IN` | Access token expiration | No | Medium | Time string | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiration | No | Medium | Time string | `7d` |

**Security Requirements:**
- ✅ **Minimum 32 characters** (64+ recommended for production)
- ✅ **High entropy** - use cryptographically secure random generation
- ❌ **No dictionary words** or predictable patterns
- 🔄 **Rotate quarterly** or if compromised

**Generation Example:**
```bash
# Generate secure JWT secret
openssl rand -hex 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Session Management
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `ENABLE_SESSION_ROTATION` | Enable refresh token rotation | No | `true` | `true` |
| `MAX_CONCURRENT_SESSIONS` | Max sessions per user | No | `5` | `3` |
| `SESSION_TIMEOUT` | Session inactivity timeout | No | `24h` | `12h` |

---

## 📦 Cache & Storage

### Redis Configuration
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `REDIS_URL` | Redis connection URL | Yes | Medium | `redis://localhost:6379` |
| `REDIS_PASSWORD` | Redis authentication password | Yes | **HIGH** | `your_secure_redis_password` |
| `REDIS_DB` | Redis database number | No | `0` |
| `REDIS_MAX_RETRIES` | Connection retry attempts | No | `3` |
| `REDIS_RETRY_DELAY` | Retry delay in ms | No | `1000` |

**Production Redis Setup:**
```bash
# AWS ElastiCache
REDIS_URL=redis://cluster.cache.amazonaws.com:6379
REDIS_PASSWORD=your_elasticache_password

# Google Cloud Memorystore
REDIS_URL=redis://10.0.0.1:6379
REDIS_PASSWORD=your_memorystore_password

# Azure Cache for Redis
REDIS_URL=redis://your-cache.redis.cache.windows.net:6380
REDIS_PASSWORD=your_azure_redis_key
```

---

## 💳 Payment Integration

### Tap Payments (Jordan)
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `TAP_SECRET_KEY` | Tap secret API key | Yes | **CRITICAL** | `sk_test_your_secret_key_here` |
| `TAP_PUBLIC_KEY` | Tap publishable key | Yes | Low | `pk_test_your_public_key_here` |
| `TAP_API_URL` | Tap API base URL | No | Low | `https://api.tap.company/v2` |
| `TAP_WEBHOOK_SECRET` | Webhook verification secret | Yes | **HIGH** | `your_webhook_secret` |

**Security Notes:**
- 🔒 Never expose secret keys in client-side code
- 🔄 Use test keys for development, live keys for production
- 📝 Validate all webhook signatures

---

## 📱 SMS & Communications

### Twilio Configuration
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | Yes | Medium | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token | Yes | **HIGH** | `your_auth_token_here` |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Yes | Low | `+962700000000` |
| `TWILIO_VERIFY_SERVICE_SID` | Verify service SID | No | Medium | `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

### Push Notifications
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `EXPO_PUSH_TOKEN` | Expo push notification token | No | Medium | `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON | No | **HIGH** | `/path/to/service-account.json` |

---

## 📊 Monitoring & Observability

### New Relic
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `NEW_RELIC_LICENSE_KEY` | New Relic license key | No | **HIGH** | `eu01xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `NEW_RELIC_APP_NAME` | Application name in New Relic | No | Low | `BeautyCort-API-Production` |
| `ENABLE_NEWRELIC` | Enable New Relic monitoring | No | Low | `true` |

### Error Tracking
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `SENTRY_DSN` | Sentry error tracking DSN | No | Medium | `https://xxx@xxx.ingest.sentry.io/xxx` |
| `SENTRY_ENVIRONMENT` | Sentry environment name | No | Low | `production` |
| `SENTRY_RELEASE` | Application release version | No | Low | `beautycort@1.0.0` |

### Performance Monitoring
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `ENABLE_PROMETHEUS` | Enable Prometheus metrics | No | `false` | `true` |
| `PROMETHEUS_PORT` | Prometheus metrics port | No | `9090` | `9090` |
| `ENABLE_PERFORMANCE_MONITORING` | Enable APM | No | `true` | `true` |

---

## 🚨 Alerting & Notifications

### Slack Integration
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `SLACK_WEBHOOK_URL` | Slack webhook for alerts | No | **HIGH** | `https://hooks.slack.com/services/xxx/xxx/xxx` |
| `SLACK_CHANNEL_CRITICAL` | Critical alerts channel | No | Low | `#alerts-critical` |
| `SLACK_CHANNEL_WARNINGS` | Warning alerts channel | No | Low | `#alerts-warnings` |

### Email Alerts
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `SENDGRID_API_KEY` | SendGrid API key | No | **HIGH** | `SG.xxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `ALERT_FROM_EMAIL` | From email for alerts | No | Low | `alerts@beautycort.com` |
| `CRITICAL_ALERT_EMAILS` | Critical alert recipients | No | Medium | `admin@beautycort.com,devops@beautycort.com` |

### PagerDuty
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `PAGERDUTY_SERVICE_KEY` | PagerDuty integration key | No | **HIGH** | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `ENABLE_PAGERDUTY` | Enable PagerDuty alerts | No | Low | `true` |

---

## 🛡️ Security Configuration

### Rate Limiting
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `ENABLE_RATE_LIMITING` | Enable rate limiting | No | `true` | `true` |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | No | `900000` | `900000` |
| `RATE_LIMIT_MAX` | Max requests per window | No | `100` | `100` |
| `SKIP_RATE_LIMIT` | Skip rate limiting | No | `false` | `false` |

### CORS Configuration
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `CORS_ORIGIN` | Allowed CORS origins | No | `*` | `https://beautycort.com,https://app.beautycort.com` |
| `CORS_CREDENTIALS` | Allow credentials in CORS | No | `true` | `true` |

### Security Headers
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `ENABLE_HELMET` | Enable security headers | No | `true` | `true` |
| `HSTS_MAX_AGE` | HSTS max age in seconds | No | `31536000` | `31536000` |

---

## 💾 Backup Configuration

### Database Backups
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `BACKUP_PROVIDER` | Backup storage provider | No | Low | `aws` |
| `BACKUP_RETENTION_DAYS` | Backup retention period | No | Low | `30` |
| `BACKUP_COMPRESSION` | Enable backup compression | No | Low | `true` |
| `BACKUP_ENCRYPTION` | Enable backup encryption | No | Low | `true` |
| `BACKUP_ENCRYPTION_KEY` | Backup encryption key | No | **CRITICAL** | `hex_encoded_32_byte_key` |

### AWS S3 Backup
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | No | **HIGH** | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | No | **CRITICAL** | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS region | No | Low | `us-east-1` |
| `AWS_BACKUP_BUCKET` | S3 bucket for backups | No | Low | `beautycort-backups` |

---

## 🔍 Logging Configuration

### Log Levels
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `LOG_LEVEL` | Application log level | No | `info` | `info` |
| `ENABLE_MORGAN_LOGGING` | Enable HTTP logging | No | `true` | `true` |
| `ENABLE_DETAILED_LOGGING` | Enable detailed logs | No | `false` | `true` |

### External Logging Services
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `ENABLE_ELASTICSEARCH` | Enable ELK stack logging | No | Low | `true` |
| `ELASTICSEARCH_HOST` | Elasticsearch host | No | Medium | `localhost` |
| `ELASTICSEARCH_PORT` | Elasticsearch port | No | Low | `9200` |
| `ENABLE_CLOUDWATCH` | Enable CloudWatch logs | No | Low | `true` |

---

## 🌐 CDN & Static Assets

### Content Delivery Network
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `CDN_URL` | CDN base URL | No | None | `https://cdn.beautycort.com` |
| `STATIC_ASSETS_URL` | Static assets URL | No | None | `https://assets.beautycort.com` |
| `ENABLE_CDN` | Enable CDN for assets | No | `false` | `true` |

---

## 🏥 Health Check Configuration

### Health Monitoring
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `HEALTH_CHECK_URL` | Base URL for health checks | No | `http://localhost:3000` | `https://api.beautycort.com` |
| `HEALTH_CHECK_TIMEOUT` | Health check timeout (ms) | No | `10000` | `5000` |
| `ENABLE_DETAILED_HEALTH` | Enable detailed health info | No | `false` | `true` |

### Uptime Monitoring
| Variable | Description | Required | Security Level | Example |
|----------|-------------|----------|----------------|---------|
| `PINGDOM_API_KEY` | Pingdom API key | No | **HIGH** | `your_pingdom_api_key` |
| `ENABLE_PINGDOM` | Enable Pingdom monitoring | No | Low | `true` |
| `STATUSCAKE_API_KEY` | StatusCake API key | No | **HIGH** | `your_statuscake_api_key` |

---

## ⚙️ Feature Flags

### Application Features
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `ENABLE_SWAGGER` | Enable API documentation | No | `false` | `true` |
| `ENABLE_WEBSOCKETS` | Enable WebSocket support | No | `false` | `true` |
| `ENABLE_CACHING` | Enable response caching | No | `true` | `true` |
| `ENABLE_COMPRESSION` | Enable response compression | No | `true` | `true` |

### Development Features
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `ENABLE_DEBUG` | Enable debug mode | No | `false` | `false` |
| `ENABLE_MOCK_PAYMENTS` | Use mock payment provider | No | `false` | `true` |
| `ENABLE_MOCK_SMS` | Use mock SMS provider | No | `false` | `true` |

---

## 🚀 Deployment Configuration

### Platform Settings
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DEPLOYMENT_PLATFORM` | Deployment platform | No | `local` | `aws` |
| `CLUSTER_NAME` | Kubernetes cluster name | No | `default` | `beautycort-prod` |
| `NAMESPACE` | Kubernetes namespace | No | `default` | `production` |

### Auto-scaling
| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `MIN_REPLICAS` | Minimum pod replicas | No | `2` | `3` |
| `MAX_REPLICAS` | Maximum pod replicas | No | `10` | `20` |
| `TARGET_CPU_UTILIZATION` | CPU target for scaling | No | `70` | `60` |

---

## 🔒 Security Best Practices

### Secret Management
1. **Never commit secrets to version control**
2. **Use a secrets management service** (AWS Secrets Manager, HashiCorp Vault)
3. **Rotate secrets regularly** (quarterly or if compromised)
4. **Use different secrets per environment**
5. **Encrypt secrets at rest and in transit**

### Environment File Security
```bash
# Set secure file permissions
chmod 600 .env.production

# Use environment-specific files
.env.local          # Local development
.env.staging        # Staging environment  
.env.production     # Production environment
```

### Secrets Validation
```bash
# Check for weak secrets
npm run validate:secrets

# Generate secure secrets
npm run generate:secrets
```

---

## 📋 Environment Templates

### Local Development (.env.local)
```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_ANON_KEY=your_dev_anon_key
SUPABASE_SERVICE_KEY=your_dev_service_key

# JWT
JWT_SECRET=your_development_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=7d

# Redis (optional for development)
REDIS_URL=redis://localhost:6379

# Feature flags
ENABLE_SWAGGER=true
ENABLE_MOCK_PAYMENTS=true
ENABLE_MOCK_SMS=true
```

### Staging Environment (.env.staging)
```bash
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

# Database
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_ANON_KEY=your_staging_anon_key
SUPABASE_SERVICE_KEY=your_staging_service_key

# JWT
JWT_SECRET=your_staging_jwt_secret_64_characters_minimum_for_staging_env
JWT_EXPIRES_IN=1h

# Redis
REDIS_URL=redis://staging-redis:6379
REDIS_PASSWORD=your_staging_redis_password

# Monitoring
NEW_RELIC_LICENSE_KEY=your_staging_newrelic_key
SENTRY_DSN=your_staging_sentry_dsn

# Payments (test mode)
TAP_SECRET_KEY=sk_test_your_test_secret_key
TAP_PUBLIC_KEY=pk_test_your_test_public_key
```

### Production Environment (.env.production)
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
APP_VERSION=1.0.0

# Database
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_KEY=your_production_service_key

# JWT
JWT_SECRET=your_production_jwt_secret_64_characters_minimum_cryptographically_secure
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://prod-cluster.cache.amazonaws.com:6379
REDIS_PASSWORD=your_production_redis_password

# Monitoring
NEW_RELIC_LICENSE_KEY=your_production_newrelic_key
SENTRY_DSN=your_production_sentry_dsn
ENABLE_PROMETHEUS=true

# Payments (live mode)
TAP_SECRET_KEY=sk_live_your_live_secret_key
TAP_PUBLIC_KEY=pk_live_your_live_public_key

# SMS
TWILIO_ACCOUNT_SID=your_production_twilio_sid
TWILIO_AUTH_TOKEN=your_production_twilio_token
TWILIO_PHONE_NUMBER=+962700000000

# Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
PAGERDUTY_SERVICE_KEY=your_pagerduty_service_key
CRITICAL_ALERT_EMAILS=admin@beautycort.com,cto@beautycort.com

# Backup
BACKUP_PROVIDER=aws
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_BACKUP_BUCKET=beautycort-prod-backups
BACKUP_ENCRYPTION_KEY=your_32_byte_hex_encoded_backup_encryption_key

# Security
ENABLE_RATE_LIMITING=true
CORS_ORIGIN=https://beautycort.com,https://app.beautycort.com
ENABLE_HELMET=true
```

---

## ✅ Validation Checklist

Before deploying to production, ensure:

### Required Variables
- [ ] All **CRITICAL** and **HIGH** security variables are set
- [ ] JWT secret is at least 64 characters with high entropy
- [ ] Database credentials are valid and tested
- [ ] Redis connection is working
- [ ] Payment gateway credentials are in live mode

### Security Validation
- [ ] No secrets committed to version control
- [ ] Secrets stored in secure secrets manager
- [ ] File permissions set correctly (600 for .env files)
- [ ] Different secrets used for each environment
- [ ] Rate limiting enabled and configured

### Monitoring Setup
- [ ] New Relic monitoring configured
- [ ] Error tracking (Sentry) configured
- [ ] Alerting (Slack/PagerDuty) configured
- [ ] Health checks working
- [ ] Backup system tested

### Feature Flags
- [ ] Debug mode disabled in production
- [ ] Mock services disabled in production
- [ ] Swagger disabled in production (unless needed)
- [ ] Appropriate log levels set

---

## 🆘 Troubleshooting

### Common Issues

**JWT Token Issues:**
```bash
# Generate new secure JWT secret
openssl rand -hex 32

# Validate JWT secret strength
node -e "console.log(process.env.JWT_SECRET.length >= 32 ? 'OK' : 'TOO SHORT')"
```

**Database Connection Issues:**
```bash
# Test Supabase connection
curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/"
```

**Redis Connection Issues:**
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping
```

**Missing Environment Variables:**
```bash
# Validate required variables
npm run validate:env
```

---

## 📞 Support

For environment configuration issues:
- **Documentation:** [Internal Wiki](https://wiki.beautycort.com)
- **DevOps Team:** devops@beautycort.com
- **Security Team:** security@beautycort.com
- **Emergency:** +962 77 XXX XXXX

---

*This document should be kept updated with any new environment variables or configuration changes. Last reviewed: 2025-07-16*