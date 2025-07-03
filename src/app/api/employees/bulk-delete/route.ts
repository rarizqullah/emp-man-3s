import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Enhanced connection check
async function ensureDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    // Try reconnect
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (reconnectError) {
      console.error('Database reconnection failed:', reconnectError);
      return false;
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🗑️ Starting bulk delete operation...');

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON in request body',
          errorType: 'validation',
          retryable: false
        },
        { status: 400 }
      );
    }

    const { employeeIds, reason, confirmPassword } = body;

    // Input validation
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'employeeIds harus berupa array yang tidak kosong',
          errorType: 'validation',
          retryable: false
        },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Alasan penghapusan diperlukan',
          errorType: 'validation',
          retryable: false
        },
        { status: 400 }
      );
    }

    if (!confirmPassword || confirmPassword !== 'DELETE_PERMANENT') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Konfirmasi password tidak valid. Ketik "DELETE_PERMANENT"',
          errorType: 'validation',
          retryable: false
        },
        { status: 400 }
      );
    }

    console.log(`Attempting to permanently delete ${employeeIds.length} employees:`, employeeIds);

    // Ensure database connection
    const connectionCheck = await ensureDatabaseConnection();
    if (!connectionCheck) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Koneksi database bermasalah',
          errorType: 'connection',
          retryable: true
        },
        { status: 503 }
      );
    }

    // Verify employees exist and get their data for validation
    const existingEmployees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds }
      },
      include: {
        user: { select: { name: true, email: true } },
        attendances: { select: { id: true } },
        salaries: { 
          where: { status: 'UNPAID' },
          select: { id: true, month: true, year: true }
        },
        employeeAllowances: { select: { id: true } }
      }
    });

    const foundIds = existingEmployees.map(emp => emp.id);
    const notFoundIds = employeeIds.filter(id => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Karyawan tidak ditemukan: ${notFoundIds.join(', ')}`,
          errorType: 'not_found',
          retryable: false,
          notFoundIds
        },
        { status: 404 }
      );
    }

    // Validate financial data
    const employeesWithUnpaidSalaries = existingEmployees.filter(emp => emp.salaries.length > 0);
    const employeesWithAllowances = existingEmployees.filter(emp => emp.employeeAllowances.length > 0);

    if (employeesWithUnpaidSalaries.length > 0) {
      const employeeNames = employeesWithUnpaidSalaries.map(emp => emp.user.name).join(', ');
      return NextResponse.json(
        { 
          success: false, 
          error: `Tidak dapat menghapus karyawan dengan gaji belum dibayar: ${employeeNames}. Selesaikan pembayaran gaji terlebih dahulu.`,
          errorType: 'salary_data',
          retryable: false,
          conflictEmployees: employeesWithUnpaidSalaries.map(emp => ({
            id: emp.id,
            name: emp.user.name,
            unpaidSalaries: emp.salaries.length
          }))
        },
        { status: 409 }
      );
    }

    if (employeesWithAllowances.length > 0) {
      const employeeNames = employeesWithAllowances.map(emp => emp.user.name).join(', ');
      return NextResponse.json(
        { 
          success: false, 
          error: `Tidak dapat menghapus karyawan dengan data tunjangan aktif: ${employeeNames}. Hapus data tunjangan terlebih dahulu.`,
          errorType: 'allowance_data',
          retryable: false,
          conflictEmployees: employeesWithAllowances.map(emp => ({
            id: emp.id,
            name: emp.user.name,
            allowances: emp.employeeAllowances.length
          }))
        },
        { status: 409 }
      );
    }

    // PERMANENT DELETE - CASCADE DELETE ALL RELATED DATA
    const results = { success: [], failed: [] };

    for (const employeeId of employeeIds) {
      try {
        await prisma.$transaction(async (tx) => {
          // Delete in proper order to handle foreign key constraints
          
          // 1. Delete attendance records
          await tx.attendance.deleteMany({
            where: { employeeId }
          });

          // 2. Delete employee allowances
          await tx.employeeAllowance.deleteMany({
            where: { employeeId }
          });

          // 3. Delete salary records (only if PAID)
          await tx.salary.deleteMany({
            where: { 
              employeeId,
              status: 'PAID' // Only delete paid salaries
            }
          });

          // 4. Delete history records
          await tx.contractHistory.deleteMany({
            where: { employeeId }
          });

          await tx.shiftHistory.deleteMany({
            where: { employeeId }
          });

          await tx.warningHistory.deleteMany({
            where: { employeeId }
          });

          // 5. Delete permissions
          await tx.permission.deleteMany({
            where: { employeeId }
          });

          // 6. Get user ID before deleting employee
          const employee = await tx.employee.findUnique({
            where: { id: employeeId },
            select: { userId: true }
          });

          // 7. Delete employee record
          await tx.employee.delete({
            where: { id: employeeId }
          });

          // 8. Delete user record if exists
          if (employee?.userId) {
            await tx.user.delete({
              where: { id: employee.userId }
            });
          }
        });

        results.success.push(employeeId);
        console.log(`✅ Successfully deleted employee: ${employeeId}`);
        
      } catch (error) {
        console.error(`❌ Failed to delete employee ${employeeId}:`, error);
        results.failed.push({
          employeeId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`🗑️ Bulk delete completed in ${executionTime}ms`);
    console.log(`Successfully deleted ${results.success.length} employees`);
    
    if (results.failed.length > 0) {
      console.log(`Failed to delete ${results.failed.length} employees`);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus ${results.success.length} karyawan secara permanen`,
      details: {
        successCount: results.success.length,
        failedCount: results.failed.length,
        successIds: results.success,
        failed: results.failed,
        executionTime
      }
    });

  } catch (error) {
    console.error('❌ Bulk delete error:', error);
    
    // Categorize errors
    let errorType = 'server';
    let retryable = true;
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (['P1017', 'P1008', 'P1001', 'P1002'].includes(error.code)) {
        errorType = 'connection';
        statusCode = 503;
      } else if (error.code === 'P2025') {
        errorType = 'not_found';
        retryable = false;
        statusCode = 404;
      } else if (error.code.startsWith('P2')) {
        errorType = 'constraint';
        retryable = false;
        statusCode = 409;
      }
    }

    const executionTime = Date.now() - startTime;

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus karyawan',
        errorType,
        retryable,
        executionTime
      },
      { status: statusCode }
    );
  }
} 