#!/bin/bash

# Development restart script
echo "🔄 Restarting development server..."

# Kill any existing Next.js processes
pkill -f "next dev" || true
pkill -f "bun dev" || true

# Wait a moment
sleep 2

# Clear Next.js cache
echo "🧹 Clearing Next.js cache..."
rm -rf .next/cache

# Restart with Bun
echo "🚀 Starting development server with Bun..."
bun dev

echo "✅ Development server restarted!"
