// Simple script to create test data for testing the permission system
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🌱 Creating test data...');

    // Create test departments
    const department = await prisma.department.upsert({
      where: { name: 'IT Department' },
      update: {},
      create: {
        name: 'IT Department',
      },
    });

    const department2 = await prisma.department.upsert({
      where: { name: 'HR Department' },
      update: {},
      create: {
        name: 'HR Department',
      },
    });

    // Create test positions
    const position = await prisma.position.upsert({
      where: { name: 'Software Developer' },
      update: {},
      create: {
        name: 'Software Developer',
        description: 'Develops software applications',
        level: 3,
      },
    });

    const position2 = await prisma.position.upsert({
      where: { name: 'HR Manager' },
      update: {},
      create: {
        name: 'HR Manager',
        description: 'Manages human resources',
        level: 4,
      },
    });

    // Create test shifts
    const shift = await prisma.shift.upsert({
      where: { name: 'Regular Shift' },
      update: {},
      create: {
        name: 'Regular Shift',
        shiftType: 'NON_SHIFT',
        mainWorkStart: new Date('2024-01-01T08:00:00Z'),
        mainWorkEnd: new Date('2024-01-01T17:00:00Z'),
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      },
    });

    // Create test users
    const user1 = await prisma.user.upsert({
      where: { email: 'john.doe@example.com' },
      update: {},
      create: {
        email: 'john.doe@example.com',
        name: 'John Doe',
        authId: 'auth_john_doe_123',
        role: 'EMPLOYEE',
      },
    });

    const user2 = await prisma.user.upsert({
      where: { email: 'jane.smith@example.com' },
      update: {},
      create: {
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        authId: 'auth_jane_smith_456',
        role: 'EMPLOYEE',
      },
    });

    const user3 = await prisma.user.upsert({
      where: { email: 'mike.johnson@example.com' },
      update: {},
      create: {
        email: 'mike.johnson@example.com',
        name: 'Mike Johnson',
        authId: 'auth_mike_johnson_789',
        role: 'MANAGER',
      },
    });

    // Create test employees
    const employee1 = await prisma.employee.upsert({
      where: { employeeId: 'EMP001' },
      update: {},
      create: {
        employeeId: 'EMP001',
        userId: user1.id,
        departmentId: department.id,
        positionId: position.id,
        shiftId: shift.id,
        contractType: 'PERMANENT',
        contractStartDate: new Date('2023-01-01'),
        gender: 'MALE',
      },
    });

    const employee2 = await prisma.employee.upsert({
      where: { employeeId: 'EMP002' },
      update: {},
      create: {
        employeeId: 'EMP002',
        userId: user2.id,
        departmentId: department.id,
        positionId: position.id,
        shiftId: shift.id,
        contractType: 'PERMANENT',
        contractStartDate: new Date('2023-02-01'),
        gender: 'FEMALE',
      },
    });

    const employee3 = await prisma.employee.upsert({
      where: { employeeId: 'EMP003' },
      update: {},
      create: {
        employeeId: 'EMP003',
        userId: user3.id,
        departmentId: department2.id,
        positionId: position2.id,
        shiftId: shift.id,
        contractType: 'PERMANENT',
        contractStartDate: new Date('2022-01-01'),
        gender: 'MALE',
      },
    });

    console.log('✅ Test data created successfully!');
    console.log('📊 Created:');
    console.log(`   - ${3} users`);
    console.log(`   - ${3} employees`);
    console.log(`   - ${2} departments`);
    console.log(`   - ${2} positions`);
    console.log(`   - ${1} shift`);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
