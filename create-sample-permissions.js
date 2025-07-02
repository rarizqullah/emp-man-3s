// Script to create sample permission data for testing
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSamplePermissions() {
  try {
    console.log('🌱 Creating sample permission data...');

    // Get existing users
    const users = await prisma.user.findMany({
      include: {
        employee: true
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please run create-test-data.js first');
      return;
    }

    console.log(`Found ${users.length} users`);

    // Create various permission types for testing
    const permissionsData = [
      {
        userId: users[0].id,
        type: 'SICK',
        startDate: new Date('2025-07-05'),
        endDate: new Date('2025-07-05'),
        reason: 'Demam tinggi dan perlu istirahat',
        status: 'PENDING',
        otherDetails: 'Sudah konsultasi dengan dokter'
      },
      {
        userId: users[1].id,
        type: 'VACATION',
        startDate: new Date('2025-07-10'),
        endDate: new Date('2025-07-15'),
        reason: 'Liburan keluarga ke Bali',
        status: 'PENDING',
        otherDetails: 'Sudah booking hotel dan tiket pesawat'
      },
      {
        userId: users[0].id,
        type: 'PERSONAL',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-01'),
        reason: 'Mengurus dokumen penting di kantor catatan sipil',
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: users[2].id, // Mike Johnson as approver
        otherDetails: 'Sudah koordinasi dengan atasan'
      },
      {
        userId: users[1].id,
        type: 'OTHER',
        startDate: new Date('2025-06-28'),
        endDate: new Date('2025-06-28'),
        reason: 'Menghadiri seminar teknologi',
        status: 'REJECTED',
        approvedAt: new Date(),
        approvedById: users[2].id,
        rejectionReason: 'Jadwal seminar bertabrakan dengan deadline project penting',
        otherDetails: 'Seminar tentang AI dan Machine Learning'
      }
    ];

    // Create permissions
    for (const permissionData of permissionsData) {
      const permission = await prisma.permission.create({
        data: permissionData
      });
      console.log(`✅ Created permission: ${permission.type} for user ${permissionData.userId}`);
    }

    console.log('✅ Sample permission data created successfully!');
    console.log('📊 Created:');
    console.log(`   - ${permissionsData.length} permission requests`);
    console.log(`   - 1 PENDING sick leave`);
    console.log(`   - 1 PENDING vacation`);
    console.log(`   - 1 APPROVED personal leave`);
    console.log(`   - 1 REJECTED other leave`);
    
  } catch (error) {
    console.error('❌ Error creating sample permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSamplePermissions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
