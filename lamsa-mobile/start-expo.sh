#!/bin/bash

# Lamsa Mobile - Expo Go Quick Start Script

echo "🚀 Lamsa Mobile - Expo Go Setup"
echo "================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Get local IP address
echo ""
echo "🌐 Your local IP addresses:"
node scripts/get-ip.js

echo ""
echo "📝 Configuration Check:"
echo "1. ✅ Your IP address is shown above"
echo "2. 📄 Your .env file should have:"
echo "   EXPO_PUBLIC_API_URL=http://YOUR_IP:3000"
echo "3. 🚀 Make sure the API server is running:"
echo "   cd ../lamsa-api && npm run dev"
echo ""
echo "🔧 If you have connection issues, run: npm run troubleshoot"
echo ""
echo "Press Enter to start Expo, or Ctrl+C to cancel..."
read

# Start Expo
echo "🎬 Starting Expo development server..."
npm start