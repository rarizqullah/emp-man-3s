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

    console.log(`Attempting to restore ${employeeIds.length} employees:`, employeeIds);

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
        user: {
          select: {
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
    const notFoundIds = employeeIds.filter(id => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      console.warn(`Some employee IDs not found in archive:`, notFoundIds);
    }

    // Restore employees (remove soft delete)
    const restoreResult = await prisma.employee.updateMany({
      where: {
        id: {
          in: foundIds
        },
        deletedAt: {
          not: null // Ensure we only restore archived employees
        }
      },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null
      }
    });

    console.log(`Successfully restored ${restoreResult.count} employees`);

    // Return success response with details
    return NextResponse.json({
      success: true,
      message: `${restoreResult.count} karyawan berhasil dipulihkan`,
      data: {
        restoredCount: restoreResult.count,
        requestedCount: employeeIds.length,
        restoredEmployees: archivedEmployees.map(emp => ({
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
    console.error('Error bulk restoring employees:', error);
    
    // Enhanced error handling
    const isConnectionError = (error as Error).message?.toLowerCase().includes('connection') ||
                            (error as Error).message?.toLowerCase().includes('timeout') ||
                            (error as Error).message?.toLowerCase().includes('p1017') ||
                            (error as Error).message?.toLowerCase().includes('p1008');
    
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal memulihkan karyawan dalam batch',
        details: (error as Error).message,
        retryable: isConnectionError,
        errorType: isConnectionError ? 'connection' : 'server'
      },
      { status: 500 }
    );
  }
}
