# Lamsa Deployment Guide

Complete deployment infrastructure and documentation for the Lamsa beauty booking platform targeting the Jordan market.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/lamsa.git
cd lamsa

# Run deployment script
./deployment/scripts/deploy.sh --environment production --platform aws

# Or use docker-compose for local development
docker-compose up -d
```

## 📋 Prerequisites

### Development Environment
- **Node.js**: v20+
- **Docker**: v24+
- **Git**: v2.30+

### Production Environment
- **Cloud Provider**: AWS/GCP/Azure account
- **Domain**: Registered domain for production
- **SSL Certificate**: Valid SSL certificate
- **Database**: Supabase Pro account
- **SMS Service**: Twilio account with Jordan support
- **Payment Gateway**: Tap Payment Gateway merchant account

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Lamsa Platform                     │
├─────────────────────────────────────────────────────────────┤
│  Mobile App (React Native + Expo)                         │
│  ├─ iOS App Store                                          │
│  └─ Google Play Store                                      │
├─────────────────────────────────────────────────────────────┤
│  Web Dashboard (Next.js)                                   │
│  ├─ Provider Interface                                     │
│  └─ Admin Dashboard                                        │
├─────────────────────────────────────────────────────────────┤
│  API Backend (Node.js + Express + TypeScript)             │
│  ├─ Authentication (JWT + Phone/OTP)                       │
│  ├─ Payment Processing (Tap Gateway)                       │
│  ├─ SMS Service (Twilio)                                   │
│  └─ Real-time Features (WebSockets)                        │
├─────────────────────────────────────────────────────────────┤
│  Database (Supabase - PostgreSQL + PostGIS)               │
│  ├─ Row Level Security (RLS)                               │
│  ├─ Geolocation Support                                    │
│  └─ Multi-language Content                                 │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure                                            │
│  ├─ Load Balancer (Nginx)                                  │
│  ├─ Caching (Redis)                                        │
│  ├─ Container Orchestration (Docker + Kubernetes)          │
│  └─ Monitoring (APM + Logging)                             │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
lamsa/
├── lamsa-api/           # Node.js API backend
├── lamsa-mobile/        # React Native mobile app
├── lamsa-web/           # Next.js web dashboard
├── deployment/               # Deployment configurations
│   ├── aws/                 # AWS CloudFormation templates
│   ├── gcp/                 # Google Cloud Terraform
│   ├── azure/               # Azure Resource Manager
│   ├── scripts/             # Deployment scripts
│   └── guides/              # Setup documentation
├── shared/                   # Shared configurations
├── docker-compose.yml        # Production docker-compose
├── docker-compose.dev.yml    # Development docker-compose
└── .github/workflows/        # CI/CD pipelines
```

## 🛠️ Deployment Options

### 1. Local Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Access services
# API: http://localhost:3000
# Web: http://localhost:3001
# Redis: localhost:6379
```

### 2. Cloud Deployment

#### AWS (Recommended)
```bash
cd deployment/aws
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name lamsa-production \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_IAM
```

#### Google Cloud Platform
```bash
cd deployment/gcp
terraform init
terraform plan -var="environment=production"
terraform apply -var="environment=production"
```

#### Microsoft Azure
```bash
cd deployment/azure
terraform init
terraform plan -var="environment=production"
terraform apply -var="environment=production"
```

### 3. Manual Deployment

```bash
# Build and deploy step by step
./deployment/scripts/deploy.sh \
  --environment production \
  --platform aws \
  --component all
```

## 📱 Mobile App Deployment

### iOS App Store
```bash
cd lamsa-mobile

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

### Google Play Store
```bash
cd lamsa-mobile

# Build for production
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production
```

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Authentication
JWT_SECRET=your_64_character_secret

# SMS Service
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+962xxxxxxxxx

# Payment Gateway
TAP_SECRET_KEY=your_tap_secret_key
TAP_PUBLIC_KEY=your_tap_public_key

# Application Settings
APP_NAME=Lamsa
DEFAULT_LANGUAGE=ar
CURRENCY=JOD
TIMEZONE=Asia/Amman
```

### Environment Files

- `.env.local` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

## 🔐 Security Configuration

### SSL/TLS Setup
```bash
# Generate SSL certificate
certbot certonly --webroot \
  -w /var/www/html \
  -d api.lamsa.com \
  -d dashboard.lamsa.com
```

### Database Security
- Enable Row Level Security (RLS)
- Configure proper user permissions
- Set up backup encryption
- Enable audit logging

### API Security
- Rate limiting configuration
- CORS policy setup
- Security headers (Helmet.js)
- Input validation and sanitization

## 📊 Monitoring and Logging

### APM Setup
```bash
# New Relic (recommended)
npm install newrelic
export NEW_RELIC_LICENSE_KEY=your_license_key

# DataDog alternative
npm install dd-trace
export DD_API_KEY=your_datadog_key
```

### Log Aggregation
```bash
# Configure log shipping
export LOG_LEVEL=info
export LOG_FORMAT=json
export LOG_DESTINATION=datadog
```

## 🧪 Testing

### Unit Tests
```bash
# API tests
cd lamsa-api
npm run test

# Mobile tests
cd lamsa-mobile
npm run test

# Web tests
cd lamsa-web
npm run test
```

### Integration Tests
```bash
# Full integration test suite
npm run test:integration
```

### Load Testing
```bash
# API load testing
cd lamsa-api
npm run test:load

# Performance testing
npm run test:performance
```

## 📈 Performance Optimization

### Database Optimization
- Proper indexing strategy
- Query optimization
- Connection pooling
- Read replicas for scaling

### API Optimization
- Redis caching
- Response compression
- CDN integration
- Database connection pooling

### Mobile App Optimization
- Image optimization
- Bundle size reduction
- Lazy loading
- Offline capabilities

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database connectivity
   psql -h your-host -U postgres -d lamsa
   
   # Verify environment variables
   echo $SUPABASE_URL
   ```

2. **SMS Delivery Issues**
   ```bash
   # Test Twilio configuration
   curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json \
     -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
     -d "From=+962xxxxxxxxx" \
     -d "To=+962xxxxxxxxx" \
     -d "Body=Test message"
   ```

3. **Payment Processing Issues**
   ```bash
   # Test Tap Payment Gateway
   curl -X POST https://api.tap.company/v2/charges \
     -H "Authorization: Bearer $TAP_SECRET_KEY" \
     -H "Content-Type: application/json" \
     -d '{"amount": 1.000, "currency": "JOD"}'
   ```

### Health Checks

```bash
# API health check
curl http://localhost:3000/api/health

# Database health check
curl http://localhost:3000/api/health/database

# Redis health check
curl http://localhost:3000/api/health/redis
```

## 📚 Documentation

### API Documentation
- **Swagger UI**: http://localhost:3000/api-docs
- **Postman Collection**: `/postman/Lamsa.postman_collection.json`

### Setup Guides
- [Supabase Production Setup](./guides/supabase-production-setup.md)
- [Twilio Jordan SMS Setup](./guides/twilio-jordan-setup.md)
- [Tap Payment Gateway Setup](./guides/tap-payment-jordan-setup.md)

## 🤝 Support

### Development Team
- **Backend**: Node.js + Express + TypeScript
- **Mobile**: React Native + Expo
- **Web**: Next.js + React + TypeScript
- **Database**: PostgreSQL + PostGIS
- **DevOps**: Docker + Kubernetes + CI/CD

### Contact Information
- **Project Lead**: [Your Name] - [email@example.com]
- **DevOps**: [DevOps Lead] - [devops@example.com]
- **Support**: [Support Team] - [support@lamsa.com]

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔄 Changelog

### Version 1.0.0 (Production Ready)
- ✅ Complete API backend with authentication
- ✅ Mobile app with iOS and Android support
- ✅ Web dashboard for providers
- ✅ Payment processing with Tap Gateway
- ✅ SMS notifications with Twilio
- ✅ Multi-language support (Arabic/English)
- ✅ Geolocation services
- ✅ Real-time features
- ✅ Comprehensive testing suite
- ✅ Production deployment configurations
- ✅ Monitoring and logging setup
- ✅ Security hardening

### Upcoming Features
- 🔄 Push notifications
- 🔄 Advanced analytics
- 🔄 Multi-tenant support
- 🔄 AI-powered recommendations
- 🔄 Social media integration

---

**Ready for August 20, 2025 Launch! 🚀**