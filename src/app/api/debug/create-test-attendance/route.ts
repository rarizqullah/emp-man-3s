import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateAutoTimeRecord, calculateWorkHours } from '@/lib/utils/attendance-calculator';

export async function POST() {
  try {
    console.log('=== Create Test Attendance with Long Work Duration ===');

    // Find Rafi employee
    const employee = await prisma.employee.findFirst({
      where: {
        user: {
          name: "Rafi Risqullah Putra"
        }
      },
      include: {
        user: {
          select: { name: true }
        },
        shift: true
      }
    });

    if (!employee || !employee.shift) {
      return NextResponse.json({
        success: false,
        error: 'Employee or shift not found'
      }, { status: 404 });
    }

    // Delete existing attendance for today to avoid conflicts
    await prisma.attendance.deleteMany({
      where: {
        employeeId: employee.id,
        attendanceDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    });

    // Create test times with long work duration
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Simulate 8-hour work day: 08:00 - 16:00
    const checkInTime = new Date(today.getTime() + 8 * 60 * 60 * 1000);  // 08:00
    const checkOutTime = new Date(today.getTime() + 16 * 60 * 60 * 1000); // 16:00

    console.log('Creating attendance with:', {
      employeeName: employee.user.name,
      shift: employee.shift.name,
      checkInTime: checkInTime.toISOString(),
      checkOutTime: checkOutTime.toISOString(),
      workDuration: '8 hours'
    });

    // Calculate auto time record
    const autoTimeRecord = calculateAutoTimeRecord(employee.shift, checkInTime, checkOutTime);
    const workHours = calculateWorkHours(employee.shift, checkInTime, checkOutTime);

    console.log('Auto record result:', autoTimeRecord);

    // Create new attendance record
    const newAttendance = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        attendanceDate: today,
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        status: 'PRESENT',
        mainWorkHours: workHours.mainWorkHours,
        regularOvertimeHours: workHours.regularOvertimeHours,
        weeklyOvertimeHours: workHours.weeklyOvertimeHours,
        breakStartTime: autoTimeRecord.breakStartTime,
        breakEndTime: autoTimeRecord.breakEndTime,
        overtimeStartTime: autoTimeRecord.overtimeStartTime,
        overtimeEndTime: autoTimeRecord.overtimeEndTime
      }
    });

    console.log('✅ Test attendance created successfully');

    return NextResponse.json({
      success: true,
      message: 'Test attendance with long work duration created successfully',
      data: {
        attendanceId: newAttendance.id,
        employeeName: employee.user.name,
        shift: employee.shift.name,
        times: {
          checkInTime: checkInTime.toISOString(),
          checkOutTime: checkOutTime.toISOString(),
          workDuration: '8 hours'
        },
        breakTimes: {
          breakStartTime: autoTimeRecord.breakStartTime,
          breakEndTime: autoTimeRecord.breakEndTime
        },
        overtimeTimes: {
          overtimeStartTime: autoTimeRecord.overtimeStartTime,
          overtimeEndTime: autoTimeRecord.overtimeEndTime
        },
        workHours: workHours,
        autoRecordReason: autoTimeRecord.autoRecordReason
      }
    });

  } catch (error) {
    console.error('Error creating test attendance:', error);
    return NextResponse.json({
      success: false,
      error: 'Error creating test attendance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 