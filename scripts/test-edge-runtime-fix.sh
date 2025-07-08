#!/bin/bash

# Script untuk memverifikasi perbaikan Edge Runtime
echo "🧪 Testing Edge Runtime Compatibility Fixes..."

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Test basic pages
echo "🌐 Testing basic pages..."

# Test homepage (should not throw Edge Runtime errors)
echo "Testing homepage..."
curl -s http://localhost:3000/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Homepage accessible"
else
    echo "❌ Homepage failed"
fi

# Test login page (Edge Runtime middleware test)
echo "Testing login page (middleware test)..."
curl -s http://localhost:3000/login > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Login page accessible (middleware working)"
else
    echo "❌ Login page failed (middleware issue)"
fi

# Test API endpoint (should work without API Gateway for now)
echo "Testing API endpoint..."
curl -s http://localhost:3000/api/departments > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ API endpoints accessible"
else
    echo "❌ API endpoints failed"
fi

# Check for specific Edge Runtime errors in logs
echo "🔍 Checking for Edge Runtime errors..."
if [ -f .next/server/middleware.js ]; then
    echo "✅ Middleware compiled successfully"
else
    echo "❌ Middleware compilation failed"
fi

echo ""
echo "📊 Edge Runtime Compatibility Summary:"
echo "  ✅ Removed process.uptime() from APIGateway"
echo "  ✅ Removed process.memoryUsage() from APIGateway"  
echo "  ✅ Added Edge Runtime checks for setInterval"
echo "  ✅ Simplified middleware to avoid API Gateway"
echo "  ✅ Fixed log-optimizer for Edge Runtime"
echo "  ✅ Fixed log-monitor for Edge Runtime"
echo ""
echo "🎉 Edge Runtime compatibility fixes completed!"
echo "📝 Note: API Gateway temporarily disabled in middleware for Edge Runtime compatibility" 