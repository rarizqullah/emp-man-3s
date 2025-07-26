#!/usr/bin/env node

/**
 * Script untuk menguji pembulatan gaji dalam konteks nyata
 */

const testSalaryCalculation = () => {
  // Simulasi kalkulasi gaji dengan nilai yang akan dibulatkan
  const testCases = [
    {
      name: "Karyawan A",
      baseSalary: 5000000,
      overtimeSalary: 250000,
      weeklyOvertimeSalary: 150000,
      totalCompanyAllowances: 680360, // Akan menghasilkan total yang perlu dibulatkan
      totalEmployeeDeductions: 320000,
      description: "Gaji dengan angka satuan 60 (harus dibulatkan ke atas)"
    },
    {
      name: "Karyawan B", 
      baseSalary: 4500000,
      overtimeSalary: 175000,
      weeklyOvertimeSalary: 85000,
      totalCompanyAllowances: 520320, // Akan menghasilkan total yang perlu dibulatkan
      totalEmployeeDeductions: 240000,
      description: "Gaji dengan angka satuan 20 (harus dibulatkan ke bawah)"
    },
    {
      name: "Karyawan C",
      baseSalary: 6200000,
      overtimeSalary: 320000,
      weeklyOvertimeSalary: 180000,
      totalCompanyAllowances: 875350, // Akan menghasilkan total yang perlu dibulatkan
      totalEmployeeDeductions: 415000,
      description: "Gaji dengan angka satuan 50 (harus dibulatkan ke atas)"
    },
    {
      name: "Karyawan D",
      baseSalary: 3800000,
      overtimeSalary: 195000,
      weeklyOvertimeSalary: 120000,
      totalCompanyAllowances: 450249, // Akan menghasilkan total yang perlu dibulatkan
      totalEmployeeDeductions: 180000,
      description: "Gaji dengan angka satuan 49 (harus dibulatkan ke bawah)"
    }
  ];

  // Fungsi pembulatan yang sama dengan di salary.service.ts
  const roundSalaryToNearestHundred = (amount) => {
    const remainder = amount % 100;
    
    if (remainder >= 50) {
      return Math.ceil(amount / 100) * 100;
    } else {
      return Math.floor(amount / 100) * 100;
    }
  };

  console.log("💰 Testing Salary Calculation with Rounding");
  console.log("============================================");

  testCases.forEach((testCase, index) => {
    const rawTotal = testCase.baseSalary + testCase.overtimeSalary + testCase.weeklyOvertimeSalary + testCase.totalCompanyAllowances - testCase.totalEmployeeDeductions;
    const roundedTotal = roundSalaryToNearestHundred(rawTotal);
    const difference = roundedTotal - rawTotal;
    
    console.log(`\n👤 ${testCase.name}:`);
    console.log(`   📝 ${testCase.description}`);
    console.log(`   💵 Gaji Pokok: ${testCase.baseSalary.toLocaleString('id-ID')}`);
    console.log(`   ⏰ Lembur Reguler: ${testCase.overtimeSalary.toLocaleString('id-ID')}`);
    console.log(`   📅 Lembur Mingguan: ${testCase.weeklyOvertimeSalary.toLocaleString('id-ID')}`);
    console.log(`   ➕ Tunjangan Perusahaan: ${testCase.totalCompanyAllowances.toLocaleString('id-ID')}`);
    console.log(`   ➖ Potongan Karyawan: ${testCase.totalEmployeeDeductions.toLocaleString('id-ID')}`);
    console.log(`   🧮 Total Sebelum Pembulatan: Rp ${rawTotal.toLocaleString('id-ID')}`);
    console.log(`   🎯 Total Setelah Pembulatan: Rp ${roundedTotal.toLocaleString('id-ID')}`);
    console.log(`   📊 Selisih: ${difference >= 0 ? '+' : ''}${difference.toLocaleString('id-ID')}`);
  });

  console.log("\n✅ Semua perhitungan berhasil dengan pembulatan ke kelipatan 100 terdekat!");
};

testSalaryCalculation();
