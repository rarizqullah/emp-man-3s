import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Check Status API Called ===');
    
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    
    if (!employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID is required'
      }, { status: 400 });
    }
    
    // Parse date or use today
    let targetDate: Date;
    if (date) {
      targetDate = new Date(date);
    } else {
      targetDate = new Date();
    }
    
    // Set date range for the target day
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
    
    // Find attendance record for the specified date
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employeeId,
        attendanceDate: {
          gte: startOfDay,
          lt: endOfDay
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
            department: {
              select: {
                name: true
              }
            },
            shift: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    if (!attendance) {
      return NextResponse.json({
        success: true,
        message: 'No attendance record found for this date',
        data: null
      });
    }
    
    // Calculate work hours if both check-in and check-out exist
    let workHours = null;
    if (attendance.checkInTime && attendance.checkOutTime) {
      const checkIn = new Date(attendance.checkInTime);
      const checkOut = new Date(attendance.checkOutTime);
      const workMilliseconds = checkOut.getTime() - checkIn.getTime();
      workHours = workMilliseconds / (1000 * 60 * 60); // Convert to hours
    }
    
    return NextResponse.json({
      success: true,
      message: 'Attendance status retrieved successfully',
      data: {
        attendanceId: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: attendance.employee.user.name,
        employeeCode: attendance.employee.employeeId,
        department: attendance.employee.department?.name,
        shift: attendance.employee.shift?.name,
        attendanceDate: attendance.attendanceDate,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        mainWorkHours: attendance.mainWorkHours,
        calculatedWorkHours: workHours ? Math.round(workHours * 100) / 100 : null,
        status: attendance.status,
        hasCheckedIn: !!attendance.checkInTime,
        hasCheckedOut: !!attendance.checkOutTime
      }
    });
    
  } catch (error) {
    console.error('Error checking attendance status:', error);
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan saat mengecek status attendance',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 