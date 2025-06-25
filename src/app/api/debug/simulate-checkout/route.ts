import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateWorkHours, calculateAutoTimeRecord } from '@/lib/utils/attendance-calculator';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST() {
  try {
    console.log('=== Simulate Checkout for Testing ===');
    
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    // Find attendance records that have check-in but no break times recorded yet
    const attendancesToUpdate = await prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: startDate,
          lte: endDate
        },
        checkInTime: { not: null },
        checkOutTime: { not: null },
        breakStartTime: null // Only update those without break times
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

    console.log(`Found ${attendancesToUpdate.length} attendance records to update`);

    const updates = [];

    for (const attendance of attendancesToUpdate) {
      if (!attendance.employee.shift || !attendance.checkInTime || !attendance.checkOutTime) {
        console.log(`Skipping attendance ${attendance.id} - missing data`);
        continue;
      }

      const checkInTime = new Date(attendance.checkInTime);
      const checkOutTime = new Date(attendance.checkOutTime);

      // Calculate work hours and auto time record
      const workHours = calculateWorkHours(attendance.employee.shift, checkInTime, checkOutTime);
      const autoTimeRecord = calculateAutoTimeRecord(attendance.employee.shift, checkInTime, checkOutTime);

      // Update the attendance record
      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          mainWorkHours: workHours.mainWorkHours,
          regularOvertimeHours: workHours.regularOvertimeHours,
          weeklyOvertimeHours: workHours.weeklyOvertimeHours,
          breakStartTime: autoTimeRecord.breakStartTime,
          breakEndTime: autoTimeRecord.breakEndTime,
          overtimeStartTime: autoTimeRecord.overtimeStartTime,
          overtimeEndTime: autoTimeRecord.overtimeEndTime
        }
      });

      updates.push({
        employeeName: attendance.employee.user.name,
        attendanceId: attendance.id,
        breakStartTime: autoTimeRecord.breakStartTime,
        breakEndTime: autoTimeRecord.breakEndTime,
        overtimeStartTime: autoTimeRecord.overtimeStartTime,
        overtimeEndTime: autoTimeRecord.overtimeEndTime,
        autoRecordReason: autoTimeRecord.autoRecordReason
      });

      console.log(`Updated attendance for ${attendance.employee.user.name}:`, {
        breakStartTime: autoTimeRecord.breakStartTime,
        breakEndTime: autoTimeRecord.breakEndTime,
        overtimeStartTime: autoTimeRecord.overtimeStartTime,
        overtimeEndTime: autoTimeRecord.overtimeEndTime
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updates.length} attendance records with break and overtime times`,
      data: updates
    });

  } catch (error) {
    console.error('Error simulating checkout:', error);
    return NextResponse.json({
      success: false,
      error: 'Error simulating checkout',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 