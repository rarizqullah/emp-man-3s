import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  try {
    console.log('=== Today Attendance Public API Called ===');
    
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    // Ambil semua attendance hari ini
    const attendances = await prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            department: {
              select: {
                id: true,
                name: true
              }
            },
            shift: {
              select: {
                id: true,
                name: true,
                mainWorkStart: true,
                mainWorkEnd: true,
                lunchBreakStart: true,
                lunchBreakEnd: true,
                regularOvertimeStart: true,
                regularOvertimeEnd: true,
                weeklyOvertimeStart: true,
                weeklyOvertimeEnd: true
              }
            }
          }
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    console.log(`Found ${attendances.length} attendance records for today`);

    // Format data untuk response
    const formattedAttendances = attendances.map(attendance => ({
      id: attendance.id,
      employeeId: attendance.employee.employeeId,
      employeeName: attendance.employee.user.name,
      department: attendance.employee.department?.name || '-',
      shift: attendance.employee.shift?.name || '-',
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      mainWorkHours: attendance.mainWorkHours,
      overtimeHours: attendance.regularOvertimeHours,
      weeklyOvertimeHours: attendance.weeklyOvertimeHours,
      status: attendance.checkOutTime ? 'Completed' : 'InProgress'
    }));

    return NextResponse.json({
      success: true,
      message: 'Data presensi hari ini berhasil diambil',
      attendances: formattedAttendances,
      stats: {
        totalAttendances: attendances.length,
        completed: attendances.filter(a => a.checkOutTime).length,
        inProgress: attendances.filter(a => !a.checkOutTime).length
      }
    });
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat mengambil data presensi hari ini',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 