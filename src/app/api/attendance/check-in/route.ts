import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AttendanceStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Check-In API Called ===');
    
    const body = await request.json();
    const { employeeId } = body;
    
    if (!employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID is required'
      }, { status: 400 });
    }
    
    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
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
    });
    
    if (!employee) {
      return NextResponse.json({
        success: false,
        error: 'Employee not found'
      }, { status: 404 });
    }
    
    // Check if already checked in today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employeeId,
        attendanceDate: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });
    
    if (existingAttendance) {
      return NextResponse.json({
        success: false,
        error: 'Karyawan sudah melakukan check-in hari ini',
        data: {
          existingCheckIn: existingAttendance.checkInTime,
          attendanceId: existingAttendance.id
        }
      }, { status: 400 });
    }
    
    // Create new attendance record
    const checkInTime = new Date();
    const attendance = await prisma.attendance.create({
      data: {
        employeeId: employeeId,
        attendanceDate: checkInTime,
        checkInTime: checkInTime,
        status: AttendanceStatus.PRESENT
      }
    });
    
    console.log(`✅ Check-in successful for employee ${employee.user.name} at ${checkInTime.toISOString()}`);
    
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
        checkInTime: attendance.checkInTime,
        status: attendance.status
      }
    });
    
  } catch (error) {
    console.error('Error in check-in:', error);
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan saat check-in',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 