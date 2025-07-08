/**
 * Script untuk testing performa autentikasi
 * Jalankan dengan: bun src/scripts/test-auth-performance.ts
 */

import { ensureDatabaseConnection, getDatabaseStats, safeQuery } from '@/lib/db/connection';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface TestResult {
  scenario: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errors: string[];
}

async function simulateAuthRequest(): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Simulate middleware auth check
    const supabase = await createServerSupabaseClient();
    
    // Test database connection seperti yang dilakukan middleware
    const isHealthy = await ensureDatabaseConnection();
    if (!isHealthy) {
      throw new Error('Database connection failed');
    }
    
    // Simulate auth check dengan timeout
    const authResult = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 30000)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
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

async function runPerformanceTest(
  scenario: string,
  requestCount: number,
  concurrency: number = 1
): Promise<TestResult> {
  console.log(`\n🧪 Running ${scenario} (${requestCount} requests, concurrency: ${concurrency})`);
  
  const results: Awaited<ReturnType<typeof simulateAuthRequest>>[] = [];
  const errors: string[] = [];
  const startTime = Date.now();
  
  // Run requests dengan concurrency control
  const batches = Math.ceil(requestCount / concurrency);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(concurrency, requestCount - (batch * concurrency));
    const batchPromises = Array.from({ length: batchSize }, () => simulateAuthRequest());
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Progress indicator
    const completed = (batch + 1) * concurrency;
    const progress = Math.min(completed, requestCount);
    process.stdout.write(`\r   Progress: ${progress}/${requestCount} (${Math.round((progress / requestCount) * 100)}%)`);
    
    // Small delay between batches untuk avoid overwhelming
    if (batch < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n   ✅ Test completed');
  
  // Calculate statistics
  const successResults = results.filter(r => r.success);
  const failureResults = results.filter(r => !r.success);
  const timeoutResults = results.filter(r => r.error?.includes('timeout'));
  
  const responseTimes = results.map(r => r.responseTime);
  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  
  // Collect unique errors
  failureResults.forEach(result => {
    if (result.error && !errors.includes(result.error)) {
      errors.push(result.error);
    }
  });
  
  return {
    scenario,
    totalRequests: requestCount,
    successCount: successResults.length,
    failureCount: failureResults.length,
    timeoutCount: timeoutResults.length,
    averageResponseTime: Math.round(averageResponseTime),
    minResponseTime,
    maxResponseTime,
    errors
  };
}

async function printSystemStats() {
  console.log('\n📊 System Statistics:');
  
  try {
    const dbStats = await getDatabaseStats();
    console.log('   Database:', dbStats);
    
    const memoryUsage = process.memoryUsage();
    console.log('   Memory:', {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
    });
    
    console.log('   Process:', {
      uptime: `${Math.round(process.uptime())}s`,
      pid: process.pid,
      nodeVersion: process.version
    });
    
  } catch (error) {
    console.error('   ❌ Error getting system stats:', error);
  }
}

function printTestResults(results: TestResult[]) {
  console.log('\n📈 Performance Test Results:');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    const successRate = ((result.successCount / result.totalRequests) * 100).toFixed(2);
    const timeoutRate = ((result.timeoutCount / result.totalRequests) * 100).toFixed(2);
    
    console.log(`\n${result.scenario}:`);
    console.log(`   Total Requests: ${result.totalRequests}`);
    console.log(`   Success Rate: ${successRate}% (${result.successCount}/${result.totalRequests})`);
    console.log(`   Timeout Rate: ${timeoutRate}% (${result.timeoutCount}/${result.totalRequests})`);
    console.log(`   Response Times: avg=${result.averageResponseTime}ms, min=${result.minResponseTime}ms, max=${result.maxResponseTime}ms`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
  });
}

async function main() {
  console.log('🚀 Starting Auth Performance Tests');
  console.log('='.repeat(50));
  
  // Print initial system stats
  await printSystemStats();
  
  const testResults: TestResult[] = [];
  
  try {
    // Test 1: Baseline sequential requests
    testResults.push(await runPerformanceTest('Sequential Requests', 10, 1));
    
    // Test 2: Low concurrency
    testResults.push(await runPerformanceTest('Low Concurrency', 20, 5));
    
    // Test 3: Medium concurrency
    testResults.push(await runPerformanceTest('Medium Concurrency', 30, 10));
    
    // Test 4: High concurrency stress test
    testResults.push(await runPerformanceTest('High Concurrency Stress', 50, 20));
    
    // Print final results
    printTestResults(testResults);
    
    // Print final system stats
    await printSystemStats();
    
    // Summary recommendations
    console.log('\n💡 Recommendations:');
    
    const avgResponseTime = testResults.reduce((sum, r) => sum + r.averageResponseTime, 0) / testResults.length;
    const avgSuccessRate = testResults.reduce((sum, r) => sum + (r.successCount / r.totalRequests), 0) / testResults.length * 100;
    
    if (avgResponseTime > 5000) {
      console.log('   ⚠️  Average response time is high (>5s). Consider increasing timeout or optimizing database queries.');
    } else if (avgResponseTime > 2000) {
      console.log('   ⚠️  Average response time is moderate (>2s). Monitor under production load.');
    } else {
      console.log('   ✅ Average response time is good (<2s).');
    }
    
    if (avgSuccessRate < 95) {
      console.log('   ⚠️  Success rate is low (<95%). Check database connection stability.');
    } else {
      console.log('   ✅ Success rate is good (>95%).');
    }
    
    const hasTimeouts = testResults.some(r => r.timeoutCount > 0);
    if (hasTimeouts) {
      console.log('   ⚠️  Timeouts detected. Consider increasing AUTH_TIMEOUT or improving connection pool.');
    } else {
      console.log('   ✅ No timeouts detected.');
    }
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
  }
  
  console.log('\n✅ Performance testing completed');
}

// Run the tests
main().catch(console.error); 