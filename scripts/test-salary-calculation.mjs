/**
 * Script untuk menguji kalkulasi gaji dengan pembulatan
 * Jalankan dengan: node scripts/test-salary-calculation.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fungsi pembulatan yang sama dengan di salary.service.ts
function roundSalaryToNearestHundred(amount) {
  const remainder = amount % 100;
  
  if (remainder >= 50) {
    return Math.ceil(amount / 100) * 100;
  } else {
    return Math.floor(amount / 100) * 100;
  }
}

async function testSalaryCalculation() {
  try {
    console.log("🧮 Testing Salary Calculation with Rounding");
    console.log("============================================");

    // Ambil satu karyawan untuk test
    const employee = await prisma.employee.findFirst({
      include: {
        user: true,
        department: true,
        position: true,
        employeeAllowances: {
          where: { isActive: true },
          include: { allowance: true }
        }
      }
    });

    if (!employee) {
      console.log("❌ Tidak ada karyawan ditemukan untuk testing");
      return;
    }

    console.log(`\n👤 Testing dengan karyawan: ${employee.user.name}`);
    console.log(`📍 Departemen: ${employee.department.name}`);
    console.log(`💼 Posisi: ${employee.position.name}`);

    // Test dengan nilai gaji yang akan menghasilkan angka tidak bulat
    const testBaseSalary = 5234567; // Contoh gaji pokok
    const testOvertimeSalary = 456789; // Contoh lembur
    const testAllowances = 234567; // Contoh tunjangan

    const totalBeforeRounding = testBaseSalary + testOvertimeSalary + testAllowances;
    const totalAfterRounding = roundSalaryToNearestHundred(totalBeforeRounding);

    console.log(`\n💰 Simulasi Kalkulasi Gaji:`);
    console.log(`📋 Gaji Pokok: ${testBaseSalary.toLocaleString('id-ID')}`);
    console.log(`⏰ Lembur: ${testOvertimeSalary.toLocaleString('id-ID')}`);
    console.log(`🎁 Tunjangan: ${testAllowances.toLocaleString('id-ID')}`);
    console.log(`─────────────────────────────────────`);
    console.log(`💵 Total Sebelum Pembulatan: ${totalBeforeRounding.toLocaleString('id-ID')}`);
    console.log(`💎 Total Setelah Pembulatan: ${totalAfterRounding.toLocaleString('id-ID')}`);
    console.log(`📏 Selisih: ${(totalAfterRounding - totalBeforeRounding).toLocaleString('id-ID')}`);

    // Format currency
    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0 
    }).format(amount);

    console.log(`\n💰 Format Mata Uang:`);
    console.log(`💵 Sebelum: ${formatCurrency(totalBeforeRounding)}`);
    console.log(`💎 Sesudah: ${formatCurrency(totalAfterRounding)}`);

    // Test dengan beberapa contoh kasus
    const testCases = [
      { name: "Gaji Rendah", amount: 2567890 },
      { name: "Gaji Menengah", amount: 4234567 },
      { name: "Gaji Tinggi", amount: 8765432 },
      { name: "Gaji dengan angka 50", amount: 3456750 },
      { name: "Gaji dengan angka 49", amount: 3456749 },
      { name: "Gaji dengan angka 51", amount: 3456751 },
    ];

    console.log(`\n📊 Test Cases Pembulatan:`);
    testCases.forEach((testCase, index) => {
      const rounded = roundSalaryToNearestHundred(testCase.amount);
      const diff = rounded - testCase.amount;
      console.log(`${index + 1}. ${testCase.name}:`);
      console.log(`   ${formatCurrency(testCase.amount)} → ${formatCurrency(rounded)} (${diff >= 0 ? '+' : ''}${diff})`);
    });

    console.log(`\n✅ Test pembulatan gaji selesai!`);

  } catch (error) {
    console.error("❌ Error dalam testing:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan test
testSalaryCalculation();
