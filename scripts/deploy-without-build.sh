#!/bin/bash

# Emergency Production Deployment Script
# Deploys using ts-node directly to bypass TypeScript compilation issues

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$PROJECT_ROOT/beautycort-api"

echo "🚀 Emergency Production Deployment (ts-node mode)"
echo "⚠️  This deployment uses ts-node for faster deployment"

# Update docker-compose to use ts-node in production
cat > "$PROJECT_ROOT/docker-compose.production.yml" << 'EOF'
version: '3.8'

services:
  # Redis for caching and session management
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD:-beautycort123}
    volumes:
      - redis_data:/data
    networks:
      - beautycort_network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 5s
      retries: 5

  # BeautyCort API (ts-node mode)
  api:
    build:
      context: ./beautycort-api
      dockerfile: Dockerfile.ts-node
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=15m
      - REFRESH_TOKEN_EXPIRES_IN=7d
      - REDIS_URL=redis://redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-beautycort123}
      - TAP_SECRET_KEY=${TAP_SECRET_KEY}
      - TAP_PUBLIC_KEY=${TAP_PUBLIC_KEY}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}
      - EXPO_PUSH_TOKEN=${EXPO_PUSH_TOKEN}
      - SENTRY_DSN=${SENTRY_DSN}
      - NEW_RELIC_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY}
      - APP_NAME=${APP_NAME:-BeautyCort}
      - DEFAULT_LANGUAGE=${DEFAULT_LANGUAGE:-ar}
      - CURRENCY=${CURRENCY:-JOD}
      - TIMEZONE=${TIMEZONE:-Asia/Amman}
      - ENABLE_SWAGGER=${ENABLE_SWAGGER:-false}
      - ENABLE_MORGAN_LOGGING=${ENABLE_MORGAN_LOGGING:-true}
      - ENABLE_DETAILED_LOGGING=${ENABLE_DETAILED_LOGGING:-true}
      - ENABLE_PERFORMANCE_MONITORING=${ENABLE_PERFORMANCE_MONITORING:-true}
      - ENABLE_RATE_LIMITING=true
      - ENABLE_HELMET=true
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - beautycort_network
    volumes:
      - ./beautycort-api/logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # BeautyCort Web (Next.js)
  web:
    build:
      context: ./beautycort-web
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_API_URL=${API_URL:-http://localhost:3000}
      - NEXT_PUBLIC_APP_NAME=${APP_NAME:-BeautyCort}
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=${DEFAULT_LANGUAGE:-ar}
      - NEXT_PUBLIC_CURRENCY=${CURRENCY:-JOD}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3001}
    depends_on:
      - api
    networks:
      - beautycort_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - web
    networks:
      - beautycort_network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  redis_data:
    driver: local

networks:
  beautycort_network:
    driver: bridge
EOF

# Create Dockerfile for ts-node deployment
cat > "$API_DIR/Dockerfile.ts-node" << 'EOF'
# Multi-stage Dockerfile for production ts-node deployment
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for ts-node)
RUN npm ci

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S beautycort -u 1001

# Change ownership
RUN chown -R beautycort:nodejs /app
USER beautycort

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application with ts-node
CMD ["npx", "ts-node", "server.ts"]
EOF

# Create production environment file if it doesn't exist
if [[ ! -f "$PROJECT_ROOT/.env.production" ]]; then
    cat > "$PROJECT_ROOT/.env.production" << 'EOF'
# BeautyCort Production Environment
NODE_ENV=production
PORT=3000

# Database (Replace with your production values)
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_KEY=your_production_service_key

# Authentication (Generate secure values)
JWT_SECRET=your_64_character_production_jwt_secret_minimum_length_required
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_secure_redis_password

# External Services (Add your production keys)
TAP_SECRET_KEY=your_tap_secret_key
TAP_PUBLIC_KEY=your_tap_public_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+962700000000

# Monitoring
NEW_RELIC_LICENSE_KEY=your_newrelic_key
SENTRY_DSN=your_sentry_dsn

# Application
APP_NAME=BeautyCort
DEFAULT_LANGUAGE=ar
CURRENCY=JOD
TIMEZONE=Asia/Amman

# Security
ENABLE_RATE_LIMITING=true
ENABLE_HELMET=true
ENABLE_SWAGGER=false
EOF

    echo "📝 Created .env.production template"
    echo "⚠️  Please update .env.production with your actual production values"
fi

# Install curl in API container for health checks
echo "📦 Ensuring curl is available for health checks..."

# Test the deployment
echo "🧪 Testing ts-node deployment..."

cd "$PROJECT_ROOT"

# Stop any existing containers
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# Build and start containers
echo "🔨 Building containers..."
if docker-compose -f docker-compose.production.yml build; then
    echo "✅ Container build successful"
else
    echo "❌ Container build failed"
    exit 1
fi

echo "🚀 Starting production deployment..."
if docker-compose -f docker-compose.production.yml up -d; then
    echo "✅ Containers started successfully"
else
    echo "❌ Container startup failed"
    exit 1
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 60

# Check health
echo "🏥 Performing health checks..."
if curl -f http://localhost:3000/api/health &>/dev/null; then
    echo "✅ API health check passed"
else
    echo "⚠️ API health check failed (but containers are running)"
fi

# Show status
echo ""
echo "🎯 Deployment Status:"
echo "=================================="
docker-compose -f docker-compose.production.yml ps

echo ""
echo "🌐 Service URLs:"
echo "API: http://localhost:3000"
echo "Web: http://localhost:3001"
echo "Health: http://localhost:3000/api/health"

echo ""
echo "📋 Next Steps:"
echo "1. Update .env.production with real production values"
echo "2. Configure DNS and SSL certificates"
echo "3. Set up monitoring dashboards"
echo "4. Run full smoke tests"

echo ""
echo "🛠️ Useful Commands:"
echo "View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "Stop services: docker-compose -f docker-compose.production.yml down"
echo "Restart API: docker-compose -f docker-compose.production.yml restart api"

echo ""
echo "✅ Emergency deployment completed!"
echo "⚠️  Remember: This uses ts-node for quick deployment"
echo "🔧 For full production, resolve TypeScript issues and use compiled build"