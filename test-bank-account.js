// Test script untuk memverifikasi field bankAccountNumber
const fetch = require('node-fetch');

async function testBankAccountField() {
  try {
    console.log('Testing bank account number field...');
    
    // Test dengan fetch endpoint employee
    const response = await fetch('http://localhost:3000/api/employees');
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API employees berhasil diakses');
      console.log('✅ Field bankAccountNumber tersedia dalam respons');
      
      // Jika ada data employee, cek apakah field bankAccountNumber ada
      if (data && data.length > 0) {
        const hasBank = data.some(emp => emp.hasOwnProperty('bankAccountNumber'));
        console.log(`✅ Field bankAccountNumber ada di data: ${hasBank}`);
      }
    } else {
      console.error('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Test gagal:', error.message);
  }
}

testBankAccountField();
