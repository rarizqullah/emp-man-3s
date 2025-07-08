#!/usr/bin/env bun
/**
 * Authentication Performance Monitor
 * Script untuk monitor dan debug authentication performance
 * 
 * Usage: bun src/scripts/monitor-auth-performance.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/server';

interface AuthMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  circuitBreakerActivations: number;
  fallbackUsages: number;
  averageResponseTime: number;
  responseTimes: number[];
}

const metrics: AuthMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  timeouts: 0,
  circuitBreakerActivations: 0,
  fallbackUsages: 0,
  averageResponseTime: 0,
  responseTimes: []
};

// Simulate auth request
async function simulateAuthRequest(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Create mock request
    const mockRequest = new NextRequest('http://localhost:3000/salary', {
      headers: {
        'cookie': process.env.SUPABASE_AUTH_COOKIE || ''
      }
    });
    
    // Create mock response
    const mockResponse = NextResponse.next();
    
    // Create Supabase client
    const supabase = createMiddlewareSupabaseClient(mockRequest, mockResponse);
    
    // Test auth with timeout
    const authResult = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 5000)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: !!authResult,
      responseTime
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      error: (error as Error).message
    };
  }
}

// Update metrics
function updateMetrics(result: { success: boolean; responseTime: number; error?: string }) {
  metrics.totalRequests++;
  metrics.responseTimes.push(result.responseTime);
  
  if (result.success) {
    metrics.successfulRequests++;
  } else {
    metrics.failedRequests++;
    
    if (result.error?.includes('timeout')) {
      metrics.timeouts++;
    }
    if (result.error?.includes('circuit breaker')) {
      metrics.circuitBreakerActivations++;
    }
    if (result.error?.includes('fallback')) {
      metrics.fallbackUsages++;
    }
  }
  
  // Calculate average response time
  metrics.averageResponseTime = metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length;
}

// Print performance report
function printReport() {
  console.clear();
  console.log('🔍 Authentication Performance Monitor');
  console.log('=====================================\n');
  
  console.log('📊 Overall Statistics:');
  console.log(`   Total Requests: ${metrics.totalRequests}`);
  console.log(`   Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
  console.log(`   Failure Rate: ${((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
  console.log(`   Average Response Time: ${Math.round(metrics.averageResponseTime)}ms\n`);
  
  console.log('⚡ Error Breakdown:');
  console.log(`   Timeouts: ${metrics.timeouts} (${((metrics.timeouts / metrics.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`   Circuit Breaker: ${metrics.circuitBreakerActivations} (${((metrics.circuitBreakerActivations / metrics.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`   Fallback Usage: ${metrics.fallbackUsages} (${((metrics.fallbackUsages / metrics.totalRequests) * 100).toFixed(2)}%)\n`);
  
  console.log('📈 Performance Analysis:');
  const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  
  console.log(`   P50 (median): ${Math.round(p50)}ms`);
  console.log(`   P90: ${Math.round(p90)}ms`);
  console.log(`   P95: ${Math.round(p95)}ms`);
  console.log(`   Min: ${Math.round(Math.min(...sortedTimes))}ms`);
  console.log(`   Max: ${Math.round(Math.max(...sortedTimes))}ms\n`);
  
  // Performance recommendations
  console.log('💡 Recommendations:');
  
  const timeoutRate = (metrics.timeouts / metrics.totalRequests) * 100;
  if (timeoutRate > 10) {
    console.log(`   ⚠️  High timeout rate (${timeoutRate.toFixed(2)}%) - consider increasing timeout or optimizing connection`);
  } else if (timeoutRate > 5) {
    console.log(`   ⚠️  Moderate timeout rate (${timeoutRate.toFixed(2)}%) - monitor connection stability`);
  } else {
    console.log(`   ✅ Low timeout rate (${timeoutRate.toFixed(2)}%) - performance is good`);
  }
  
  if (metrics.averageResponseTime > 3000) {
    console.log(`   ⚠️  High average response time (${Math.round(metrics.averageResponseTime)}ms) - investigate performance issues`);
  } else if (metrics.averageResponseTime > 1000) {
    console.log(`   ⚠️  Moderate response time (${Math.round(metrics.averageResponseTime)}ms) - room for improvement`);
  } else {
    console.log(`   ✅ Good response time (${Math.round(metrics.averageResponseTime)}ms)`);
  }
  
  const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  if (successRate < 90) {
    console.log(`   ⚠️  Low success rate (${successRate.toFixed(2)}%) - investigate auth service stability`);
  } else if (successRate < 95) {
    console.log(`   ⚠️  Moderate success rate (${successRate.toFixed(2)}%) - consider implementing more robust fallbacks`);
  } else {
    console.log(`   ✅ High success rate (${successRate.toFixed(2)}%)`);
  }
  
  console.log('\n🔄 Press Ctrl+C to stop monitoring...\n');
}

// Main monitoring loop
async function startMonitoring() {
  console.log('🚀 Starting authentication performance monitoring...\n');
  
  // Initial environment check
  console.log('🔍 Environment Check:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`   Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing'}`);
  console.log(`   Database URL: ${process.env.DATABASE_URL ? 'configured' : 'missing'}`);
  console.log('');
  
  let requestCount = 0;
  
  const interval = setInterval(async () => {
    try {
      requestCount++;
      console.log(`📡 Testing auth request #${requestCount}...`);
      
      const result = await simulateAuthRequest();
      updateMetrics(result);
      
      if (result.success) {
        console.log(`✅ Request #${requestCount} succeeded in ${result.responseTime}ms`);
      } else {
        console.log(`❌ Request #${requestCount} failed: ${result.error} (${result.responseTime}ms)`);
      }
      
      // Print report every 10 requests or on failure
      if (requestCount % 10 === 0 || !result.success) {
        printReport();
      }
      
    } catch (error) {
      console.error(`💥 Error in monitoring loop:`, error);
    }
  }, 2000); // Test every 2 seconds
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping monitor...');
    clearInterval(interval);
    printReport();
    console.log('\n✅ Monitor stopped. Final report printed above.');
    process.exit(0);
  });
}

// Run the monitor
if (require.main === module) {
  startMonitoring().catch(console.error);
}

export { simulateAuthRequest, updateMetrics, printReport };
