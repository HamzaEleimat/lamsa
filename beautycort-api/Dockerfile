# Use official Node.js runtime as base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S beautycort -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build --chown=beautycort:nodejs /app/dist ./dist
COPY --from=build --chown=beautycort:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=beautycort:nodejs /app/package*.json ./
COPY --from=build --chown=beautycort:nodejs /app/database ./database

# Switch to non-root user
USER beautycort

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "run", "start:prod"]