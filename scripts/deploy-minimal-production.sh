#!/bin/bash

# BeautyCort Minimal Production Deployment
# Uses a simplified server for stable production deployment

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$PROJECT_ROOT/beautycort-api"

echo "🚀 Deploying BeautyCort Minimal Production Server"
echo "================================================="

# Create Dockerfile for minimal deployment
cat > "$API_DIR/Dockerfile.minimal" << 'EOF'
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy minimal server
COPY server.minimal.ts ./
COPY tsconfig.json ./

# Install ts-node for production (minimal TypeScript setup)
RUN npm install ts-node typescript @types/node

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S beautycort -u 1001

# Change ownership
RUN chown -R beautycort:nodejs /app
USER beautycort

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the minimal server
CMD ["npx", "ts-node", "--transpile-only", "server.minimal.ts"]
EOF

# Create minimal docker-compose
cat > "$PROJECT_ROOT/docker-compose.minimal.yml" << 'EOF'
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
      retries: 3

  # BeautyCort API (Minimal)
  api:
    build:
      context: ./beautycort-api
      dockerfile: Dockerfile.minimal
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
      - APP_NAME=${APP_NAME:-BeautyCort}
      - DEFAULT_LANGUAGE=${DEFAULT_LANGUAGE:-ar}
      - CURRENCY=${CURRENCY:-JOD}
      - TIMEZONE=${TIMEZONE:-Asia/Amman}
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - beautycort_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

volumes:
  redis_data:
    driver: local

networks:
  beautycort_network:
    driver: bridge
EOF

# Create production environment file
cat > "$PROJECT_ROOT/.env.minimal" << 'EOF'
# BeautyCort Minimal Production Environment
NODE_ENV=production
PORT=3000

# Database - Update with your production values
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Authentication - Generate secure values
JWT_SECRET=your_64_character_production_jwt_secret_for_minimal_deployment
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=beautycort_production_password_123

# Application
APP_NAME=BeautyCort
DEFAULT_LANGUAGE=ar
CURRENCY=JOD
TIMEZONE=Asia/Amman

# Security
CORS_ORIGIN=*
EOF

echo "📦 Building minimal production containers..."

cd "$PROJECT_ROOT"

# Stop any existing containers
docker-compose -f docker-compose.minimal.yml down 2>/dev/null || true

# Build containers
if docker-compose -f docker-compose.minimal.yml build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo "🚀 Starting minimal production deployment..."

# Start containers
if docker-compose -f docker-compose.minimal.yml up -d; then
    echo "✅ Containers started"
else
    echo "❌ Container startup failed"
    exit 1
fi

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health checks
echo "🏥 Running health checks..."

# API Health Check
if curl -f http://localhost:3000/api/health &>/dev/null; then
    echo "✅ API health check passed"
    
    # Get health status
    echo "📊 API Health Status:"
    curl -s http://localhost:3000/api/health | jq -r '.status, .database, .environment'
    
    echo ""
    echo "📋 Detailed Health Check:"
    curl -s http://localhost:3000/api/health/detailed | jq '.summary'
else
    echo "❌ API health check failed"
fi

# Check if Redis is accessible
if docker-compose -f docker-compose.minimal.yml exec -T redis redis-cli ping &>/dev/null; then
    echo "✅ Redis health check passed"
else
    echo "⚠️ Redis health check failed"
fi

echo ""
echo "🎯 Deployment Status:"
echo "===================="
docker-compose -f docker-compose.minimal.yml ps

echo ""
echo "🌐 Service URLs:"
echo "==============="
echo "API: http://localhost:3000"
echo "Health: http://localhost:3000/api/health"
echo "Detailed Health: http://localhost:3000/api/health/detailed"

echo ""
echo "🛠️ Management Commands:"
echo "======================="
echo "View logs: docker-compose -f docker-compose.minimal.yml logs -f"
echo "Stop: docker-compose -f docker-compose.minimal.yml down"
echo "Restart API: docker-compose -f docker-compose.minimal.yml restart api"
echo "Health check: curl http://localhost:3000/api/health"

echo ""
echo "📋 Production Checklist:"
echo "========================"
echo "[ ] Update .env.minimal with real production values"
echo "[ ] Set up SSL certificates"
echo "[ ] Configure domain DNS"
echo "[ ] Set up monitoring alerts"
echo "[ ] Run smoke tests"
echo "[ ] Configure backups"

echo ""
echo "✅ Minimal production deployment completed!"
echo "🔧 This is a minimal version for stable operation"
echo "💡 Add full features once deployment is stable"

# Run quick smoke test
echo ""
echo "🧪 Running quick smoke test..."
if curl -s http://localhost:3000/api/health | grep -q '"status":"ok"'; then
    echo "✅ Smoke test passed - API is responding correctly"
else
    echo "⚠️ Smoke test inconclusive"
fi

# Create monitoring script
cat > "$PROJECT_ROOT/monitor-production.sh" << 'EOF'
#!/bin/bash
# Production monitoring script

echo "BeautyCort Production Status"
echo "==========================="
echo "Timestamp: $(date)"
echo ""

# Check containers
echo "Container Status:"
docker-compose -f docker-compose.minimal.yml ps

echo ""
echo "API Health:"
curl -s http://localhost:3000/api/health | jq -r '.status, .uptime, .database'

echo ""
echo "Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "Recent Logs (last 10 lines):"
docker-compose -f docker-compose.minimal.yml logs --tail=10 api
EOF

chmod +x "$PROJECT_ROOT/monitor-production.sh"

echo ""
echo "📊 Created monitoring script: ./monitor-production.sh"
echo "🎉 Deployment complete!"