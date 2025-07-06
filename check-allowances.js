const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllowances() {
  console.log('=== Semua Allowances (termasuk yang tidak aktif) ===');
  const allAllowances = await prisma.allowance.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(allAllowances, null, 2));

  console.log('\n=== Allowances Aktif Saja ===');
  const activeAllowances = await prisma.allowance.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(activeAllowances, null, 2));

  await prisma.$disconnect();
}

checkAllowances().catch(console.error);
