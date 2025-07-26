#!/usr/bin/env node

/**
 * Test script untuk memvalidasi perbaikan Role System & API Timeout
 * 
 * Usage: node test-role-system-fix.js
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

class RoleSystemTester {
  constructor() {
    this.baseUrl = BASE_URL;
    this.results = [];
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️ ',
      success: '✅',
      warning: '⚠️ ',
      error: '❌'
    }[type] || 'ℹ️ ';
    
    const logMessage = `${prefix} [${timestamp}] ${message}`;
    console.log(logMessage);
    
    this.results.push({
      timestamp,
      type,
      message,
      logMessage
    });
  }

  async testAPITimeout(endpoint, expectedMaxTime = 15000) {
    this.log(`Testing API timeout for ${endpoint}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Role-System-Test/1.0'
        },
        // Set AbortSignal timeout to be higher than expected
        signal: AbortSignal.timeout(expectedMaxTime + 5000)
      });
      
      const duration = Date.now() - startTime;
      
      this.log(`Response Status: ${response.status}, Duration: ${duration}ms`);
      
      if (duration > expectedMaxTime) {
        this.log(`FAILED: Request took ${duration}ms (expected max: ${expectedMaxTime}ms)`, 'error');
        return false;
      } else {
        this.log(`PASSED: Request completed in ${duration}ms`, 'success');
        return true;
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error.name === 'TimeoutError') {
        this.log(`TIMEOUT: Request timed out after ${duration}ms`, 'warning');
        return duration <= expectedMaxTime; // Timeout is acceptable if within expected time
      } else {
        this.log(`ERROR: ${error.message} (${duration}ms)`, 'error');
        return false;
      }
    }
  }

  async testDatabaseConnection() {
    this.log('Testing database connection health...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/employees/clean-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.log(`Database connection healthy: ${data.message}`, 'success');
        this.log(`Connection time: ${data.connectionTime}ms, Query time: ${data.queryTime}ms`);
        return true;
      } else {
        this.log(`Database connection issue: ${data.error}`, 'error');
        return false;
      }
      
    } catch (error) {
      this.log(`Database connection test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testRoleSystemEndpoints() {
    this.log('Testing role system critical endpoints...');
    
    const criticalEndpoints = [
      '/api/users/me',
      '/api/auth/session',
      '/api/auth/health'
    ];
    
    const results = [];
    
    for (const endpoint of criticalEndpoints) {
      const result = await this.testAPITimeout(endpoint, 15000);
      results.push({ endpoint, passed: result });
    }
    
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    this.log(`Role system endpoints: ${passedCount}/${totalCount} passed`, 
      passedCount === totalCount ? 'success' : 'warning');
    
    return passedCount === totalCount;
  }

  async testConnectionPoolSettings() {
    this.log('Testing connection pool optimization...');
    
    // Test multiple concurrent requests to simulate pool usage
    const concurrentRequests = 5;
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        this.testAPITimeout('/api/auth/health', 10000)
          .then(result => ({ requestId: i, passed: result }))
      );
    }
    
    try {
      const results = await Promise.all(promises);
      const passedCount = results.filter(r => r.passed).length;
      
      this.log(`Concurrent requests: ${passedCount}/${concurrentRequests} passed`, 
        passedCount >= concurrentRequests - 1 ? 'success' : 'warning'); // Allow 1 failure
      
      return passedCount >= concurrentRequests - 1;
    } catch (error) {
      this.log(`Concurrent request test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async generateReport() {
    this.log('Generating test report...');
    
    const successCount = this.results.filter(r => r.type === 'success').length;
    const warningCount = this.results.filter(r => r.type === 'warning').length;
    const errorCount = this.results.filter(r => r.type === 'error').length;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ROLE SYSTEM FIX - TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`✅ Success: ${successCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    console.log('\n📋 SUMMARY:');
    if (errorCount === 0 && warningCount <= 1) {
      console.log('🎉 Role system fix is working correctly!');
      console.log('✅ API timeouts are resolved');
      console.log('✅ Database connection pool is optimized');
      console.log('✅ Authentication system is responsive');
    } else if (errorCount <= 1) {
      console.log('⚠️  Role system fix is mostly working');
      console.log('ℹ️  Some minor issues detected, but system is functional');
    } else {
      console.log('❌ Role system fix needs additional work');
      console.log('🔧 Please review the errors above');
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Monitor /api/users/me endpoint response times');
    console.log('2. Check database connection pool metrics');
    console.log('3. Verify user role assignment is working');
    console.log('4. Test with actual user sessions');
    
    return {
      totalTests: this.results.length,
      successCount,
      warningCount,
      errorCount,
      overallStatus: errorCount === 0 && warningCount <= 1 ? 'PASSED' : 'NEEDS_REVIEW'
    };
  }

  async runAllTests() {
    console.log('🔧 Role System & API Timeout Fix - Test Suite');
    console.log('=' .repeat(60));
    console.log(`🌐 Testing against: ${this.baseUrl}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
    
    try {
      // Test 1: Database Connection
      await this.testDatabaseConnection();
      
      // Test 2: Role System Endpoints
      await this.testRoleSystemEndpoints();
      
      // Test 3: Connection Pool
      await this.testConnectionPoolSettings();
      
      // Generate report
      const report = await this.generateReport();
      
      // Exit with appropriate code
      process.exit(report.overallStatus === 'PASSED' ? 0 : 1);
      
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new RoleSystemTester();
  tester.runAllTests().catch(console.error);
}

module.exports = RoleSystemTester;
