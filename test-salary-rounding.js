/**
 * Test script untuk memverifikasi fungsi pembulatan gaji
 */

// Fungsi pembulatan yang sama dengan di salary.service.ts
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

// Test cases berdasarkan contoh dari user
const testCases = [
  { input: 20360, expected: 20400, description: "20.360 → 20.400" },
  { input: 20320, expected: 20300, description: "20.320 → 20.300" },
  { input: 20350, expected: 20400, description: "20.350 → 20.400" },
  { input: 20349, expected: 20300, description: "20.349 → 20.300" },
  { input: 20351, expected: 20400, description: "20.351 → 20.400" },
  { input: 25000, expected: 25000, description: "25.000 → 25.000 (sudah bulat)" },
  { input: 26520, expected: 26500, description: "26.520 → 26.500" },
  { input: 26580, expected: 26600, description: "26.580 → 26.600" },
  { input: 30050, expected: 30100, description: "30.050 → 30.100" },
  { input: 30049, expected: 30000, description: "30.049 → 30.000" },
];

console.log("🧮 Testing Salary Rounding Function");
console.log("=====================================");

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = roundSalaryToNearestHundred(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`\nTest ${index + 1}: ${testCase.description}`);
  console.log(`Input:    ${testCase.input.toLocaleString('id-ID')}`);
  console.log(`Expected: ${testCase.expected.toLocaleString('id-ID')}`);
  console.log(`Result:   ${result.toLocaleString('id-ID')}`);
  console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}`);
  
  if (passed) {
    passedTests++;
  }
});

console.log("\n=====================================");
console.log(`📊 Test Summary: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log("🎉 All tests passed! Salary rounding function is working correctly.");
} else {
  console.log("⚠️  Some tests failed. Please check the rounding logic.");
}

// Tambahan: Format currency untuk display
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR',
    minimumFractionDigits: 0 
  }).format(amount);
}

console.log("\n💰 Currency Format Examples:");
testCases.slice(0, 3).forEach(testCase => {
  const rounded = roundSalaryToNearestHundred(testCase.input);
  console.log(`${formatCurrency(testCase.input)} → ${formatCurrency(rounded)}`);
});
