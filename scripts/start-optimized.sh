#!/bin/bash

# Script untuk menjalankan aplikasi dengan log optimization
# Usage: ./scripts/start-optimized.sh [environment]

ENVIRONMENT=${1:-development}

echo "🚀 Starting Employee Management System with optimized logging..."
echo "📊 Environment: $ENVIRONMENT"

# Set optimized environment variables
export LOG_LEVEL="info"
export LOG_REQUESTS="false"
export LOG_THROTTLE="true"
export LOG_MAX_SIZE="500"
export ENABLE_CACHE="true"
export CACHE_TTL="300"
export ENABLE_METRICS="true"

if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔧 Production mode: Minimal logging enabled"
    export LOG_LEVEL="error"
    export LOG_REQUESTS="false"
    export NODE_ENV="production"
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "🔧 Staging mode: Warning level logging enabled"
    export LOG_LEVEL="warn"
    export LOG_REQUESTS="false"
else
    echo "🔧 Development mode: Info level logging enabled"
    export LOG_LEVEL="info"
    export LOG_REQUESTS="true"
fi

echo "📝 Log configuration:"
echo "  - Level: $LOG_LEVEL"
echo "  - Request logging: $LOG_REQUESTS"
echo "  - Log throttling: $LOG_THROTTLE"
echo "  - Max log size: ${LOG_MAX_SIZE} bytes"
echo ""

# Start the application
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🏗️ Building for production..."
    bun run build
    echo "▶️ Starting production server..."
    bun run start
else
    echo "▶️ Starting development server..."
    bun run dev
fi 