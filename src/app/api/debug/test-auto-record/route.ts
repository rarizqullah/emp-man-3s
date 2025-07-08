import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateAutoTimeRecord } from '@/lib/utils/attendance-calculator';

export async function POST() {
  try {
    console.log('=== Debug Auto Record Test ===');
    
    // Get employee with shift data
    const employee = await prisma.employee.findFirst({
      where: {
        shift: {
          shiftType: {
            not: 'NON_SHIFT'
          }
        }
      },
      include: {
        user: {
          select: {
            name: true
          }
        },
        shift: true
      }
    });

    if (!employee || !employee.shift) {
      return NextResponse.json({
        success: false,
        error: 'No employee with valid shift found'
      }, { status: 404 });
    }

    // Simulate check-in and check-out times
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Simulate check-in at 07:00
    const checkInTime = new Date(today);
    checkInTime.setHours(7, 0, 0, 0);
    
    // Simulate check-out at 15:30 (with overtime)
    const checkOutTime = new Date(today);
    checkOutTime.setHours(15, 30, 0, 0);

    console.log('Employee:', employee.user.name);
    console.log('Shift:', employee.shift.name);
    console.log('Shift Config:', {
      mainWorkStart: employee.shift.mainWorkStart,
      mainWorkEnd: employee.shift.mainWorkEnd,
      lunchBreakStart: employee.shift.lunchBreakStart,
      lunchBreakEnd: employee.shift.lunchBreakEnd,
      regularOvertimeStart: employee.shift.regularOvertimeStart,
      regularOvertimeEnd: employee.shift.regularOvertimeEnd
    });
    console.log('Check-in Time:', checkInTime);
    console.log('Check-out Time:', checkOutTime);

    // Test the calculateAutoTimeRecord function
    const autoRecord = calculateAutoTimeRecord(employee.shift, checkInTime, checkOutTime);

    console.log('Auto Record Result:', autoRecord);

    return NextResponse.json({
      success: true,
      message: 'Auto record test completed',
      data: {
        employee: {
          id: employee.id,
          name: employee.user.name,
          shift: employee.shift.name
        },
        shiftConfig: {
          mainWorkStart: employee.shift.mainWorkStart,
          mainWorkEnd: employee.shift.mainWorkEnd,
          lunchBreakStart: employee.shift.lunchBreakStart,
          lunchBreakEnd: employee.shift.lunchBreakEnd,
          regularOvertimeStart: employee.shift.regularOvertimeStart,
          regularOvertimeEnd: employee.shift.regularOvertimeEnd
        },
        testTimes: {
          checkInTime,
          checkOutTime
        },
        autoRecordResult: autoRecord
      }
    });

  } catch (error) {
    console.error('Error testing auto record:', error);
    return NextResponse.json({
      success: false,
      error: 'Error testing auto record',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 