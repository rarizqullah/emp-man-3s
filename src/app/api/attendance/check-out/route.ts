import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Check-Out API Called ===');
    
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
    
    // Find today's attendance record
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employeeId,
        attendanceDate: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });
    
    if (!todayAttendance) {
      return NextResponse.json({
        success: false,
        error: 'Tidak ada record check-in untuk hari ini'
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
    
    // Update attendance record with check-out time
    const checkOutTime = new Date();
    
    // Calculate work hours
    const checkInTime = new Date(todayAttendance.checkInTime);
    const workMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
    const workHours = workMilliseconds / (1000 * 60 * 60); // Convert to hours
    
    const updatedAttendance = await prisma.attendance.update({
      where: { id: todayAttendance.id },
      data: {
        checkOutTime: checkOutTime,
        mainWorkHours: Math.round(workHours * 100) / 100 // Round to 2 decimal places
      }
    });
    
    console.log(`✅ Check-out successful for employee ${employee.user.name} at ${checkOutTime.toISOString()}`);
    console.log(`Work duration: ${workHours.toFixed(2)} hours`);
    
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
        status: updatedAttendance.status
      }
    });
    
  } catch (error) {
    console.error('Error in check-out:', error);
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan saat check-out',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 