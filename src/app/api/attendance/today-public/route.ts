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
          include: {
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
            position: {
              select: {
                id: true,
                name: true
              }
            },
            shift: {
              select: {
                id: true,
                name: true
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
      employeeId: attendance.employee.id,
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

    // Jika tidak ada data attendance hari ini, buat dummy data
    if (formattedAttendances.length === 0) {
      console.log('No attendance records found for today, creating sample data...');
      
      // Ambil beberapa karyawan untuk dummy data
      const employees = await prisma.employee.findMany({
        take: 3,
        include: {
          user: {
            select: {
              id: true,
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

      const dummyAttendances = employees.map((employee, index) => ({
        id: `dummy-${index}`,
        employeeId: employee.id,
        employeeName: employee.user.name,
        department: employee.department?.name || 'IT',
        shift: employee.shift?.name || 'Non-Shift',
        checkInTime: new Date(new Date().setHours(8 + index, 0, 0)).toISOString(),
        checkOutTime: index === 0 ? null : new Date(new Date().setHours(17 + index, 0, 0)).toISOString(),
        mainWorkHours: index === 0 ? null : 8,
        overtimeHours: index === 0 ? null : (index * 0.5),
        weeklyOvertimeHours: 0,
        status: index === 0 ? 'InProgress' : 'Completed'
      }));

      return NextResponse.json({
        success: true,
        message: 'Data presensi hari ini berhasil diambil (sample data)',
        attendances: dummyAttendances,
        testing: true,
        note: 'Ini adalah data sample karena belum ada attendance hari ini'
      });
    }

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