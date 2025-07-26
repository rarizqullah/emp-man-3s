#!/usr/bin/env bun

/**
 * Test script untuk memverifikasi fungsi pembulatan gaji
 */

// Fungsi pembulatan yang sama seperti di salary.service.ts
function roundSalaryToNearestHundred(amount) {
  const remainder = amount % 100;
  
  if (remainder >= 50) {
    // Bulatkan ke atas ke kelipatan 100 berikutnya
    return Math.ceil(amount / 100) * 100;
  } else {
    // Bulatkan ke bawah ke kelipatan 100 sebelumnya
    return Math.floor(amount / 100) * 100;
  }
}

// Test cases
const testCases = [
  { input: 20360, expected: 20400, description: "20.360 → 20.400" },
  { input: 20320, expected: 20300, description: "20.320 → 20.300" },
  { input: 20350, expected: 20400, description: "20.350 → 20.400" },
  { input: 20301, expected: 20300, description: "20.301 → 20.300" },
  { input: 20349, expected: 20300, description: "20.349 → 20.300" },
  { input: 20351, expected: 20400, description: "20.351 → 20.400" },
  { input: 20399, expected: 20400, description: "20.399 → 20.400" },
  { input: 20000, expected: 20000, description: "20.000 → 20.000" },
  { input: 20100, expected: 20100, description: "20.100 → 20.100" },
  { input: 19950, expected: 20000, description: "19.950 → 20.000" },
  { input: 19949, expected: 19900, description: "19.949 → 19.900" },
];

console.log("🧮 Testing Salary Rounding Function");
console.log("===================================");

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = roundSalaryToNearestHundred(testCase.input);
  const passed = result === testCase.expected;
  
  if (passed) {
    passedTests++;
    console.log(`✅ Test ${index + 1}: ${testCase.description} - PASSED`);
  } else {
    console.log(`❌ Test ${index + 1}: ${testCase.description} - FAILED`);
    console.log(`   Expected: ${testCase.expected.toLocaleString('id-ID')}`);
    console.log(`   Got:      ${result.toLocaleString('id-ID')}`);
  }
});

console.log("\n📊 Test Summary:");
console.log(`   Passed: ${passedTests}/${totalTests}`);
console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

if (passedTests === totalTests) {
  console.log("\n🎉 All tests passed! Salary rounding function is working correctly.");
} else {
  console.log("\n⚠️  Some tests failed. Please check the rounding logic.");
  process.exit(1);
}
