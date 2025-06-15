// Test script untuk memperbarui jam istirahat pada shift
// Jalankan dengan: node test-update-break-times.js

const BASE_URL = 'http://localhost:3000'; // Sesuaikan dengan port aplikasi Anda

async function testUpdateBreakTimes() {
  try {
    console.log('🔍 Memeriksa shift yang belum memiliki jam istirahat...');
    
    // 1. Cek shift yang belum memiliki jam istirahat
    const checkResponse = await fetch(`${BASE_URL}/api/shifts/update-break-times`, {
      method: 'GET',
    });
    
    if (!checkResponse.ok) {
      throw new Error(`Check failed: ${checkResponse.status}`);
    }
    
    const checkData = await checkResponse.json();
    console.log(`📊 Ditemukan ${checkData.count} shift tanpa jam istirahat:`);
    
    if (checkData.shifts && checkData.shifts.length > 0) {
      checkData.shifts.forEach(shift => {
        const startTime = new Date(shift.mainWorkStart).toTimeString().slice(0, 5);
        const endTime = new Date(shift.mainWorkEnd).toTimeString().slice(0, 5);
        console.log(`   - ${shift.name} (${shift.shiftType}): ${startTime}-${endTime}`);
      });
      
      console.log('\n🔧 Memperbarui jam istirahat...');
      
      // 2. Update jam istirahat
      const updateResponse = await fetch(`${BASE_URL}/api/shifts/update-break-times`, {
        method: 'POST',
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Update failed: ${updateResponse.status}`);
      }
      
      const updateData = await updateResponse.json();
      console.log(`✅ ${updateData.message}`);
      
      if (updateData.updates && updateData.updates.length > 0) {
        console.log('\n📝 Detail pembaruan:');
        updateData.updates.forEach(update => {
          console.log(`   - ${update.name}: ${update.lunchBreakStart} - ${update.lunchBreakEnd}`);
        });
      }
    } else {
      console.log('✅ Semua shift sudah memiliki jam istirahat yang ditetapkan.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Jalankan test
testUpdateBreakTimes(); 