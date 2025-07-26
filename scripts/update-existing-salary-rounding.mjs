/**
 * Script untuk memperbarui pembulatan gaji yang sudah ada di database
 * Jalankan dengan: node scripts/update-existing-salary-rounding.mjs
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

async function updateExistingSalaryRounding() {
  try {
    console.log("🔄 Memperbarui pembulatan gaji yang sudah ada...");
    console.log("================================================");

    // Ambil semua gaji yang perlu diperbarui
    const salaries = await prisma.salary.findMany({
      include: {
        employee: {
          include: {
            user: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Ditemukan ${salaries.length} record gaji untuk diperbarui`);

    if (salaries.length === 0) {
      console.log("ℹ️  Tidak ada data gaji yang perlu diperbarui");
      return;
    }

    let updatedCount = 0;
    let unchangedCount = 0;

    // Format currency helper
    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0 
    }).format(amount);

    console.log("\\n🔍 Menganalisis dan memperbarui data...");

    for (const salary of salaries) {
      const originalTotal = salary.totalSalary;
      const roundedTotal = roundSalaryToNearestHundred(originalTotal);
      
      if (originalTotal !== roundedTotal) {
        // Update jika ada perbedaan
        await prisma.salary.update({
          where: { id: salary.id },
          data: { 
            totalSalary: roundedTotal,
            updatedAt: new Date()
          }
        });

        console.log(`✅ Updated: ${salary.employee.user.name}`);
        console.log(`   ${formatCurrency(originalTotal)} → ${formatCurrency(roundedTotal)} (${roundedTotal - originalTotal >= 0 ? '+' : ''}${roundedTotal - originalTotal})`);
        
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log("\\n📈 Ringkasan Update:");
    console.log(`✅ Diperbarui: ${updatedCount} record`);
    console.log(`➖ Tidak berubah: ${unchangedCount} record`);
    console.log(`📊 Total: ${salaries.length} record`);

    if (updatedCount > 0) {
      console.log("\\n🎉 Pembulatan gaji berhasil diterapkan!");
      console.log("📌 Semua gaji sekarang menggunakan pembulatan ke kelipatan 100 terdekat");
    } else {
      console.log("\\nℹ️  Semua gaji sudah menggunakan pembulatan yang benar");
    }

    // Tampilkan beberapa contoh hasil update
    if (updatedCount > 0) {
      console.log("\\n📋 Beberapa contoh hasil pembulatan:");
      const updatedSalaries = await prisma.salary.findMany({
        take: 5,
        include: {
          employee: {
            include: {
              user: { select: { name: true } }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      updatedSalaries.forEach((salary, index) => {
        console.log(`${index + 1}. ${salary.employee.user.name}: ${formatCurrency(salary.totalSalary)}`);
      });
    }

  } catch (error) {
    console.error("❌ Error dalam update pembulatan gaji:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan update
updateExistingSalaryRounding();
