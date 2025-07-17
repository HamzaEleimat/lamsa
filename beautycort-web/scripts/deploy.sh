#!/bin/bash

# BeautyCort Web Dashboard Deployment Script
# This script helps deploy the web dashboard to Vercel

set -e

echo "🚀 BeautyCort Web Dashboard Deployment"
echo "======================================"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the beautycort-web directory?"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  Warning: .env.production not found"
    echo "📝 Please create .env.production from .env.production.template"
    echo "   cp .env.production.template .env.production"
    echo "   # Then edit .env.production with your actual values"
    read -p "Continue without .env.production? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Type check
echo "🔍 Running type check..."
npm run type-check

# Build the project
echo "🏗️  Building project..."
npm run build

# Test the build
echo "🧪 Testing build..."
npm run start &
SERVER_PID=$!
sleep 5
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Build test passed"
    kill $SERVER_PID
else
    echo "❌ Build test failed"
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo ""
echo "Choose deployment type:"
echo "1. Preview deployment (default)"
echo "2. Production deployment"
echo ""
read -p "Enter choice (1-2): " -n 1 -r
echo ""

case $REPLY in
    2)
        echo "🌟 Deploying to production..."
        vercel --prod
        ;;
    *)
        echo "🔍 Deploying preview..."
        vercel
        ;;
esac

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Test the deployed application"
echo "2. Configure custom domain (if needed)"
echo "3. Set up monitoring and alerts"
echo "4. Update mobile app with new dashboard URL"
echo ""
echo "🔗 Useful commands:"
echo "   vercel --prod     # Deploy to production"
echo "   vercel logs       # View deployment logs"
echo "   vercel domains    # Manage domains"
echo "   vercel env        # Manage environment variables"