import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAttendanceTime, isWithinShiftTime, detectLatenessAndCalculateRoundedTime, calculateAdjustedCheckInTime } from '@/lib/utils/attendance-calculator';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Check-in API Called ===');
    
    const { employeeId } = await request.json();
    
    if (!employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID is required'
      }, { status: 400 });
    }
    
    // Find employee with shift information
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        department: {
          select: {
            name: true
          }
        },
        shift: true
      }
    });
    
    if (!employee) {
      return NextResponse.json({
        success: false,
        error: 'Employee not found'
      }, { status: 404 });
    }
    
    if (!employee.shift) {
      return NextResponse.json({
        success: false,
        error: 'Employee shift configuration not found'
      }, { status: 400 });
    }
    
    const actualCheckInTime = new Date();
    
    // Validate if check-in is within acceptable shift time
    if (!isWithinShiftTime(employee.shift, actualCheckInTime)) {
      return NextResponse.json({
        success: false,
        error: 'Check-in dilakukan di luar jam shift yang diizinkan'
      }, { status: 400 });
    }
    
    // Validate attendance time
    const validation = validateAttendanceTime(employee.shift, actualCheckInTime);
    
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: validation.message
      }, { status: 400 });
    }

    // Hitung waktu check-in yang disesuaikan berdasarkan logika baru
    const adjustmentResult = calculateAdjustedCheckInTime(employee.shift, actualCheckInTime);
    const finalCheckInTime = adjustmentResult.adjustedCheckInTime;
    
    // Deteksi keterlambatan dengan logika baru
    const latenessInfo = detectLatenessAndCalculateRoundedTime(employee.shift, actualCheckInTime);
    
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);
    
    // Check if already checked in today
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    if (existingAttendance?.checkInTime) {
      return NextResponse.json({
        success: false,
        error: 'Karyawan sudah melakukan check-in hari ini',
        data: {
          existingCheckIn: existingAttendance.checkInTime,
          attendanceId: existingAttendance.id
        }
      }, { status: 400 });
    }
    
    // Create or update attendance record dengan waktu yang disesuaikan
    let attendance;
    
    if (existingAttendance) {
      // Update existing record dengan waktu yang sudah disesuaikan
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkInTime: finalCheckInTime, // Gunakan waktu yang sudah disesuaikan
          status: 'PRESENT'
        }
      });
    } else {
      // Create new attendance record dengan waktu yang sudah disesuaikan
      attendance = await prisma.attendance.create({
        data: {
          employeeId,
          attendanceDate: startDate,
          checkInTime: finalCheckInTime, // Gunakan waktu yang sudah disesuaikan
          status: 'PRESENT'
        }
      });
    }
    
    console.log(`✅ Check-in successful for employee ${employee.user.name} at ${finalCheckInTime.toISOString()}`);
    
    // Siapkan pesan response dengan informasi penyesuaian waktu
    let responseMessage = `Check-in berhasil untuk ${employee.user.name}`;
    let adjustmentNotification = '';
    
    if (adjustmentResult.isAdjusted) {
      adjustmentNotification = adjustmentResult.adjustmentReason;
      responseMessage += ` - ${adjustmentNotification}`;
      console.log(`⏰ Time adjustment: ${adjustmentResult.adjustmentReason}`);
    }
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: {
        attendanceId: attendance.id,
        employeeId: employee.id,
        employeeName: employee.user.name,
        employeeCode: employee.employeeId,
        department: employee.department?.name,
        shift: employee.shift?.name,
        actualCheckInTime: actualCheckInTime, // Waktu check-in sebenarnya
        recordedCheckInTime: attendance.checkInTime, // Waktu yang dicatat di sistem
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        validationMessage: validation.message,
        // Informasi penyesuaian waktu untuk frontend
        adjustmentInfo: {
          isAdjusted: adjustmentResult.isAdjusted,
          adjustmentReason: adjustmentResult.adjustmentReason,
          adjustmentMinutes: adjustmentResult.adjustmentMinutes,
          originalTime: adjustmentResult.originalTime
        },
        // Informasi keterlambatan untuk kompatibilitas dengan kode yang sudah ada
        latenessInfo: {
          isLate: latenessInfo.isLate,
          actualMinutesLate: latenessInfo.actualMinutesLate,
          roundedMinutesLate: latenessInfo.roundedMinutesLate,
          latenessMessage: latenessInfo.latenessMessage,
          isLateNotification: latenessInfo.isLate
        }
      }
    });
    
  } catch (error) {
    console.error('Error during check-in:', error);
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan saat check-in',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 