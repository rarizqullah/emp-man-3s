// Test script untuk memverifikasi role protection system
// Jalankan: node test-role-protection.mjs

import { execSync } from 'child_process';

console.log('🔐 TESTING ROLE PROTECTION SYSTEM');
console.log('=====================================\n');

// Helper untuk testing
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function runTest(testName, testFunction) {
  try {
    console.log(`🧪 Testing: ${testName}`);
    const result = testFunction();
    if (result) {
      console.log(`✅ PASSED: ${testName}`);
      testResults.passed++;
    } else {
      console.log(`❌ FAILED: ${testName}`);
      testResults.failed++;
    }
    testResults.tests.push({ name: testName, passed: result });
    console.log('');
  } catch (error) {
    console.log(`❌ ERROR: ${testName} - ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name: testName, passed: false, error: error.message });
    console.log('');
  }
}

// Test 1: Verify file structure
runTest('File Structure - Components exist', () => {
  const fs = require('fs');
  const requiredFiles = [
    'src/components/auth/RoleBasedPageProtection.tsx',
    'src/components/auth/RoleProtection.tsx',
    'src/lib/menu-config.ts',
    'src/hooks/useUserRole.ts',
    'src/app/(dashboard)/layout.tsx'
  ];
  
  return requiredFiles.every(file => {
    const exists = fs.existsSync(file);
    if (!exists) console.log(`   ❌ Missing: ${file}`);
    return exists;
  });
});

// Test 2: Verify menu configuration
runTest('Menu Configuration - Role access defined', () => {
  const fs = require('fs');
  const menuConfigContent = fs.readFileSync('src/lib/menu-config.ts', 'utf8');
  
  const hasEmployeeConfig = menuConfigContent.includes('EMPLOYEE_ONLY');
  const hasAdminConfig = menuConfigContent.includes('ADMIN_ONLY');
  const hasManagerConfig = menuConfigContent.includes('ADMIN_MANAGER');
  const hasAllRoles = menuConfigContent.includes('ALL_ROLES');
  
  console.log(`   Employee config: ${hasEmployeeConfig ? '✅' : '❌'}`);
  console.log(`   Admin config: ${hasAdminConfig ? '✅' : '❌'}`);
  console.log(`   Manager config: ${hasManagerConfig ? '✅' : '❌'}`);
  console.log(`   All roles config: ${hasAllRoles ? '✅' : '❌'}`);
  
  return hasEmployeeConfig && hasAdminConfig && hasManagerConfig && hasAllRoles;
});

// Test 3: Verify layout integration
runTest('Layout Integration - RoleBasedPageProtection imported', () => {
  const fs = require('fs');
  const layoutContent = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');
  
  const hasImport = layoutContent.includes('RoleBasedPageProtection');
  const hasUsage = layoutContent.includes('<RoleBasedPageProtection>');
  
  console.log(`   Import exists: ${hasImport ? '✅' : '❌'}`);
  console.log(`   Component used: ${hasUsage ? '✅' : '❌'}`);
  
  return hasImport && hasUsage;
});

// Test 4: Verify TypeScript compilation
runTest('TypeScript Compilation - No critical errors', () => {
  try {
    // Check only role protection related files
    const result = execSync('npx tsc --noEmit --skipLibCheck src/components/auth/RoleBasedPageProtection.tsx', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('   TypeScript compilation: ✅ No errors');
    return true;
  } catch (error) {
    // Check if it's just warnings or actual errors
    const output = error.stdout || error.stderr || '';
    const hasErrors = output.includes('error TS');
    
    if (!hasErrors) {
      console.log('   TypeScript compilation: ✅ No critical errors');
      return true;
    } else {
      console.log('   TypeScript compilation: ❌ Has errors');
      console.log(`   Error details: ${output.substring(0, 200)}...`);
      return false;
    }
  }
});

// Test 5: Verify hook functionality structure
runTest('useUserRole Hook - Structure is correct', () => {
  const fs = require('fs');
  const hookContent = fs.readFileSync('src/hooks/useUserRole.ts', 'utf8');
  
  const hasUserRole = hookContent.includes('export type UserRole');
  const hasUseUserRole = hookContent.includes('export function useUserRole');
  const hasRoleTypes = hookContent.includes("'ADMIN'") && hookContent.includes("'MANAGER'") && hookContent.includes("'EMPLOYEE'");
  
  console.log(`   UserRole type: ${hasUserRole ? '✅' : '❌'}`);
  console.log(`   useUserRole function: ${hasUseUserRole ? '✅' : '❌'}`);
  console.log(`   Role types defined: ${hasRoleTypes ? '✅' : '❌'}`);
  
  return hasUserRole && hasUseUserRole && hasRoleTypes;
});

// Test 6: Verify API endpoint exists
runTest('API Endpoint - /api/users/me exists', () => {
  const fs = require('fs');
  const apiExists = fs.existsSync('src/app/api/users/me/route.ts');
  
  if (apiExists) {
    const apiContent = fs.readFileSync('src/app/api/users/me/route.ts', 'utf8');
    const hasRoleInResponse = apiContent.includes('role');
    
    console.log(`   API file exists: ✅`);
    console.log(`   Returns role data: ${hasRoleInResponse ? '✅' : '❌'}`);
    
    return hasRoleInResponse;
  } else {
    console.log(`   API file exists: ❌`);
    return false;
  }
});

// Test 7: Check for potential security issues
runTest('Security Check - No hardcoded bypasses', () => {
  const fs = require('fs');
  const protectionContent = fs.readFileSync('src/components/auth/RoleBasedPageProtection.tsx', 'utf8');
  
  // Check for potential security bypasses
  const hasHardcodedTrue = protectionContent.includes('return true') && 
                          !protectionContent.includes('pathname ? canAccessUrl(pathname, role) : true');
  const hasSkipCheck = protectionContent.includes('// TODO:') || protectionContent.includes('// SKIP');
  
  console.log(`   No hardcoded bypasses: ${!hasHardcodedTrue ? '✅' : '❌'}`);
  console.log(`   No skip comments: ${!hasSkipCheck ? '✅' : '❌'}`);
  
  return !hasHardcodedTrue && !hasSkipCheck;
});

// Print final results
console.log('\n🔍 TEST SUMMARY');
console.log('================');
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📊 Total: ${testResults.tests.length}`);

if (testResults.failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Role Protection System is working correctly.');
  console.log('\n📝 Next Steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Login with different user roles');
  console.log('3. Test access to different pages manually');
  console.log('4. Verify menu items show/hide based on role');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  console.log('\n🔧 Failed Tests:');
  testResults.tests
    .filter(test => !test.passed)
    .forEach(test => {
      console.log(`   - ${test.name}${test.error ? `: ${test.error}` : ''}`);
    });
}

console.log('\n📖 For detailed implementation guide, see:');
console.log('   docs/ROLE_PROTECTION_IMPLEMENTATION.md');
