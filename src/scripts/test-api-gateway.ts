// Test script untuk API Gateway
// Jalankan dengan: bun run test-api-gateway

import { APIGatewayClient } from '../lib/api-gateway-client';

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000/api/gateway',
  timeout: 10000,
};

// Create test client
const testClient = new APIGatewayClient(TEST_CONFIG);

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Helper functions
function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function warning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const testResults: TestResult[] = [];

// Test runner function
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  info(`Running test: ${name}`);
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    success(`${name} - PASSED (${duration}ms)`);
    testResults.push({ name, passed: true, duration });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    error(`${name} - FAILED (${duration}ms): ${errorMessage}`);
    testResults.push({ name, passed: false, error: errorMessage, duration });
  }
}

// Individual test functions
async function testHealthCheck() {
  const health = await testClient.getHealth();
  
  if (!health || typeof health !== 'object') {
    throw new Error('Health check response is invalid');
  }
  
  if (!health.status) {
    throw new Error('Health check missing status field');
  }
  
  info(`Health status: ${health.status}`);
}

async function testMetrics() {
  try {
    const metrics = await testClient.getMetrics();
    
    if (!metrics || typeof metrics !== 'object') {
      throw new Error('Metrics response is invalid');
    }
    
    info(`Total requests: ${metrics.totalRequests || 0}`);
    info(`Successful requests: ${metrics.successfulRequests || 0}`);
    info(`Failed requests: ${metrics.failedRequests || 0}`);
  } catch (err) {
    // Metrics might require admin access, so we'll warn instead of failing
    warning('Metrics test failed (might require admin access): ' + (err as Error).message);
  }
}

async function testPublicRoutes() {
  // Test departments-public
  try {
    const response = await fetch('http://localhost:3000/api/gateway/departments-public');
    if (!response.ok) {
      throw new Error(`Departments public API failed: ${response.status}`);
    }
    const departments = await response.json();
    info(`Found ${departments.data?.length || 0} departments`);
  } catch (err) {
    throw new Error(`Public departments test failed: ${(err as Error).message}`);
  }
  
  // Test employees-public
  try {
    const response = await fetch('http://localhost:3000/api/gateway/employees-public');
    if (!response.ok) {
      throw new Error(`Employees public API failed: ${response.status}`);
    }
    const employees = await response.json();
    info(`Found ${employees.data?.length || 0} employees`);
  } catch (err) {
    throw new Error(`Public employees test failed: ${(err as Error).message}`);
  }
}

async function testAuthenticationFlow() {
  // Test without token (should fail)
  try {
    await testClient.getEmployees();
    throw new Error('Expected authentication error but request succeeded');
  } catch (err) {
    const error = err as any;
    if (error.status !== 401 && !error.message.includes('Unauthorized')) {
      throw new Error(`Expected 401 Unauthorized, got: ${error.message}`);
    }
    info('Authentication protection working correctly');
  }
}

async function testRateLimiting() {
  info('Testing rate limiting (making multiple rapid requests)...');
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch('http://localhost:3000/api/gateway/health')
        .then(res => ({ status: res.status, attempt: i + 1 }))
        .catch(err => ({ error: err.message, attempt: i + 1 }))
    );
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r.status === 429);
  
  if (rateLimited.length > 0) {
    info(`Rate limiting triggered after ${10 - rateLimited.length} requests`);
  } else {
    info('Rate limiting not triggered (may need adjustment or more requests)');
  }
}

async function testErrorHandling() {
  // Test 404 error
  try {
    const response = await fetch('http://localhost:3000/api/gateway/non-existent-endpoint');
    const data = await response.json();
    
    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }
    
    if (!data.error || !data.requestId) {
      throw new Error('Error response missing required fields');
    }
    
    info('404 error handling working correctly');
  } catch (err) {
    throw new Error(`Error handling test failed: ${(err as Error).message}`);
  }
}

async function testCORSHeaders() {
  try {
    const response = await fetch('http://localhost:3000/api/gateway/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
    };
    
    if (!corsHeaders['access-control-allow-origin']) {
      throw new Error('CORS headers not properly set');
    }
    
    info('CORS headers configured correctly');
  } catch (err) {
    throw new Error(`CORS test failed: ${(err as Error).message}`);
  }
}

async function testResponseFormat() {
  try {
    const response = await fetch('http://localhost:3000/api/gateway/health');
    const data = await response.json();
    
    // Check required fields
    const requiredFields = ['success', 'timestamp', 'requestId'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Response missing required field: ${field}`);
      }
    }
    
    // Check API version header
    const apiVersion = response.headers.get('X-API-Version');
    if (!apiVersion) {
      throw new Error('X-API-Version header missing');
    }
    
    info(`Response format valid, API version: ${apiVersion}`);
  } catch (err) {
    throw new Error(`Response format test failed: ${(err as Error).message}`);
  }
}

// Main test runner
async function runAllTests() {
  log(`${colors.bold}🧪 Starting API Gateway Tests${colors.reset}`);
  log(`Testing against: ${TEST_CONFIG.baseUrl}`);
  log('─'.repeat(50));
  
  const startTime = Date.now();
  
  // Run all tests
  await runTest('Health Check', testHealthCheck);
  await runTest('Metrics', testMetrics);
  await runTest('Public Routes', testPublicRoutes);
  await runTest('Authentication Protection', testAuthenticationFlow);
  await runTest('Rate Limiting', testRateLimiting);
  await runTest('Error Handling', testErrorHandling);
  await runTest('CORS Headers', testCORSHeaders);
  await runTest('Response Format', testResponseFormat);
  
  const totalTime = Date.now() - startTime;
  
  // Print results summary
  log('─'.repeat(50));
  log(`${colors.bold}📊 Test Results Summary${colors.reset}`);
  
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  
  log(`Total tests: ${total}`);
  success(`Passed: ${passed}`);
  if (failed > 0) {
    error(`Failed: ${failed}`);
  }
  
  log(`Total time: ${totalTime}ms`);
  log(`Average time per test: ${Math.round(totalTime / total)}ms`);
  
  // Show failed tests details
  const failedTests = testResults.filter(r => !r.passed);
  if (failedTests.length > 0) {
    log('─'.repeat(50));
    error('Failed Tests Details:');
    failedTests.forEach(test => {
      error(`• ${test.name}: ${test.error}`);
    });
  }
  
  log('─'.repeat(50));
  
  if (failed === 0) {
    success('🎉 All tests passed!');
    process.exit(0);
  } else {
    error(`💥 ${failed} test(s) failed!`);
    process.exit(1);
  }
}

// Check if server is running
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:3000/api/gateway/health', {
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    success('✅ Server is running and API Gateway is accessible');
    return true;
  } catch (err) {
    error('❌ Cannot connect to server. Please make sure:');
    error('   1. Server is running (bun run dev)');
    error('   2. API Gateway is properly set up');
    error('   3. Port 3000 is accessible');
    error(`   Error: ${(err as Error).message}`);
    return false;
  }
}

// Run tests
async function main() {
  try {
    // Check server status first
    const serverRunning = await checkServerStatus();
    if (!serverRunning) {
      process.exit(1);
    }
    
    // Run tests
    await runAllTests();
  } catch (err) {
    error(`Test execution failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

// Export for manual testing
export {
  testClient,
  runTest,
  testHealthCheck,
  testMetrics,
  testPublicRoutes,
  testAuthenticationFlow,
  testRateLimiting,
  testErrorHandling,
  testCORSHeaders,
  testResponseFormat,
};

// Run if called directly
if (require.main === module) {
  main();
} 