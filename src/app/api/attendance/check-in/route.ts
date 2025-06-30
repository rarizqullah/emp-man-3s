import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAttendanceTime, detectLatenessAndCalculateRoundedTime, calculateAdjustedCheckInTime } from '@/lib/utils/attendance-calculator';
import { ShiftCycleManager } from '@/lib/utils/shift-cycle-manager';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Enhanced Strict Shift Validation Check-in API Called ===');
    
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

    // ENHANCED: Skip validation for NON_SHIFT employees
    if (employee.shift.shiftType === 'NON_SHIFT') {
      return NextResponse.json({
        success: false,
        error: 'Karyawan NON_SHIFT tidak dapat melakukan presensi melalui sistem ini'
      }, { status: 400 });
    }
    
    const actualCheckInTime = new Date();
    
    // ENHANCED VALIDATION: Gunakan ShiftCycleManager untuk validasi strict
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
    
    // ENHANCED: Periksa apakah karyawan bisa check-in dengan validasi yang lebih ketat
    if (!shiftCycleInfo.canCheckIn) {
      let errorMessage = 'Check-in tidak diizinkan di luar jam shift yang ditentukan';
      
      if (shiftCycleInfo.currentShift) {
        errorMessage = `Presensi hanya diizinkan dalam jam kerja shift ${shiftCycleInfo.currentShift.name}`;
      } else if (shiftCycleInfo.nextShift) {
        errorMessage = `Shift berikutnya (${shiftCycleInfo.nextShift.name}) belum dimulai. Silakan kembali saat jam shift.`;
      } else {
        errorMessage = 'Tidak ada shift aktif saat ini. Presensi ditolak.';
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        shiftCycleInfo: {
          currentShift: shiftCycleInfo.currentShift?.name || 'Tidak ada shift aktif',
          nextShift: shiftCycleInfo.nextShift?.name || 'Tidak ada shift berikutnya',
          isInGracePeriod: shiftCycleInfo.isInGracePeriod,
          canCheckIn: shiftCycleInfo.canCheckIn,
          currentTime: actualCheckInTime.toISOString()
        }
      }, { status: 403 }); // 403 Forbidden untuk unauthorized time
    }

    // ENHANCED: Validasi tambahan untuk memastikan karyawan check-in di shift yang sesuai
    if (shiftCycleInfo.currentShift && employee.shift.shiftType !== shiftCycleInfo.currentShift.type) {
      return NextResponse.json({
        success: false,
        error: `Anda terdaftar di ${employee.shift.name} namun saat ini adalah periode ${shiftCycleInfo.currentShift.name}. Presensi ditolak.`
      }, { status: 403 });
    }
    
    // Validate attendance time (backward compatibility) - now just for logging
    const validation = validateAttendanceTime(employee.shift as any, actualCheckInTime);
    console.log(`Legacy validation: ${validation.message}`);

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
    
    // Create attendance record dengan waktu yang disesuaikan
    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        attendanceDate: startOfDay(actualCheckInTime),
        checkInTime: finalCheckInTime,
        status: 'PRESENT',
        // Store lateness info
        isLate: latenessInfo.isLate,
        minutesLate: latenessInfo.actualMinutesLate,
        roundedMinutesLate: latenessInfo.roundedMinutesLate,
        latenessMessage: latenessInfo.latenessMessage
      }
    });
    
    console.log(`✅ Enhanced strict validation check-in successful for employee ${employee.user.name} at ${finalCheckInTime.toISOString()}`);
    
    return NextResponse.json({
      success: true,
      message: `Check-in berhasil untuk ${employee.user.name}`,
      data: {
        attendanceId: attendance.id,
        employeeId: employee.id,
        employeeName: employee.user.name,
        employeeCode: employee.employeeId,
        department: employee.department?.name,
        shift: employee.shift?.name,
        actualCheckInTime: actualCheckInTime,
        recordedCheckInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        shiftCycleInfo: {
          currentShift: shiftCycleInfo.currentShift?.name || 'Tidak ada shift aktif',
          nextShift: shiftCycleInfo.nextShift?.name || 'Tidak ada shift berikutnya',
          isInGracePeriod: shiftCycleInfo.isInGracePeriod,
          isActiveShiftPeriod: shiftCycleInfo.isActiveShiftPeriod,
          canCheckIn: shiftCycleInfo.canCheckIn,
          canCheckOut: shiftCycleInfo.canCheckOut
        },
        latenessInfo: {
          isLate: latenessInfo.isLate,
          actualMinutesLate: latenessInfo.actualMinutesLate,
          roundedMinutesLate: latenessInfo.roundedMinutesLate,
          latenessMessage: latenessInfo.latenessMessage
        }
      }
    });
    
  } catch (error) {
    console.error('Error during enhanced check-in:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during check-in process'
    }, { status: 500 });
  }
} 