import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseConnection } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Ensure database connection
    const dbConnected = await ensureDatabaseConnection();
    if (!dbConnected) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Tidak dapat terhubung ke database',
          retryable: true,
          errorType: 'connection'
        },
        { status: 503 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Format data tidak valid',
          retryable: false,
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    const { employeeIds } = body;

    // Validate input
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID karyawan tidak valid atau kosong',
          retryable: false,
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    // Validate all IDs are strings
    if (!employeeIds.every(id => typeof id === 'string' && id.trim().length > 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Semua ID karyawan harus berupa string yang valid',
          retryable: false,
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    console.log(`Attempting to permanently delete ${employeeIds.length} employees:`, employeeIds);

    // Check if employees exist and are archived
    const archivedEmployees = await prisma.employee.findMany({
      where: {
        id: {
          in: employeeIds
        },
        deletedAt: {
          not: null // Only archived employees
        }
      },
      select: {
        id: true,
        employeeId: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (archivedEmployees.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak ada karyawan yang ditemukan di arsip atau semua karyawan sudah aktif',
          retryable: false,
          errorType: 'not_found'
        },
        { status: 404 }
      );
    }

    const foundIds = archivedEmployees.map(emp => emp.id);
    const userIds = archivedEmployees.map(emp => emp.userId);
    const notFoundIds = employeeIds.filter(id => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      console.warn(`Some employee IDs not found in archive:`, notFoundIds);
    }

    // Permanently delete employees and associated users in transaction
    const deleteResult = await prisma.$transaction(async (tx) => {
      // Delete employees first (handles cascade for related data)
      const deletedEmployees = await tx.employee.deleteMany({
        where: {
          id: {
            in: foundIds
          },
          deletedAt: {
            not: null // Ensure we only delete archived employees
          }
        }
      });

      // Delete associated users
      const deletedUsers = await tx.user.deleteMany({
        where: {
          id: {
            in: userIds
          }
        }
      });

      return {
        employeesDeleted: deletedEmployees.count,
        usersDeleted: deletedUsers.count
      };
    });

    console.log(`Successfully permanently deleted ${deleteResult.employeesDeleted} employees and ${deleteResult.usersDeleted} users`);

    // Return success response with details
    return NextResponse.json({
      success: true,
      message: `${deleteResult.employeesDeleted} karyawan berhasil dihapus permanen`,
      data: {
        deletedCount: deleteResult.employeesDeleted,
        requestedCount: employeeIds.length,
        deletedEmployees: archivedEmployees.map(emp => ({
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.user?.name || 'Unknown'
        })),
        ...(notFoundIds.length > 0 && {
          notFound: notFoundIds,
          notFoundMessage: `${notFoundIds.length} karyawan tidak ditemukan di arsip atau sudah aktif`
        })
      }
    });

  } catch (error) {
    console.error('Error bulk deleting employees permanently:', error);
    
    // Enhanced error handling
    const isConnectionError = (error as Error).message?.toLowerCase().includes('connection') ||
                            (error as Error).message?.toLowerCase().includes('timeout') ||
                            (error as Error).message?.toLowerCase().includes('p1017') ||
                            (error as Error).message?.toLowerCase().includes('p1008');

    const isConstraintError = (error as Error).message?.toLowerCase().includes('foreign key') ||
                            (error as Error).message?.toLowerCase().includes('constraint') ||
                            (error as Error).message?.toLowerCase().includes('reference');
    
    return NextResponse.json(
      {
        success: false,
        error: isConstraintError 
          ? 'Tidak dapat menghapus karyawan karena masih memiliki data terkait'
          : 'Gagal menghapus permanen karyawan dalam batch',
        details: (error as Error).message,
        retryable: isConnectionError && !isConstraintError,
        errorType: isConstraintError ? 'constraint' : (isConnectionError ? 'connection' : 'server')
      },
      { status: isConstraintError ? 409 : 500 }
    );
  }
}
