#!/usr/bin/env bun
/**
 * Quick Test Script for Authentication Timeout Fix
 * 
 * Usage: bun test-auth-timeout-fix.js
 */

const NEXT_SERVER_URL = 'http://localhost:3000';

async function testAuthTimeout() {
  console.log('🧪 Testing Authentication Timeout Fix\n');
  
  const testCases = [
    {
      name: 'Salary Page Access',
      path: '/salary',
      expectedMaxTime: 10000 // 10 seconds max
    },
    {
      name: 'Dashboard Access', 
      path: '/dashboard',
      expectedMaxTime: 10000
    },
    {
      name: 'Employee Page Access',
      path: '/employee',
      expectedMaxTime: 10000
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📍 Testing: ${testCase.name}`);
    console.log(`   Path: ${testCase.path}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${NEXT_SERVER_URL}${testCase.path}`, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects
        headers: {
          'User-Agent': 'Auth-Timeout-Test/1.0'
        }
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Duration: ${duration}ms`);
      
      if (duration > testCase.expectedMaxTime) {
        console.log(`   ❌ FAILED: Duration (${duration}ms) exceeded expected max (${testCase.expectedMaxTime}ms)`);
      } else {
        console.log(`   ✅ PASSED: Duration within expected range`);
      }
      
      // Check for timeout-related errors in response
      if (response.status === 408) {
        console.log(`   ⚠️  WARNING: Request timeout status returned`);
      } else if (response.status === 503) {
        console.log(`   ⚠️  WARNING: Service unavailable status returned`);
      } else if (response.status === 302 || response.status === 307) {
        console.log(`   ℹ️  INFO: Redirect response (likely to login) - expected for unauthenticated requests`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ ERROR: ${error.message}`);
      console.log(`   Duration: ${duration}ms`);
      
      if (duration > testCase.expectedMaxTime) {
        console.log(`   ❌ FAILED: Error duration also exceeded expected max time`);
      }
    }
    
    console.log('');
  }
  
  console.log('🏁 Test Results Summary:');
  console.log('   ✅ If all durations are < 10 seconds: Authentication timeout fix is working');
  console.log('   ❌ If any duration > 10 seconds: Further optimization needed');
  console.log('   ℹ️  302/307 redirects are normal for unauthenticated requests');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Test with actual authentication cookies');
  console.log('   2. Run load testing with multiple concurrent requests');
  console.log('   3. Monitor with: bun src/scripts/monitor-auth-performance.ts');
}

// Performance test with concurrent requests
async function testConcurrentAuth() {
  console.log('🚀 Testing Concurrent Authentication Requests\n');
  
  const concurrentRequests = 5;
  const requests = [];
  
  console.log(`📊 Sending ${concurrentRequests} concurrent requests to /salary...`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < concurrentRequests; i++) {
    requests.push(
      fetch(`${NEXT_SERVER_URL}/salary`, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': `Auth-Timeout-Test-${i}/1.0`
        }
      }).then(response => ({
        requestId: i,
        status: response.status,
        duration: Date.now() - startTime
      })).catch(error => ({
        requestId: i,
        error: error.message,
        duration: Date.now() - startTime
      }))
    );
  }
  
  const results = await Promise.all(requests);
  const totalDuration = Date.now() - startTime;
  
  console.log('📈 Results:');
  results.forEach(result => {
    if (result.error) {
      console.log(`   Request ${result.requestId}: ERROR - ${result.error} (${result.duration}ms)`);
    } else {
      console.log(`   Request ${result.requestId}: ${result.status} (${result.duration}ms)`);
    }
  });
  
  console.log(`\n⏱️  Total Time: ${totalDuration}ms`);
  console.log(`📊 Average Response Time: ${Math.round(totalDuration / concurrentRequests)}ms`);
  
  const maxDuration = Math.max(...results.map(r => r.duration));
  console.log(`🔝 Slowest Request: ${maxDuration}ms`);
  
  if (maxDuration < 15000) {
    console.log('✅ PASSED: All concurrent requests completed within reasonable time');
  } else {
    console.log('❌ FAILED: Some requests took too long');
  }
}

// Network simulation test
async function testNetworkConditions() {
  console.log('🌐 Testing Different Network Conditions\n');
  
  // Test with various delays to simulate network conditions
  const networkConditions = [
    { name: 'Fast Network', delay: 0 },
    { name: 'Slow Network', delay: 2000 },
    { name: 'Very Slow Network', delay: 4000 }
  ];
  
  for (const condition of networkConditions) {
    console.log(`📡 Testing: ${condition.name} (${condition.delay}ms simulated delay)`);
    
    const startTime = Date.now();
    
    try {
      // Simulate network delay
      if (condition.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, condition.delay));
      }
      
      const response = await fetch(`${NEXT_SERVER_URL}/salary`, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      const duration = Date.now() - startTime;
      console.log(`   Duration: ${duration}ms, Status: ${response.status}`);
      
      if (duration > 15000) {
        console.log(`   ❌ FAILED: Request took too long for ${condition.name}`);
      } else {
        console.log(`   ✅ PASSED: Request completed within timeout for ${condition.name}`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   Duration: ${duration}ms, Error: ${error.message}`);
      
      if (error.name === 'TimeoutError') {
        console.log(`   ⚠️  INFO: Request properly timed out as expected`);
      }
    }
    
    console.log('');
  }
}

// Main test execution
async function runAllTests() {
  console.log('🔧 Authentication Timeout Fix - Test Suite');
  console.log('==========================================\n');
  
  try {
    await testAuthTimeout();
    await testConcurrentAuth();
    await testNetworkConditions();
    
    console.log('✅ All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Basic timeout tests: Check individual request times');
    console.log('   - Concurrent tests: Verify system handles multiple requests');
    console.log('   - Network tests: Confirm proper timeout behavior');
    console.log('\n🎯 Expected Results:');
    console.log('   - All requests complete within 10-15 seconds');
    console.log('   - No requests should exceed 30 seconds');
    console.log('   - Concurrent requests should not significantly degrade performance');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testAuthTimeout, testConcurrentAuth, testNetworkConditions };
