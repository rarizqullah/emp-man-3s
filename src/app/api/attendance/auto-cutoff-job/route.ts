import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, isAfter, addMinutes } from 'date-fns';

export async function POST() {
  try {
    console.log('=== Auto Cut-off Job Started ===');
    
    const now = new Date();
    const today = startOfDay(now);
    const endOfToday = endOfDay(now);

    // Ambil semua karyawan dengan shift yang memiliki mainWorkEnd
    const employeesWithShifts = await prisma.employee.findMany({
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
            attendanceDate: {
              gte: today,
              lte: endOfToday
            }
          }
        }
      }
    });

    console.log(`Found ${employeesWithShifts.length} employees with shifts to check`);

    const processedEmployees: string[] = [];
    const cutoffResults = [];

    for (const employee of employeesWithShifts) {
      if (!employee.shift?.mainWorkEnd) continue;

      // Buat waktu akhir shift hari ini
      const shiftEndTime = new Date(today);
      shiftEndTime.setHours(
        employee.shift.mainWorkEnd.getHours(),
        employee.shift.mainWorkEnd.getMinutes(),
        0,
        0
      );

      // Grace period 15 menit setelah shift berakhir
      const cutoffTime = addMinutes(shiftEndTime, 15);

      // Jika waktu saat ini sudah melewati cut-off time
      if (isAfter(now, cutoffTime)) {
        const todayAttendance = employee.attendances[0];

        // Case 1: Karyawan sudah check-in tapi belum check-out
        if (todayAttendance && todayAttendance.checkInTime && !todayAttendance.checkOutTime) {
          await prisma.attendance.update({
            where: { id: todayAttendance.id },
            data: {
              checkOutTime: shiftEndTime, // Set ke waktu shift berakhir
            }
          });

          processedEmployees.push(`${employee.user.name} - Auto check-out`);
          cutoffResults.push({
            employeeName: employee.user.name,
            shiftName: employee.shift.name,
            action: 'auto_checkout',
            shiftEndTime: shiftEndTime.toISOString(),
            reason: 'Karyawan tidak melakukan check-out manual'
          });

          console.log(`Auto check-out applied for: ${employee.user.name} at ${shiftEndTime.toISOString()}`);
        }
        
        // Case 2: Karyawan tidak hadir sama sekali
        else if (!todayAttendance) {
          await prisma.attendance.create({
            data: {
              employeeId: employee.id,
              attendanceDate: today,
              checkInTime: today, // Set ke awal hari untuk record keeping
              checkOutTime: null,
              status: 'ABSENT'
            }
          });

          processedEmployees.push(`${employee.user.name} - Marked absent`);
          cutoffResults.push({
            employeeName: employee.user.name,
            shiftName: employee.shift.name,
            action: 'marked_absent',
            shiftEndTime: shiftEndTime.toISOString(),
            reason: 'Tidak ada presensi sama sekali'
          });

          console.log(`Marked absent: ${employee.user.name}`);
        }
      }
    }

    console.log(`=== Auto Cut-off Job Completed: ${processedEmployees.length} employees processed ===`);

    return NextResponse.json({
      success: true,
      message: `Auto cut-off job selesai. ${processedEmployees.length} karyawan diproses`,
      timestamp: now.toISOString(),
      totalEmployeesChecked: employeesWithShifts.length,
      processedEmployees,
      details: cutoffResults
    });

  } catch (error) {
    console.error('Error dalam auto cut-off job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menjalankan auto cut-off job',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET endpoint untuk melihat status job
export async function GET() {
  try {
    const now = new Date();
    const today = startOfDay(now);
    
    // Ambil statistik karyawan hari ini
    const employeesWithShifts = await prisma.employee.findMany({
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
            attendanceDate: {
              gte: today,
              lte: endOfDay(now)
            }
          }
        }
      }
    });

    const stats = {
      totalEmployeesWithShifts: employeesWithShifts.length,
      hasAttendanceToday: employeesWithShifts.filter(emp => emp.attendances.length > 0).length,
      needsAutoCutoff: 0,
      alreadyCompletedToday: 0
    };

    // Hitung yang perlu auto cut-off
    for (const employee of employeesWithShifts) {
      if (!employee.shift?.mainWorkEnd) continue;

      const shiftEndTime = new Date(today);
      shiftEndTime.setHours(
        employee.shift.mainWorkEnd.getHours(),
        employee.shift.mainWorkEnd.getMinutes(),
        0,
        0
      );

      const cutoffTime = addMinutes(shiftEndTime, 15);
      const todayAttendance = employee.attendances[0];

      if (isAfter(now, cutoffTime)) {
        if (todayAttendance && todayAttendance.checkInTime && !todayAttendance.checkOutTime) {
          stats.needsAutoCutoff++;
        } else if (todayAttendance && todayAttendance.checkInTime && todayAttendance.checkOutTime) {
          stats.alreadyCompletedToday++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Status auto cut-off job',
      timestamp: now.toISOString(),
      stats,
      nextJobRecommendation: stats.needsAutoCutoff > 0 ? 'Run auto cut-off job' : 'No action needed'
    });

  } catch (error) {
    console.error('Error getting auto cut-off job status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mendapatkan status auto cut-off job'
      },
      { status: 500 }
    );
  }
} 