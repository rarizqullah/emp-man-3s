import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAttendanceTime, detectLatenessAndCalculateRoundedTime, calculateAdjustedCheckInTime } from '@/lib/utils/attendance-calculator';
import { ShiftCycleManager } from '@/lib/utils/shift-cycle-manager';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Enhanced Shift Cycle Check-in API Called ===');
    
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
    
    // Gunakan ShiftCycleManager untuk validasi shift cycle
    const allShifts = await prisma.shift.findMany({
      where: {
        shiftType: {
          not: 'NON_SHIFT'
        },
        mainWorkEnd: {
          not: null
        }
      }
    });

    const shiftCycleInfo = ShiftCycleManager.determineCurrentShiftCycle(allShifts as any, actualCheckInTime);
    
    // Periksa apakah bisa check-in berdasarkan shift cycle
    if (!shiftCycleInfo.canCheckIn) {
      return NextResponse.json({
        success: false,
        error: 'Check-in tidak dapat dilakukan di luar periode shift yang diizinkan',
        shiftCycleInfo: {
          currentShift: shiftCycleInfo.currentShift?.name || 'Tidak ada shift aktif',
          nextShift: shiftCycleInfo.nextShift?.name || 'Tidak ada shift berikutnya',
          isInGracePeriod: shiftCycleInfo.isInGracePeriod,
          canCheckIn: shiftCycleInfo.canCheckIn
        }
      }, { status: 400 });
    }
    
    // Validate attendance time (backward compatibility)
    const validation = validateAttendanceTime(employee.shift as any, actualCheckInTime);
    
    if (!validation.isValid) {
      console.log(`Validation warning: ${validation.message}`);
      // Log but don't block - shift cycle validation takes precedence
    }

    // Hitung waktu check-in yang disesuaikan berdasarkan logika baru
    const adjustmentResult = calculateAdjustedCheckInTime(employee.shift as any, actualCheckInTime);
    const finalCheckInTime = adjustmentResult.adjustedCheckInTime;
    
    // Deteksi keterlambatan dengan logika baru
    const latenessInfo = detectLatenessAndCalculateRoundedTime(employee.shift as any, actualCheckInTime);
    
    // Cek existing attendance - gunakan range yang lebih fleksibel untuk shift cycle
    const lookbackDate = new Date(actualCheckInTime);
    lookbackDate.setDate(lookbackDate.getDate() - 1); // Look back 1 day untuk cross-day shifts
    
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        checkInTime: {
          gte: startOfDay(lookbackDate),
          lte: endOfDay(actualCheckInTime)
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });
    
    if (existingAttendance?.checkInTime) {
      return NextResponse.json({
        success: false,
        error: 'Karyawan sudah melakukan check-in dalam periode ini',
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
          status: 'PRESENT',
          // Update lateness info
          isLate: latenessInfo.isLate,
          minutesLate: latenessInfo.actualMinutesLate,
          roundedMinutesLate: latenessInfo.roundedMinutesLate,
          latenessMessage: latenessInfo.latenessMessage
        }
      });
    } else {
      // Create new attendance record dengan waktu yang sudah disesuaikan
      attendance = await prisma.attendance.create({
        data: {
          employeeId,
          attendanceDate: startOfDay(actualCheckInTime),
          checkInTime: finalCheckInTime, // Gunakan waktu yang sudah disesuaikan
          status: 'PRESENT',
          // Store lateness info
          isLate: latenessInfo.isLate,
          minutesLate: latenessInfo.actualMinutesLate,
          roundedMinutesLate: latenessInfo.roundedMinutesLate,
          latenessMessage: latenessInfo.latenessMessage
        }
      });
    }
    
    console.log(`✅ Enhanced shift cycle check-in successful for employee ${employee.user.name} at ${finalCheckInTime.toISOString()}`);
    
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
        // Informasi shift cycle
        shiftCycleInfo: {
          currentShift: shiftCycleInfo.currentShift?.name || 'Tidak ada shift aktif',
          nextShift: shiftCycleInfo.nextShift?.name || 'Tidak ada shift berikutnya',
          isInGracePeriod: shiftCycleInfo.isInGracePeriod,
          isActiveShiftPeriod: shiftCycleInfo.isActiveShiftPeriod,
          canCheckIn: shiftCycleInfo.canCheckIn,
          canCheckOut: shiftCycleInfo.canCheckOut
        },
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
    console.error('Error during enhanced shift cycle check-in:', error);
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan saat check-in',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 