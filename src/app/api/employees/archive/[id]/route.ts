import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseConnection } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const employeeId = params.id;

    // Validate employee ID
    if (!employeeId || typeof employeeId !== 'string' || employeeId.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID karyawan tidak valid',
          retryable: false,
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    console.log(`Attempting to restore employee with ID: ${employeeId}`);

    // Check if employee exists and is archived
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: {
          not: null
        }
      },
      select: {
        id: true,
        employeeId: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (!employee) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Karyawan tidak ditemukan atau tidak diarsipkan',
          retryable: false,
          errorType: 'not_found'
        },
        { status: 404 }
      );
    }

    // Restore employee (remove soft delete)
    const restoredEmployee = await prisma.employee.update({
      where: {
        id: employeeId
      },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null
      }
    });

    console.log(`Successfully restored employee: ${employee.user?.name} (${employee.employeeId})`);

    return NextResponse.json({
      success: true,
      message: `Karyawan ${employee.user?.name || 'Unknown'} berhasil dipulihkan`,
      data: {
        employee: {
          id: restoredEmployee.id,
          employeeId: employee.employeeId,
          name: employee.user?.name || 'Unknown'
        }
      }
    });
  } catch (error) {
    console.error('Error restoring employee:', error);
    
    // Enhanced error handling
    const isConnectionError = (error as Error).message?.toLowerCase().includes('connection') ||
                            (error as Error).message?.toLowerCase().includes('timeout') ||
                            (error as Error).message?.toLowerCase().includes('p1017') ||
                            (error as Error).message?.toLowerCase().includes('p1008');
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Gagal memulihkan karyawan',
        details: (error as Error).message,
        retryable: isConnectionError,
        errorType: isConnectionError ? 'connection' : 'server'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const employeeId = params.id;

    // Validate employee ID
    if (!employeeId || typeof employeeId !== 'string' || employeeId.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID karyawan tidak valid',
          retryable: false,
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    console.log(`Attempting to permanently delete employee with ID: ${employeeId}`);

    // Check if employee exists and is archived
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: {
          not: null
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

    if (!employee) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Karyawan tidak ditemukan atau tidak diarsipkan',
          retryable: false,
          errorType: 'not_found'
        },
        { status: 404 }
      );
    }

    // Permanently delete employee and associated user in transaction
    const deleteResult = await prisma.$transaction(async (tx) => {
      // Delete employee first (handles cascade for related data)
      await tx.employee.delete({
        where: { id: employeeId }
      });

      // Delete associated user
      await tx.user.delete({
        where: { id: employee.userId }
      });

      return { success: true };
    });

    console.log(`Successfully permanently deleted employee: ${employee.user?.name} (${employee.employeeId})`);

    return NextResponse.json({
      success: true,
      message: `Karyawan ${employee.user?.name || 'Unknown'} berhasil dihapus permanen`,
      data: {
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.user?.name || 'Unknown'
        }
      }
    });
  } catch (error) {
    console.error('Error permanently deleting employee:', error);
    
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
          : 'Gagal menghapus permanen karyawan',
        details: (error as Error).message,
        retryable: isConnectionError && !isConstraintError,
        errorType: isConstraintError ? 'constraint' : (isConnectionError ? 'connection' : 'server')
      },
      { status: isConstraintError ? 409 : 500 }
    );
  }
}
