import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseConnection } from '@/lib/db';

export async function GET() {
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
    
    // Fetch archived employees with proper nested relations
    const archivedEmployees = await prisma.employee.findMany({
      where: {
        deletedAt: {
          not: null
        }
      },
      select: {
        id: true,
        employeeId: true,
        departmentId: true,
        subDepartmentId: true,
        positionId: true,
        shiftId: true,
        contractType: true,
        contractNumber: true,
        contractStartDate: true,
        contractEndDate: true,
        warningStatus: true,
        gender: true,
        address: true,
        deletedAt: true,
        deletedBy: true,
        deletionReason: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        subDepartment: {
          select: {
            id: true,
            name: true
          }
        },
        position: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        shift: {
          select: {
            id: true,
            name: true,
            shiftType: true
          }
        }
      },
      orderBy: {
        deletedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: archivedEmployees
    });
  } catch (error: unknown) {
    console.error('Error fetching archived employees:', error);
    
    // Enhanced error categorization
    const errorCode = (error as { code?: string })?.code;
    
    let responseError = {
      success: false,
      error: 'Gagal mengambil data arsip karyawan',
      retryable: false,
      errorType: 'unknown'
    };
    
    // Handle specific Prisma errors
    if (errorCode === 'P1017' || errorCode === 'P1008') {
      responseError = {
        success: false,
        error: 'Koneksi database terputus. Silakan coba lagi.',
        retryable: true,
        errorType: 'connection'
      };
    } else if (errorCode === 'P1001' || errorCode === 'P1002') {
      responseError = {
        success: false,
        error: 'Database sementara tidak tersedia. Silakan coba lagi.',
        retryable: true,
        errorType: 'timeout'
      };
    }
    
    return NextResponse.json(responseError, { 
      status: responseError.retryable ? 503 : 500 
    });
  }
}

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

    const { employeeIds, reason = 'Diarsipkan oleh sistem' } = body;

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

    console.log(`Attempting to archive ${employeeIds.length} employees:`, employeeIds);

    // Check if employees exist and are not already archived
    const existingEmployees = await prisma.employee.findMany({
      where: {
        id: {
          in: employeeIds
        },
        deletedAt: null // Only non-archived employees
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

    if (existingEmployees.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak ada karyawan yang ditemukan atau semua karyawan sudah diarsipkan',
          retryable: false,
          errorType: 'not_found'
        },
        { status: 404 }
      );
    }

    const foundIds = existingEmployees.map(emp => emp.id);
    const notFoundIds = employeeIds.filter(id => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      console.warn(`Some employee IDs not found or already archived:`, notFoundIds);
    }

    // Archive employees (soft delete)
    const archiveResult = await prisma.employee.updateMany({
      where: {
        id: {
          in: foundIds
        },
        deletedAt: null // Ensure we only archive non-archived employees
      },
      data: {
        deletedAt: new Date(),
        deletedBy: 'SYSTEM', // TODO: Get actual user from session
        deletionReason: reason
      }
    });

    console.log(`Successfully archived ${archiveResult.count} employees`);

    // Return success response with details
    return NextResponse.json({
      success: true,
      message: `${archiveResult.count} karyawan berhasil diarsipkan`,
      data: {
        archivedCount: archiveResult.count,
        requestedCount: employeeIds.length,
        archivedEmployees: existingEmployees.map(emp => ({
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.user?.name || 'Unknown'
        })),
        ...(notFoundIds.length > 0 && {
          notFound: notFoundIds,
          notFoundMessage: `${notFoundIds.length} karyawan tidak ditemukan atau sudah diarsipkan`
        })
      }
    });

  } catch (error: unknown) {
    console.error('Error archiving employees:', error);
    
    // Enhanced error categorization
    const errorCode = (error as { code?: string })?.code;
    const errorMessage = (error as { message?: string })?.message || String(error);
    
    let responseError = {
      success: false,
      error: 'Gagal mengarsipkan karyawan',
      retryable: false,
      errorType: 'unknown'
    };
    
    // Handle specific Prisma errors
    if (errorCode === 'P1017' || errorCode === 'P1008') {
      responseError = {
        success: false,
        error: 'Koneksi database terputus. Silakan coba lagi.',
        retryable: true,
        errorType: 'connection'
      };
    } else if (errorCode === 'P1001' || errorCode === 'P1002') {
      responseError = {
        success: false,
        error: 'Database timeout. Silakan coba lagi.',
        retryable: true,
        errorType: 'timeout'
      };
    } else if (errorCode === 'P2002') {
      responseError = {
        success: false,
        error: 'Terjadi konflik data. Karyawan mungkin sudah diarsipkan.',
        retryable: false,
        errorType: 'constraint'
      };
    } else if (errorMessage.includes('timeout')) {
      responseError = {
        success: false,
        error: 'Operasi membutuhkan waktu terlalu lama. Silakan coba lagi.',
        retryable: true,
        errorType: 'timeout'
      };
    }
    
    return NextResponse.json(responseError, { 
      status: responseError.retryable ? 503 : 500 
    });
  }
}
