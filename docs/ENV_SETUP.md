# Environment Configuration Guide

This guide explains how to set up and manage environment variables for the Lamsa platform across all components and deployment scenarios.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Environment Structure](#environment-structure)
- [Component Configuration](#component-configuration)
- [Environment Types](#environment-types)
- [Security Best Practices](#security-best-practices)
- [Validation & Testing](#validation--testing)
- [Troubleshooting](#troubleshooting)

## Overview

Lamsa uses environment variables to manage configuration across three main components:
- **API** (lamsa-api): Backend REST API
- **Mobile** (lamsa-mobile): React Native mobile app
- **Web** (lamsa-web): Next.js admin dashboard

Each component has its own environment requirements and naming conventions.

## Quick Start

### 1. Interactive Setup (Recommended)

```bash
# Set up all components interactively
node scripts/setup-env.js

# Quick development setup
node scripts/setup-env.js dev

# Production setup
node scripts/setup-env.js prod

# Docker setup
node scripts/setup-env.js docker
```

### 2. Manual Setup

```bash
# Copy templates for each component
cp lamsa-api/.env.example lamsa-api/.env
cp lamsa-mobile/.env.example lamsa-mobile/.env
cp lamsa-web/.env.example lamsa-web/.env.local

# Edit each file with your values
```

### 3. Validate Configuration

```bash
# Validate all components
node scripts/validate-env.js

# Validate specific component
node scripts/validate-env.js api

# Validate for production
node scripts/validate-env.js api production
```

### 4. Generate Secure Secrets

```bash
# Generate cryptographically secure secrets
node scripts/validate-env.js generate-secrets
```

## Environment Structure

### File Naming Conventions

| Component | Development | Production | Docker |
|-----------|------------|------------|---------|
| API | `.env` | `.env.production` | `.env.docker` |
| Mobile | `.env` | `.env.production` | N/A |
| Web | `.env.local` | `.env.production.local` | `.env.docker` |

### Template Files

Each component has template files to guide configuration:

```
lamsa-api/
├── .env.example              # Development template
└── .env.production.template  # Production template

lamsa-mobile/
├── .env.example
└── .env.production.template

lamsa-web/
├── .env.example
└── .env.production.template
```

### Variable Naming Conventions

- **API**: Standard variable names (e.g., `JWT_SECRET`)
- **Mobile**: Must prefix with `EXPO_PUBLIC_` for client-side variables
- **Web**: Must prefix with `NEXT_PUBLIC_` for client-side variables

## Component Configuration

### API (lamsa-api)

Core requirements:
```env
# Authentication
JWT_SECRET=minimum_64_character_secret_for_production
JWT_EXPIRES_IN=15m

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Redis (required for production)
REDIS_PASSWORD=secure_password_here
```

[View full API configuration →](../lamsa-api/.env.example)

### Mobile (lamsa-mobile)

Core requirements:
```env
# All variables must have EXPO_PUBLIC_ prefix
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_API_URL=https://api.lamsa.com
```

For local development with physical device:
```env
# Use your machine's IP address
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

[View full Mobile configuration →](../lamsa-mobile/.env.example)

### Web (lamsa-web)

Core requirements:
```env
# Public variables (client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Server-side only (no prefix)
SUPABASE_SERVICE_KEY=your_service_key
NEXTAUTH_SECRET=minimum_32_character_secret
```

[View full Web configuration →](../lamsa-web/.env.example)

## Environment Types

### Development

Default settings for local development:
- Debug logging enabled
- Mock services available
- Localhost URLs
- Relaxed security

```env
NODE_ENV=development
ENABLE_DEBUG=true
ENABLE_MOCK_PAYMENTS=true
ENABLE_MOCK_SMS=true
```

### Staging

Pre-production testing environment:
- Production-like configuration
- Real services
- Test payment keys
- Enhanced logging

```env
NODE_ENV=staging
ENABLE_DEBUG=false
ENABLE_MOCK_PAYMENTS=false
LOG_LEVEL=info
```

### Production

Live environment settings:
- Maximum security
- Error monitoring
- Performance optimization
- Minimal logging

```env
NODE_ENV=production
ENABLE_DEBUG=false
LOG_LEVEL=warn
COOKIE_SECURE=true
```

## Security Best Practices

### 1. Secret Generation

Always use cryptographically secure methods:

```bash
# Generate secure JWT secret (64 bytes)
openssl rand -hex 64

# Generate secure password (32 bytes)
openssl rand -hex 32

# Generate encryption key
openssl rand -hex 32
```

### 2. Secret Storage

- **Never commit** `.env` files to version control
- Use **environment variable services** in production:
  - AWS Secrets Manager
  - Vercel Environment Variables
  - Docker Secrets
  - Kubernetes Secrets

### 3. File Permissions

Set restrictive permissions on `.env` files:

```bash
chmod 600 .env
```

### 4. Production Requirements

- JWT_SECRET must be ≥64 characters
- All passwords must be ≥16 characters
- No default or weak values
- HTTPS URLs only
- Debug features disabled

### 5. Variable Validation

The following are validated automatically:
- Secret strength
- URL formats
- Production safety
- Required variables

## Validation & Testing

### Automated Validation

```bash
# Full validation
node scripts/validate-env.js

# Component-specific
node scripts/validate-env.js api production

# Check specific issues
node scripts/validate-env.js | grep "JWT_SECRET"
```

### Manual Checks

1. **Security Audit**
   ```bash
   # Check for exposed secrets
   grep -r "password\|secret\|key" . --include="*.env*"
   ```

2. **Production Readiness**
   - All debug flags = false
   - No localhost URLs
   - Production API keys
   - Monitoring configured

3. **Cross-Component Consistency**
   - Matching Supabase projects
   - Consistent API URLs
   - Aligned feature flags

## Troubleshooting

### Common Issues

#### 1. "Environment validation failed"

**Cause**: Missing or invalid required variables

**Solution**:
```bash
# Check what's missing
node scripts/validate-env.js

# Use interactive setup
node scripts/setup-env.js
```

#### 2. "Cannot connect to API" (Mobile)

**Cause**: Using localhost on physical device

**Solution**:
```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Update mobile env
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000
```

#### 3. "JWT_SECRET is too weak"

**Cause**: Secret doesn't meet security requirements

**Solution**:
```bash
# Generate secure secret
openssl rand -hex 64
```

#### 4. "CORS error" (Web)

**Cause**: API CORS not configured for web URL

**Solution**:
```env
# In API .env
CORS_ORIGINS=http://localhost:3001,https://admin.lamsa.com
```

### Environment Variable Loading Order

1. **API**: Loaded by `dotenv` at startup
2. **Mobile**: Embedded at build time (requires rebuild)
3. **Web**: 
   - `NEXT_PUBLIC_*`: Build time
   - Others: Runtime

### Debugging Environment Issues

```bash
# Check current environment
node -e "console.log(process.env)"

# Verify file exists and readable
ls -la .env*

# Check for syntax errors
node -e "require('dotenv').config({ path: '.env' })"
```

## Docker Environment

For containerized deployments:

```bash
# Create Docker environment
cp .env.docker.template .env.docker

# Edit with production values
vim .env.docker

# Run with Docker Compose
docker-compose --env-file .env.docker up
```

### Docker-Specific Variables

```env
# Container resource limits
API_MEMORY_LIMIT=1024m
REDIS_MEMORY_LIMIT=512m

# Health checks
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s

# Networking
REDIS_URL=redis://redis:6379
```

## CI/CD Integration

### GitHub Actions

```yaml
env:
  NODE_ENV: production
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
```

### Vercel

Configure in Project Settings > Environment Variables

### AWS ECS

Use AWS Secrets Manager or Parameter Store

## Migration Guide

### From Development to Production

1. **Generate new secrets**
   ```bash
   node scripts/validate-env.js generate-secrets
   ```

2. **Update service URLs**
   - Replace localhost with production domains
   - Switch to HTTPS
   - Update CORS origins

3. **Configure monitoring**
   - Set up Sentry DSN
   - Configure Slack webhooks
   - Enable CloudWatch

4. **Disable development features**
   ```env
   ENABLE_DEBUG=false
   ENABLE_MOCK_PAYMENTS=false
   ENABLE_SWAGGER=false
   ```

5. **Validate configuration**
   ```bash
   node scripts/validate-env.js all production
   ```

## Best Practices Summary

1. **Use templates** as starting points
2. **Generate secrets** securely
3. **Validate** before deployment
4. **Separate** environments clearly
5. **Document** custom variables
6. **Rotate** secrets regularly
7. **Monitor** for exposed secrets
8. **Backup** configurations securely

## Additional Resources

- [Environment Variables in Node.js](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Docker Environment Files](https://docs.docker.com/compose/environment-variables/)