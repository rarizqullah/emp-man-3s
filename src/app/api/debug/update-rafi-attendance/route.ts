import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateAutoTimeRecord } from '@/lib/utils/attendance-calculator';

export async function POST() {
  try {
    console.log('=== Update Rafi Attendance with Fixed Logic ===');

    // Find Rafi's attendance record for today
    const rafiAttendance = await prisma.attendance.findFirst({
      where: {
        employee: {
          user: {
            name: "Rafi Risqullah Putra"
          }
        },
        attendanceDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      include: {
        employee: {
          include: {
            user: {
              select: { name: true }
            },
            shift: true
          }
        }
      }
    });

    if (!rafiAttendance) {
      return NextResponse.json({
        success: false,
        error: 'Rafi attendance record not found for today'
      }, { status: 404 });
    }

    if (!rafiAttendance.employee.shift || !rafiAttendance.checkInTime || !rafiAttendance.checkOutTime) {
      return NextResponse.json({
        success: false,
        error: 'Missing shift or attendance time data'
      }, { status: 400 });
    }

    const checkInTime = new Date(rafiAttendance.checkInTime);
    const checkOutTime = new Date(rafiAttendance.checkOutTime);

    console.log('Current data:', {
      checkInTime: checkInTime.toISOString(),
      checkOutTime: checkOutTime.toISOString(),
      currentBreakStartTime: rafiAttendance.breakStartTime,
      currentBreakEndTime: rafiAttendance.breakEndTime,
      shift: rafiAttendance.employee.shift.name
    });

    // Recalculate auto time record with fixed logic
    const autoTimeRecord = calculateAutoTimeRecord(
      rafiAttendance.employee.shift, 
      checkInTime, 
      checkOutTime
    );

    console.log('New auto record result:', autoTimeRecord);

    // Update the attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: rafiAttendance.id },
      data: {
        breakStartTime: autoTimeRecord.breakStartTime,
        breakEndTime: autoTimeRecord.breakEndTime,
        overtimeStartTime: autoTimeRecord.overtimeStartTime,
        overtimeEndTime: autoTimeRecord.overtimeEndTime
      }
    });

    console.log('✅ Rafi attendance updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Rafi attendance updated successfully with fixed auto record logic',
      data: {
        attendanceId: updatedAttendance.id,
        employeeName: rafiAttendance.employee.user.name,
        shift: rafiAttendance.employee.shift.name,
        times: {
          checkInTime: checkInTime.toISOString(),
          checkOutTime: checkOutTime.toISOString()
        },
        previousBreakTimes: {
          breakStartTime: rafiAttendance.breakStartTime,
          breakEndTime: rafiAttendance.breakEndTime
        },
        newBreakTimes: {
          breakStartTime: autoTimeRecord.breakStartTime,
          breakEndTime: autoTimeRecord.breakEndTime
        },
        overtimeTimes: {
          overtimeStartTime: autoTimeRecord.overtimeStartTime,
          overtimeEndTime: autoTimeRecord.overtimeEndTime
        },
        autoRecordReason: autoTimeRecord.autoRecordReason
      }
    });

  } catch (error) {
    console.error('Error updating Rafi attendance:', error);
    return NextResponse.json({
      success: false,
      error: 'Error updating attendance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 