#!/usr/bin/env bun

/**
 * Performance Testing Script untuk Employee Management System
 * Test optimasi yang telah diimplementasikan:
 * 1. Pagination dengan lightweight select
 * 2. Cache untuk static data
 * 3. Parallel queries
 * 4. Optimized connection handling
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  duration: number;
  success: boolean;
  dataSize: number;
  error?: string;
}

async function testEndpoint(
  endpoint: string, 
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<TestResult> {
  const startTime = Date.now();
  let success = false;
  let dataSize = 0;
  let error: string | undefined;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.ok) {
      const data = await response.json();
      dataSize = JSON.stringify(data).length;
      success = true;
    } else {
      error = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const duration = Date.now() - startTime;

  return {
    endpoint,
    method,
    duration,
    success,
    dataSize,
    error
  };
}

async function performanceTest() {
  console.log('🚀 Starting Performance Test untuk Employee Management System\n');
  
  const tests: Array<() => Promise<TestResult>> = [
    // Test 1: Employees with pagination (optimized)
    () => testEndpoint('/api/employees?take=25&skip=0'),
    
    // Test 2: Employees with search and pagination
    () => testEndpoint('/api/employees?search=test&take=10&skip=0'),
    
    // Test 3: Cached static data - Departments
    () => testEndpoint('/api/departments'),
    
    // Test 4: Cached static data - Positions
    () => testEndpoint('/api/positions'),
    
    // Test 5: Cached static data - Shifts
    () => testEndpoint('/api/shifts'),
    
    // Test 6: Face recognition data (with faceData)
    () => testEndpoint('/api/employees?withFaceData=true&take=10'),
    
    // Test 7: Today attendance
    () => testEndpoint('/api/attendance/today'),
  ];

  console.log('📊 Running individual endpoint tests...\n');
  
  const results: TestResult[] = [];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`⏳ Running test ${i + 1}/${tests.length}...`);
    
    const result = await test();
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const sizeKB = (result.dataSize / 1024).toFixed(2);
    
    console.log(`${status} ${result.endpoint} - ${result.duration}ms (${sizeKB}KB)`);
    
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🔥 Testing parallel fetch simulation...\n');
  
  // Test parallel fetch (simulate frontend behavior)
  const parallelStartTime = Date.now();
  
  const parallelTests = await Promise.allSettled([
    testEndpoint('/api/employees?take=25&skip=0'),
    testEndpoint('/api/departments'),
    testEndpoint('/api/positions'),
    testEndpoint('/api/shifts')
  ]);
  
  const parallelDuration = Date.now() - parallelStartTime;
  
  console.log(`✅ Parallel fetch completed in ${parallelDuration}ms\n`);
  
  // Analyze results
  console.log('📋 Performance Analysis:\n');
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
    const maxDuration = Math.max(...successfulTests.map(r => r.duration));
    const minDuration = Math.min(...successfulTests.map(r => r.duration));
    const totalDataSize = successfulTests.reduce((sum, r) => sum + r.dataSize, 0);
    
    console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
    console.log(`⏱️  Average response time: ${avgDuration.toFixed(2)}ms`);
    console.log(`🚀 Fastest response: ${minDuration}ms`);
    console.log(`🐌 Slowest response: ${maxDuration}ms`);
    console.log(`📦 Total data transferred: ${(totalDataSize / 1024).toFixed(2)}KB`);
    console.log(`🔄 Parallel fetch time: ${parallelDuration}ms\n`);
    
    // Performance benchmarks
    console.log('🎯 Performance Benchmarks:');
    
    if (avgDuration < 500) {
      console.log('✅ Average response time: EXCELLENT (< 500ms)');
    } else if (avgDuration < 1000) {
      console.log('🟡 Average response time: GOOD (500-1000ms)');
    } else if (avgDuration < 2000) {
      console.log('🟠 Average response time: FAIR (1-2s)');
    } else {
      console.log('❌ Average response time: POOR (> 2s)');
    }
    
    if (parallelDuration < 1000) {
      console.log('✅ Parallel fetch: EXCELLENT (< 1s)');
    } else if (parallelDuration < 2000) {
      console.log('🟡 Parallel fetch: GOOD (1-2s)');
    } else {
      console.log('❌ Parallel fetch: NEEDS IMPROVEMENT (> 2s)');
    }
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ Failed tests: ${failedTests.length}`);
    failedTests.forEach(test => {
      console.log(`   ${test.endpoint}: ${test.error}`);
    });
  }

  console.log('\n🏁 Performance test completed!');
  
  // Test cache effectiveness
  console.log('\n🧪 Testing cache effectiveness...\n');
  
  console.log('Testing departments cache (should be faster on second call):');
  const firstCall = await testEndpoint('/api/departments');
  const secondCall = await testEndpoint('/api/departments');
  
  console.log(`First call: ${firstCall.duration}ms`);
  console.log(`Second call: ${secondCall.duration}ms`);
  console.log(`Cache improvement: ${((firstCall.duration - secondCall.duration) / firstCall.duration * 100).toFixed(1)}%`);
}

// Run the test
if (process.argv[1] === import.meta.url) {
  performanceTest().catch(console.error);
}

export { performanceTest, testEndpoint }; 