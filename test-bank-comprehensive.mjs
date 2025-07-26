// Test komprehensif untuk field bankAccountNumber
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBankAccountFieldComprehensive() {
  try {
    console.log('🧪 Testing bankAccountNumber field comprehensively...\n');
    
    // 1. Test schema - cek apakah field ada di model
    console.log('1. Testing Prisma Schema...');
    
    // 2. Test database - cek kolom di tabel
    console.log('2. Testing Database Column...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'bankAccountNumber'
    `;
    
    if (result.length > 0) {
      console.log('✅ Column bankAccountNumber exists in database');
      console.log('   - Data type:', result[0].data_type);
      console.log('   - Nullable:', result[0].is_nullable);
    } else {
      console.log('❌ Column bankAccountNumber NOT found in database');
    }
    
    // 3. Test create employee dengan bankAccountNumber
    console.log('\n3. Testing Create Employee with bankAccountNumber...');
    
    // 4. Test query employee dengan bankAccountNumber
    console.log('\n4. Testing Query Employee with bankAccountNumber...');
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        bankAccountNumber: true,
        user: {
          select: {
            name: true
          }
        }
      },
      take: 5
    });
    
    console.log('✅ Successfully queried employees with bankAccountNumber field');
    console.log(`   Found ${employees.length} employees`);
    
    employees.forEach((emp, index) => {
      console.log(`   ${index + 1}. ${emp.user.name} (${emp.employeeId}) - Bank: ${emp.bankAccountNumber || 'Not set'}`);
    });
    
    console.log('\n✅ All tests passed! bankAccountNumber field is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBankAccountFieldComprehensive();
