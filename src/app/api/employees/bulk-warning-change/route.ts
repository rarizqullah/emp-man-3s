import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseConnection } from '@/lib/db';
import { Prisma } from '@prisma/client';

interface BulkWarningResult {
  employeeId: string;
  employeeName: string;
  newStatus: string;
}

interface BulkWarningError {
  employeeId: string;
  employeeName: string;
  error: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('⚠️ Starting bulk warning status change operation...');

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

    const { employeeIds, warningStatus, startDate, endDate, reason } = body;

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

    const validWarningStatuses = ['NONE', 'SP1', 'SP2', 'SP3'];
    if (!warningStatus || !validWarningStatuses.includes(warningStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Status peringatan harus salah satu dari: ${validWarningStatuses.join(', ')}`,
          errorType: 'validation',
          retryable: false
        },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tanggal mulai diperlukan',
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
          error: 'Alasan perubahan status peringatan diperlukan',
          errorType: 'validation',
          retryable: false
        },
        { status: 400 }
      );
    }

    console.log(`Attempting to change warning status for ${employeeIds.length} employees to ${warningStatus}`);

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

    // Verify employees exist
    const existingEmployees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        deletedAt: null // Only active employees
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    const foundIds = existingEmployees.map((emp) => emp.id);
    const notFoundIds = employeeIds.filter(id => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Karyawan tidak ditemukan atau sudah diarsipkan: ${notFoundIds.join(', ')}`,
          errorType: 'not_found',
          retryable: false,
          notFoundIds
        },
        { status: 404 }
      );
    }

    // Process bulk warning status change
    const results: { success: BulkWarningResult[], failed: BulkWarningError[] } = { success: [], failed: [] };
    const startDateTime = new Date(startDate);
    const endDateTime = endDate ? new Date(endDate) : null;

    for (const employeeId of employeeIds) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update employee warning status
          await tx.employee.update({
            where: { id: employeeId },
            data: {
              warningStatus: warningStatus,
              updatedAt: new Date()
            }
          });

          // Create warning history record
          await tx.warningHistory.create({
            data: {
              employeeId: employeeId,
              warningStatus: warningStatus,
              startDate: startDateTime,
              endDate: endDateTime,
              reason: reason
            }
          });
        });

        results.success.push({
          employeeId,
          employeeName: existingEmployees.find((emp) => emp.id === employeeId)?.user.name || 'Unknown',
          newStatus: warningStatus
        });
        
        console.log(`✅ Successfully changed warning status for employee: ${employeeId}`);
        
      } catch (error) {
        console.error(`❌ Failed to change warning status for employee ${employeeId}:`, error);
        results.failed.push({
          employeeId,
          employeeName: existingEmployees.find((emp) => emp.id === employeeId)?.user.name || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`⚠️ Bulk warning status change completed in ${executionTime}ms`);
    console.log(`Successfully changed ${results.success.length} employee warning statuses`);
    
    if (results.failed.length > 0) {
      console.log(`Failed to change ${results.failed.length} employee warning statuses`);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengubah status peringatan ${results.success.length} karyawan ke ${warningStatus}`,
      details: {
        successCount: results.success.length,
        failedCount: results.failed.length,
        newWarningStatus: warningStatus,
        startDate: startDateTime,
        endDate: endDateTime,
        reason: reason,
        success: results.success,
        failed: results.failed,
        executionTime
      }
    });

  } catch (error) {
    console.error('❌ Bulk warning status change error:', error);
    
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
        error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengubah status peringatan',
        errorType,
        retryable,
        executionTime
      },
      { status: statusCode }
    );
  }
} 