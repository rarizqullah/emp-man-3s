import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestAllowances() {
  try {
    console.log('🚀 Creating test allowances...');
    
    // Buat beberapa data allowance test
    const allowances = [
      {
        name: 'Tunjangan Makan',
        description: 'Tunjangan untuk makan karyawan',
        applicableRule: 'Berlaku untuk semua karyawan',
        umkAmount: 5000000,
        companyPercentage: 50,
        employeePercentage: 50,
        companyAmount: 2500000,
        employeeAmount: 2500000,
        isActive: true
      },
      {
        name: 'Tunjangan Transport',
        description: 'Tunjangan transportasi harian',
        applicableRule: 'Berlaku untuk karyawan yang tidak memiliki kendaraan operasional',
        umkAmount: 5000000,
        companyPercentage: 30,
        employeePercentage: 70,
        companyAmount: 1500000,
        employeeAmount: 3500000,
        isActive: true
      },
      {
        name: 'Tunjangan Kesehatan',
        description: 'Tunjangan untuk kesehatan karyawan',
        applicableRule: 'Berlaku untuk semua karyawan tetap',
        umkAmount: 5000000,
        companyPercentage: 80,
        employeePercentage: 20,
        companyAmount: 4000000,
        employeeAmount: 1000000,
        isActive: true
      }
    ];

    for (const allowance of allowances) {
      const created = await prisma.allowance.create({
        data: allowance
      });
      console.log(`✅ Created allowance: ${created.name} (${created.id})`);
    }

    console.log('🎉 All test allowances created successfully!');
    
    // Tampilkan semua allowances yang ada
    const allAllowances = await prisma.allowance.findMany({
      where: { isActive: true }
    });
    console.log(`📊 Total active allowances: ${allAllowances.length}`);
    
  } catch (error) {
    console.error('❌ Error creating test allowances:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAllowances();
