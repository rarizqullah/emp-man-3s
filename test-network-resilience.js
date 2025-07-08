#!/usr/bin/env node

/**
 * Network Resilience Test for "fetch failed" and timeout errors
 * Tests the enhanced middleware authentication with various network failure scenarios
 */

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const PROTECTED_ROUTES = [
  '/dashboard',
  '/salary',
  '/employee',
  '/configuration',
  '/permission',
  '/leave'
];

const AUTH_ROUTES = [
  '/login',
  '/register'
];

class NetworkResilienceTest {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(url, options = {}) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'NetworkResilienceTest/1.0',
          'Accept': 'text/html,application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const data = await response.text();

      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        duration,
        ok: response.ok
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      throw {
        error: error.message,
        name: error.name,
        duration
      };
    }
  }

  async testRoute(route, description, expectedBehavior) {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`   Route: ${route}`);
    
    this.results.total++;
    
    try {
      const result = await this.makeRequest(`${BASE_URL}${route}`);
      
      console.log(`   ✅ Response: ${result.statusCode} (${result.duration}ms)`);
      
      // Check if response matches expected behavior
      const isSuccess = this.validateResponse(result, expectedBehavior);
      
      if (isSuccess) {
        console.log(`   ✅ Test passed`);
        this.results.passed++;
      } else {
        console.log(`   ❌ Test failed - unexpected response`);
        this.results.failed++;
        this.results.errors.push({
          test: description,
          route,
          error: 'Unexpected response behavior',
          details: {
            statusCode: result.statusCode,
            duration: result.duration
          }
        });
      }
      
      return result;
      
    } catch (error) {
      console.log(`   ⚠️  Network error: ${error.error} (${error.duration}ms)`);
      
      // For network errors, this might be expected behavior
      if (expectedBehavior === 'network_error_handling') {
        console.log(`   ✅ Network error handled as expected`);
        this.results.passed++;
      } else {
        console.log(`   ❌ Unexpected network error`);
        this.results.failed++;
        this.results.errors.push({
          test: description,
          route,
          error: error.error,
          name: error.name,
          duration: error.duration
        });
      }
      
      return error;
    }
  }

  validateResponse(result, expectedBehavior) {
    switch (expectedBehavior) {
      case 'redirect_to_login':
        // Check for redirects or login page content
        return result.statusCode === 302 || result.statusCode === 307 || 
               (result.statusCode === 200 && (result.data.includes('login') || result.data.includes('auth')));
      
      case 'allow_access':
        return result.statusCode === 200;
      
      case 'json_error':
        return result.statusCode >= 400 && result.headers['content-type']?.includes('application/json');
      
      case 'network_error_handling':
        return true; // Network errors are handled in catch block
      
      default:
        return result.statusCode < 500; // Any non-server error is acceptable
    }
  }

  async testConcurrentRequests(route, count = 5) {
    console.log(`\n🔄 Testing concurrent requests to ${route} (${count} requests)`);
    
    const promises = Array(count).fill().map(() => 
      this.makeRequest(`${BASE_URL}${route}`)
        .then(result => ({ success: true, ...result }))
        .catch(error => ({ success: false, ...error }))
    );
    
    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`   ✅ Successful: ${successful}/${count}`);
    console.log(`   ❌ Failed: ${failed}/${count}`);
    
    if (failed > 0) {
      const failureReasons = results.filter(r => !r.success).map(r => r.error);
      console.log(`   Failure reasons:`, [...new Set(failureReasons)]);
    }
    
    return results;
  }

  async testTimeoutScenarios() {
    console.log(`\n⏱️  Testing timeout scenarios`);
    
    // Test with very short timeout to simulate network issues
    for (const route of PROTECTED_ROUTES.slice(0, 2)) {
      try {
        await this.makeRequest(`${BASE_URL}${route}`, { timeout: 1000 });
        console.log(`   ✅ ${route} - Fast response (good)`);
      } catch (error) {
        console.log(`   ⚠️  ${route} - Timeout/Error: ${error.error}`);
      }
      await this.sleep(1000);
    }
  }

  async testCircuitBreaker() {
    console.log(`\n⚡ Testing circuit breaker behavior`);
    
    // Make several rapid requests to trigger circuit breaker
    const route = '/salary';
    for (let i = 0; i < 5; i++) {
      console.log(`   Request ${i + 1}/5`);
      await this.testRoute(
        route,
        `Circuit breaker test ${i + 1}`,
        'redirect_to_login'
      );
      await this.sleep(500); // Short delay between requests
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Network Resilience Tests');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`📅 Test Time: ${new Date().toISOString()}\n`);

    // Test 1: Basic protected route access (should redirect to login)
    console.log('='.repeat(60));
    console.log('📋 TEST SUITE 1: Protected Route Access');
    console.log('='.repeat(60));
    
    for (const route of PROTECTED_ROUTES) {
      await this.testRoute(
        route,
        `Protected route access test`,
        'redirect_to_login'
      );
      await this.sleep(500);
    }

    // Test 2: Auth route access
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUITE 2: Auth Route Access');
    console.log('='.repeat(60));
    
    for (const route of AUTH_ROUTES) {
      await this.testRoute(
        route,
        `Auth route access test`,
        'allow_access'
      );
      await this.sleep(500);
    }

    // Test 3: Concurrent requests
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUITE 3: Concurrent Request Handling');
    console.log('='.repeat(60));
    
    await this.testConcurrentRequests('/dashboard', 3);
    await this.testConcurrentRequests('/salary', 3);

    // Test 4: Timeout scenarios
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUITE 4: Timeout Scenarios');
    console.log('='.repeat(60));
    
    await this.testTimeoutScenarios();

    // Test 5: Circuit breaker
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUITE 5: Circuit Breaker');
    console.log('='.repeat(60));
    
    await this.testCircuitBreaker();

    // Results summary
    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`✅ Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    
    if (this.results.errors.length > 0) {
      console.log(`\n❌ Error Details:`);
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.test}`);
        console.log(`      Route: ${error.route}`);
        console.log(`      Error: ${error.error}`);
        if (error.duration) {
          console.log(`      Duration: ${error.duration}ms`);
        }
      });
    }
    
    console.log('\n🎯 Network Error Resilience Check:');
    const networkErrors = this.results.errors.filter(e => 
      e.error?.includes('fetch') || 
      e.error?.includes('network') || 
      e.name === 'AbortError'
    );
    
    if (networkErrors.length === 0) {
      console.log('   ✅ No unhandled network errors detected');
    } else {
      console.log(`   ⚠️  ${networkErrors.length} network errors found:`);
      networkErrors.forEach(error => {
        console.log(`      - ${error.route}: ${error.error}`);
      });
    }
    
    console.log('\n🎯 Recommendations:');
    if (this.results.failed === 0) {
      console.log('   ✅ All tests passed! Network resilience is working correctly.');
    } else {
      console.log('   ⚠️  Some tests failed. Check error details above.');
      if (this.results.failed > this.results.total * 0.3) {
        console.log('   🔧 High failure rate detected. Consider reviewing:');
        console.log('      - Network timeout configurations');
        console.log('      - Circuit breaker thresholds');
        console.log('      - JWT fallback implementation');
      }
    }
    
    console.log('\n✨ Test completed at:', new Date().toISOString());
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new NetworkResilienceTest();
  tester.runAllTests().catch(console.error);
}

module.exports = NetworkResilienceTest;
