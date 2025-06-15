import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateWorkHours, validateAttendanceTime } from '@/lib/utils/attendance-calculator';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Check-out API Called ===');
    
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
    
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);
    
    // Find today's attendance record
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    if (!todayAttendance) {
      return NextResponse.json({
        success: false,
        error: 'No check-in record found for today'
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
        error: 'Karyawan sudah melakukan check-out hari ini',
        data: {
          existingCheckOut: todayAttendance.checkOutTime,
          attendanceId: todayAttendance.id
        }
      }, { status: 400 });
    }
    
    const checkOutTime = new Date();
    const checkInTime = new Date(todayAttendance.checkInTime);
    
    // Validate attendance time
    const validation = validateAttendanceTime(employee.shift, checkInTime, checkOutTime);
    
    if (!validation.isValid) {
      console.log(`Validation failed: ${validation.message}`);
      // Still allow check-out but log the validation issue
    }
    
    // Calculate work hours using the new calculator
    const workHours = calculateWorkHours(employee.shift, checkInTime, checkOutTime);
    
    const updatedAttendance = await prisma.attendance.update({
      where: { id: todayAttendance.id },
      data: {
        checkOutTime: checkOutTime,
        mainWorkHours: workHours.mainWorkHours,
        regularOvertimeHours: workHours.regularOvertimeHours,
        weeklyOvertimeHours: workHours.weeklyOvertimeHours
      }
    });
    
    console.log(`✅ Check-out successful for employee ${employee.user.name} at ${checkOutTime.toISOString()}`);
    console.log(`Work hours calculated:`, workHours);
    
    return NextResponse.json({
      success: true,
      message: `Check-out berhasil untuk ${employee.user.name}`,
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
        status: updatedAttendance.status,
        workHoursCalculation: workHours
      }
    });
    
  } catch (error) {
    console.error('Error during check-out:', error);
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan saat check-out',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 