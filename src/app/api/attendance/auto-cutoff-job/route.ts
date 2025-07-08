import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateWorkHours, calculateAutoTimeRecord } from '@/lib/utils/attendance-calculator';
import { SessionCheckoutManager } from '@/lib/utils/session-checkout-manager';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Enhanced Multi-Session Auto Cut-off Job Started ===');
    
    const cutoffTime = new Date();
    
    // Find all pending attendances (checked in but not checked out)
    const pendingAttendances = await prisma.attendance.findMany({
      where: {
        checkInTime: {
          not: null
        },
        checkOutTime: null,
        attendanceDate: {
          gte: startOfDay(new Date(cutoffTime.getTime() - 24 * 60 * 60 * 1000)), // Yesterday
          lte: endOfDay(cutoffTime)
        }
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true
              }
            },
            shift: true
          }
        }
      }
    });
    
    console.log(`Found ${pendingAttendances.length} pending attendances for auto cut-off`);
    
    const cutoffResults = [];
    
    for (const attendance of pendingAttendances) {
      try {
        if (!attendance.employee.shift || !attendance.checkInTime) {
          console.log(`Skipping attendance ${attendance.id}: missing shift or check-in time`);
          continue;
        }
        
        // GUNAKAN SESSION CHECKOUT MANAGER UNTUK AUTO CUT-OFF
        const multiSessionInfo = SessionCheckoutManager.determineCheckoutTime(
          attendance.employee.shift as any,
          cutoffTime,
          true // Force auto cut-off (manual override = true)
        );
        
        // Auto cut-off hanya jika tidak dalam sesi aktif atau grace period
        if (multiSessionInfo.currentSession || multiSessionInfo.currentGracePeriodSession) {
          console.log(`Skipping auto cut-off for ${attendance.employee.user.name}: still in active session or grace period`);
          continue;
        }
        
        const checkInTime = new Date(attendance.checkInTime);
        const finalCheckOutTime = multiSessionInfo.checkoutDecision.checkoutTime;
        const isLateCheckout = multiSessionInfo.checkoutDecision.isLateCheckout;
        const lateCheckoutLabel = multiSessionInfo.checkoutDecision.lateCheckoutLabel;
        
        console.log(`Auto cut-off for ${attendance.employee.user.name}:`);
        console.log(`  Check-in: ${checkInTime.toISOString()}`);
        console.log(`  Cut-off time: ${finalCheckOutTime.toISOString()}`);
        console.log(`  Reason: ${multiSessionInfo.checkoutDecision.reason}`);
        console.log(`  Is Late Checkout: ${isLateCheckout}`);
        console.log(`  Late Checkout Label: ${lateCheckoutLabel || 'None'}`);
        
        // Calculate work hours and auto time record
        const workHours = calculateWorkHours(
          attendance.employee.shift as any,
          checkInTime,
          finalCheckOutTime
        );
        
        const autoTimeRecord = calculateAutoTimeRecord(
          attendance.employee.shift as any,
          checkInTime,
          finalCheckOutTime
        );
        
        // Prepare auto cut-off reason dengan informasi late checkout
        let autoCutOffReason = `Multi-session auto cut-off: ${multiSessionInfo.checkoutDecision.reason} at ${cutoffTime.toISOString()}`;
        if (isLateCheckout && lateCheckoutLabel) {
          autoCutOffReason += ` (${lateCheckoutLabel})`;
        }
        
        // Update attendance record
        const updatedAttendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            checkOutTime: finalCheckOutTime,
            mainWorkHours: workHours.mainWorkHours,
            regularOvertimeHours: workHours.regularOvertimeHours,
            weeklyOvertimeHours: workHours.weeklyOvertimeHours,
            breakStartTime: autoTimeRecord.breakStartTime,
            breakEndTime: autoTimeRecord.breakEndTime,
            overtimeStartTime: autoTimeRecord.overtimeStartTime,
            overtimeEndTime: autoTimeRecord.overtimeEndTime,
            isAutoCutOff: true,
            isCheckOutValidated: false, // Auto cut-off tidak tervalidasi
            autoCutOffReason
          }
        });
        
        cutoffResults.push({
          attendanceId: attendance.id,
          employeeName: attendance.employee.user.name,
          checkInTime: checkInTime,
          checkOutTime: finalCheckOutTime,
          mainWorkHours: workHours.mainWorkHours,
          regularOvertimeHours: workHours.regularOvertimeHours,
          sessionType: multiSessionInfo.checkoutDecision.sessionType,
          reason: multiSessionInfo.checkoutDecision.reason,
          isLateCheckout: isLateCheckout,
          lateCheckoutLabel: lateCheckoutLabel,
          useActualTime: multiSessionInfo.checkoutDecision.useActualTime
        });
        
        console.log(`✅ Auto cut-off successful for ${attendance.employee.user.name}`);
        if (isLateCheckout) {
          console.log(`⚠️ Late checkout detected: ${lateCheckoutLabel}`);
        }
        
      } catch (error) {
        console.error(`Error during auto cut-off for attendance ${attendance.id}:`, error);
        cutoffResults.push({
          attendanceId: attendance.id,
          employeeName: attendance.employee.user.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`✅ Enhanced multi-session auto cut-off job completed`);
    console.log(`Processed: ${cutoffResults.length} attendances`);
    
    return NextResponse.json({
      success: true,
      message: `Auto cut-off job completed - processed ${cutoffResults.length} attendances`,
      data: {
        cutoffTime: cutoffTime,
        totalPending: pendingAttendances.length,
        totalProcessed: cutoffResults.length,
        results: cutoffResults
      }
    });
    
  } catch (error) {
    console.error('Error in enhanced multi-session auto cut-off job:', error);
    return NextResponse.json({
      success: false,
      error: 'Auto cut-off job failed',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint untuk melihat status shift cycles dan pending cut-offs
export async function GET() {
  try {
    const now = new Date();
    
    // Ambil semua shift aktif
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

    // Ambil karyawan dengan attendance pending
    const employeesWithPendingAttendance = await prisma.employee.findMany({
      where: {
        shift: {
          mainWorkEnd: {
            not: null
          }
        }
      },
      include: {
        user: {
          select: {
            name: true
          }
        },
        shift: true,
        attendances: {
          where: {
            checkInTime: {
              not: null
            },
            checkOutTime: null
          },
          orderBy: {
            checkInTime: 'desc'
          },
          take: 1
        }
      }
    });

    // Analisis shift cycle untuk setiap karyawan
    const stats = {
      totalActiveShifts: allShifts.length,
      totalEmployeesWithPendingAttendance: employeesWithPendingAttendance.length,
      needsAutoCutoff: 0,
      inGracePeriod: 0,
      inActiveShift: 0
    };

    const employeeAnalysis = [];

    for (const employee of employeesWithPendingAttendance) {
      if (!employee.shift || !employee.attendances.length) continue;

      const attendance = employee.attendances[0];
      const checkInTime = new Date(attendance.checkInTime!);

      const cutOffDecision = SessionCheckoutManager.shouldAutoCutOff(
        employee.shift as any,
        checkInTime,
        now
      );

      const shiftCycleInfo = SessionCheckoutManager.determineCurrentShiftCycle([employee.shift] as any, now);

      employeeAnalysis.push({
        employeeName: employee.user.name,
        shiftName: employee.shift.name,
        checkInTime: checkInTime.toISOString(),
        shouldCutOff: cutOffDecision.shouldCutOff,
        cutOffReason: cutOffDecision.reason,
        isInGracePeriod: shiftCycleInfo.isInGracePeriod,
        isInActiveShift: shiftCycleInfo.isActiveShiftPeriod
      });

      if (cutOffDecision.shouldCutOff) {
        stats.needsAutoCutoff++;
      }
      
      if (shiftCycleInfo.isInGracePeriod) {
        stats.inGracePeriod++;
      }
      
      if (shiftCycleInfo.isActiveShiftPeriod) {
        stats.inActiveShift++;
      }
    }

    // Get current shift cycle info
    const currentShiftCycles = SessionCheckoutManager.getShiftCyclesForRange(
      allShifts as any,
      now,
      new Date(now.getTime() + 24 * 60 * 60 * 1000)
    );

    const debugInfo = SessionCheckoutManager.getDebugInfo(allShifts as any, now);

    return NextResponse.json({
      success: true,
      message: 'Enhanced shift cycle auto cut-off job status',
      timestamp: now.toISOString(),
      stats,
      employeeAnalysis,
      currentShiftCycles,
      nextJobRecommendation: stats.needsAutoCutoff > 0 ? 
        `Run auto cut-off job - ${stats.needsAutoCutoff} employees need cut-off` : 
        'No action needed',
      debugInfo
    });

  } catch (error) {
    console.error('Error getting enhanced shift cycle auto cut-off job status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mendapatkan status enhanced shift cycle auto cut-off job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 