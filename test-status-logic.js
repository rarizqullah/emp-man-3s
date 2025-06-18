const fetch = require('node-fetch');

async function testStatusLogic() {
  try {
    console.log('=== Testing Status Logic ===');
    
    // Test mendapatkan data presensi hari ini
    const response = await fetch('http://localhost:3000/api/attendance/today-public');
    const data = await response.json();
    
    if (data.success) {
      console.log('\n📊 Statistik Presensi:');
      console.log(`- Total: ${data.stats.totalAttendances}`);
      console.log(`- Sedang Berlangsung: ${data.stats.sedangBerlangsung}`);
      console.log(`- Divalidasi: ${data.stats.divalidasi}`);
      console.log(`- Belum Divalidasi: ${data.stats.belumDivalidasi}`);
      
      console.log('\n📋 Detail Presensi:');
      data.attendances.forEach(att => {
        console.log(`${att.employeeName} (${att.shift}): ${att.status}`);
        console.log(`  - Check In: ${att.checkInTime || 'Belum'}`);
        console.log(`  - Check Out: ${att.checkOutTime || 'Belum'}`);
        console.log(`  - Shift End: ${att.shiftEndTime || 'Tidak ada'}`);
      });
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Test dengan berbagai skenario
async function testScenarios() {
  console.log('\n=== Test Scenarios ===');
  
  console.log('\n🧪 Scenario 1: Check-out sebelum jam kerja selesai');
  console.log('Expected: Status = "Divalidasi" (jika scan wajah manual)');
  
  console.log('\n🧪 Scenario 2: Belum check-out, jam kerja masih berlangsung');
  console.log('Expected: Status = "Sedang Berlangsung"');
  
  console.log('\n🧪 Scenario 3: Auto cut-off setelah jam kerja');
  console.log('Expected: Status = "Belum Divalidasi"');
  
  await testStatusLogic();
}

testScenarios(); 