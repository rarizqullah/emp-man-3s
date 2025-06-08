import { NextResponse } from 'next/server';
import { supabaseRouteHandler } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { getTodayAttendanceByEmployeeId } from '@/lib/db/attendance.service';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';

export async function GET() {
  try {
    // Inisialisasi client Supabase menggunakan supabaseRouteHandler
    const supabase = await supabaseRouteHandler();

    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Dapatkan data user dari database
    const user = await prisma.user.findUnique({
      where: { authId: session.user.id },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    // Jika user adalah admin, ambil semua attendance hari ini
    if (user.role === 'ADMIN') {
      const attendances = await prisma.attendance.findMany({
        where: {
          createdAt: {
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
              department: true,
              position: true,
              shift: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

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

      return NextResponse.json({
        success: true,
        message: 'Data presensi hari ini berhasil diambil',
        attendances: formattedAttendances
      });
    }

    // Jika user bukan admin, cari data employee berdasarkan userId
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        department: true,
        position: true,
        shift: true
      }
    });

    if (!employee) {
      // Jika user belum terdaftar sebagai employee, return response kosong
      return NextResponse.json({
        success: true,
        message: 'User belum terdaftar sebagai karyawan',
        attendances: [],
        data: {
          employee: null,
          today: format(today, 'EEEE, d MMMM yyyy', { locale: id }),
          attendance: null
        }
      });
    }

    // Ambil data presensi hari ini untuk employee
    const todayAttendance = await getTodayAttendanceByEmployeeId(employee.id);
    const formattedDate = format(today, 'EEEE, d MMMM yyyy', { locale: id });

    // Format data response
    const response = {
      success: true,
      message: 'Data presensi hari ini berhasil diambil',
      data: {
        employee: {
          id: employee.id,
          name: employee.user.name,
          department: employee.department?.name,
          position: employee.position?.name,
          shift: employee.shift
        },
        today: formattedDate,
        attendance: todayAttendance || null
      },
      attendances: todayAttendance ? [{
        id: todayAttendance.id,
        employeeId: employee.id,
        employeeName: employee.user.name,
        department: employee.department?.name || '-',
        shift: employee.shift?.name || '-',
        checkInTime: todayAttendance.checkInTime,
        checkOutTime: todayAttendance.checkOutTime,
        mainWorkHours: todayAttendance.mainWorkHours,
        overtimeHours: todayAttendance.regularOvertimeHours,
        weeklyOvertimeHours: todayAttendance.weeklyOvertimeHours,
        status: todayAttendance.checkOutTime ? 'Completed' : 'InProgress'
      }] : []
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat mengambil data presensi hari ini' 
      }, 
      { status: 500 }
    );
  }
} 