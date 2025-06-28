import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateWorkHours, validateAttendanceTime, calculateAutoTimeRecord } from '@/lib/utils/attendance-calculator';
import { SessionCheckoutManager } from '@/lib/utils/session-checkout-manager';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Enhanced Multi-Session Checkout API Called ===');
    
    const { employeeId, isOverrideAutoCutoff } = await request.json();
    
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
    
    const checkOutTime = new Date();
    
    // GUNAKAN SESSION CHECKOUT MANAGER YANG BARU
    const multiSessionInfo = SessionCheckoutManager.determineCheckoutTime(
      employee.shift as any,
      checkOutTime,
      isOverrideAutoCutoff || false
    );
    
    console.log('=== Multi-Session Debug Info ===');
    console.log(SessionCheckoutManager.getDebugInfo(employee.shift as any, checkOutTime));
    
    // Periksa apakah bisa check-out berdasarkan multi-session logic
    if (!multiSessionInfo.canCheckout && !isOverrideAutoCutoff) {
      return NextResponse.json({
        success: false,
        error: 'Check-out tidak dapat dilakukan di luar periode sesi aktif atau grace period',
        multiSessionInfo: {
          activeSessions: multiSessionInfo.activeSessions.map(s => ({
            name: s.name,
            type: s.type,
            startTime: s.startTime,
            endTime: s.endTime
          })),
          gracePeriodSessions: multiSessionInfo.gracePeriodSessions.map(s => ({
            name: s.name,
            type: s.type,
            gracePeriodStart: s.gracePeriodStart,
            gracePeriodEnd: s.gracePeriodEnd
          })),
          currentSession: multiSessionInfo.currentSession?.name || null,
          currentGracePeriodSession: multiSessionInfo.currentGracePeriodSession?.name || null,
          canCheckout: multiSessionInfo.canCheckout,
          reason: multiSessionInfo.checkoutDecision.reason
        },
        canOverride: true
      }, { status: 400 });
    }
    
    // Find today's attendance record - range lebih fleksibel untuk cross-day shifts
    const lookbackDate = new Date(checkOutTime);
    lookbackDate.setDate(lookbackDate.getDate() - 1);
    
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        checkInTime: {
          gte: startOfDay(lookbackDate),
          lte: endOfDay(checkOutTime)
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });
    
    if (!todayAttendance) {
      return NextResponse.json({
        success: false,
        error: 'No check-in record found for this shift cycle'
      }, { status: 400 });
    }
    
    if (!todayAttendance.checkInTime) {
      return NextResponse.json({
        success: false,
        error: 'Check-in time not found'
      }, { status: 400 });
    }
    
    if (todayAttendance.checkOutTime) {
      return NextResponse.json({
        success: false,
        error: 'Karyawan sudah melakukan check-out untuk shift cycle ini',
        data: {
          existingCheckOut: todayAttendance.checkOutTime,
          attendanceId: todayAttendance.id
        }
      }, { status: 400 });
    }
    
    const checkInTime = new Date(todayAttendance.checkInTime);
    
    // Validate attendance time (backward compatibility)
    const validation = validateAttendanceTime(employee.shift as any, checkInTime, checkOutTime);
    
    if (!validation.isValid) {
      console.log(`Validation warning: ${validation.message}`);
      // Log but don't block - multi-session validation takes precedence
    }
    
    // GUNAKAN KEPUTUSAN CHECKOUT DARI SESSION CHECKOUT MANAGER
    const finalCheckOutTime = multiSessionInfo.checkoutDecision.checkoutTime;
    const checkoutReason = multiSessionInfo.checkoutDecision.reason;
    const isManualOverride = isOverrideAutoCutoff || !multiSessionInfo.canCheckout;
    const isLateCheckout = multiSessionInfo.checkoutDecision.isLateCheckout;
    const lateCheckoutLabel = multiSessionInfo.checkoutDecision.lateCheckoutLabel;
    
    console.log(`=== Checkout Decision ===`);
    console.log(`Original checkout time: ${checkOutTime.toISOString()}`);
    console.log(`Final checkout time: ${finalCheckOutTime.toISOString()}`);
    console.log(`Reason: ${checkoutReason}`);
    console.log(`Session Type: ${multiSessionInfo.checkoutDecision.sessionType}`);
    console.log(`Is Grace Period: ${multiSessionInfo.checkoutDecision.isGracePeriod}`);
    console.log(`Is Active Session: ${multiSessionInfo.checkoutDecision.isActiveSession}`);
    console.log(`Is Late Checkout: ${isLateCheckout}`);
    console.log(`Late Checkout Label: ${lateCheckoutLabel || 'None'}`);
    console.log(`Use Actual Time: ${multiSessionInfo.checkoutDecision.useActualTime}`);
    
    // Calculate work hours using the final checkout time
    const workHours = calculateWorkHours(employee.shift as any, checkInTime, finalCheckOutTime);
    
    // Calculate auto time record untuk jam istirahat dan lembur
    const autoTimeRecord = calculateAutoTimeRecord(employee.shift as any, checkInTime, finalCheckOutTime);
    
    // Prepare auto cut-off reason dengan informasi late checkout
    let autoCutOffReason = '';
    if (isManualOverride && todayAttendance.isAutoCutOff) {
      autoCutOffReason = `${todayAttendance.autoCutOffReason} - Manual override at ${finalCheckOutTime.toISOString()}`;
      if (isLateCheckout && lateCheckoutLabel) {
        autoCutOffReason += ` (${lateCheckoutLabel})`;
      }
    } else if (isLateCheckout && lateCheckoutLabel) {
      autoCutOffReason = `Manual checkout - ${lateCheckoutLabel}`;
    }
    
    const updatedAttendance = await prisma.attendance.update({
      where: { id: todayAttendance.id },
      data: {
        checkOutTime: finalCheckOutTime,
        mainWorkHours: workHours.mainWorkHours,
        regularOvertimeHours: workHours.regularOvertimeHours,
        weeklyOvertimeHours: workHours.weeklyOvertimeHours,
        // Auto record jam istirahat dan lembur
        breakStartTime: autoTimeRecord.breakStartTime,
        breakEndTime: autoTimeRecord.breakEndTime,
        overtimeStartTime: autoTimeRecord.overtimeStartTime,
        overtimeEndTime: autoTimeRecord.overtimeEndTime,
        isAutoCutOff: false, // Mark sebagai manual check-out
        isCheckOutValidated: true,
        // Store checkout info dengan late checkout label
        ...(autoCutOffReason && {
          autoCutOffReason
        })
      }
    });
    
    console.log(`✅ Multi-session check-out successful for employee ${employee.user.name} at ${finalCheckOutTime.toISOString()}`);
    console.log(`Work hours calculated:`, workHours);
    console.log(`Auto time record:`, autoTimeRecord);
    if (isLateCheckout) {
      console.log(`⚠️ Late checkout detected: ${lateCheckoutLabel}`);
    }
    
    // Prepare success message dengan late checkout info
    let successMessage = `Check-out berhasil untuk ${employee.user.name}`;
    if (isManualOverride) {
      successMessage += ' (Manual Override)';
    }
    if (isLateCheckout && lateCheckoutLabel) {
      successMessage += ` - ${lateCheckoutLabel}`;
    }
    
    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        attendanceId: updatedAttendance.id,
        employeeId: employee.id,
        employeeName: employee.user.name,
        employeeCode: employee.employeeId,
        department: employee.department?.name,
        shift: employee.shift?.name,
        checkInTime: updatedAttendance.checkInTime,
        checkOutTime: updatedAttendance.checkOutTime,
        mainWorkHours: updatedAttendance.mainWorkHours,
        regularOvertimeHours: updatedAttendance.regularOvertimeHours,
        weeklyOvertimeHours: updatedAttendance.weeklyOvertimeHours,
        // Informasi auto record jam istirahat dan lembur
        breakStartTime: updatedAttendance.breakStartTime,
        breakEndTime: updatedAttendance.breakEndTime,
        overtimeStartTime: updatedAttendance.overtimeStartTime,
        overtimeEndTime: updatedAttendance.overtimeEndTime,
        status: updatedAttendance.status,
        // Enhanced multi-session info dengan late checkout
        multiSessionInfo: {
          activeSessions: multiSessionInfo.activeSessions.map(s => ({
            name: s.name,
            type: s.type,
            startTime: s.startTime,
            endTime: s.endTime,
            isActive: s.isActive
          })),
          gracePeriodSessions: multiSessionInfo.gracePeriodSessions.map(s => ({
            name: s.name,
            type: s.type,
            gracePeriodStart: s.gracePeriodStart,
            gracePeriodEnd: s.gracePeriodEnd,
            isInGracePeriod: s.isInGracePeriod
          })),
          currentSession: multiSessionInfo.currentSession?.name || null,
          currentGracePeriodSession: multiSessionInfo.currentGracePeriodSession?.name || null,
          canCheckout: multiSessionInfo.canCheckout,
          checkoutDecision: {
            originalTime: multiSessionInfo.checkoutDecision.originalTime,
            checkoutTime: multiSessionInfo.checkoutDecision.checkoutTime,
            sessionType: multiSessionInfo.checkoutDecision.sessionType,
            isGracePeriod: multiSessionInfo.checkoutDecision.isGracePeriod,
            isActiveSession: multiSessionInfo.checkoutDecision.isActiveSession,
            isLateCheckout: multiSessionInfo.checkoutDecision.isLateCheckout,
            lateCheckoutLabel: multiSessionInfo.checkoutDecision.lateCheckoutLabel,
            reason: multiSessionInfo.checkoutDecision.reason,
            useActualTime: multiSessionInfo.checkoutDecision.useActualTime
          },
          wasManualOverride: isManualOverride
        },
        workHoursCalculation: workHours,
        autoTimeRecordInfo: {
          hasAutoRecord: autoTimeRecord.autoRecordReason.length > 0,
          autoRecordReason: autoTimeRecord.autoRecordReason
        }
      }
    });
    
  } catch (error) {
    console.error('Error during multi-session check-out:', error);
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan saat check-out',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 