import * as allowanceService from './src/lib/db/allowance.service.js';

console.log('Available functions:', Object.keys(allowanceService));

async function testGetAllowances() {
  try {
    const allowances = await allowanceService.getAllAllowances();
    console.log('✅ getAllAllowances works:', allowances.length);
  } catch (error) {
    console.error('❌ getAllAllowances error:', error);
  }
}

testGetAllowances();
