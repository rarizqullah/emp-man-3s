#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserRole() {
  try {
    console.log('🔍 Checking user roles in database...\n');
    
    // Check specific user: pejabatcina@gmail.com
    const pejabatcina = await prisma.user.findUnique({
      where: { email: 'pejabatcina@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            departmentId: true,
            department: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log('👤 pejabatcina@gmail.com:', JSON.stringify(pejabatcina, null, 2));

    if (pejabatcina && pejabatcina.role !== 'ADMIN') {
      console.log('\n⚠️  ISSUE FOUND: pejabatcina@gmail.com is not ADMIN!');
      console.log(`Current role: ${pejabatcina.role}`);
      
      // Fix the role
      const updated = await prisma.user.update({
        where: { email: 'pejabatcina@gmail.com' },
        data: { role: 'ADMIN' },
        select: { email: true, role: true }
      });
      
      console.log('✅ Fixed role for pejabatcina@gmail.com:', updated);
    } else if (pejabatcina) {
      console.log('✅ pejabatcina@gmail.com role is correct: ADMIN');
    } else {
      console.log('❌ pejabatcina@gmail.com not found in database');
    }

    // Check all users with their roles
    console.log('\n📊 All users in database:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employee: {
          select: {
            employeeId: true
          }
        }
      },
      orderBy: { email: 'asc' }
    });

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - Role: ${user.role} - Employee ID: ${user.employee?.employeeId || 'N/A'}`);
    });

    // Check for users with invalid or null roles
    const invalidRoles = allUsers.filter(user => 
      !user.role || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role)
    );

    if (invalidRoles.length > 0) {
      console.log('\n⚠️  Users with invalid roles:');
      invalidRoles.forEach(user => {
        console.log(`- ${user.email}: "${user.role}"`);
      });

      // Fix invalid roles
      for (const user of invalidRoles) {
        const defaultRole = user.email === 'pejabatcina@gmail.com' ? 'ADMIN' : 'EMPLOYEE';
        await prisma.user.update({
          where: { id: user.id },
          data: { role: defaultRole }
        });
        console.log(`✅ Fixed ${user.email} role to ${defaultRole}`);
      }
    } else {
      console.log('\n✅ All user roles are valid');
    }

    console.log('\n🔧 Database role check completed!');

  } catch (error) {
    console.error('❌ Error checking user roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();
