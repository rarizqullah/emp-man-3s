import { NextRequest, NextResponse } from 'next/server';
import { supabaseRouteHandler } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest, props: { params: Promise<{ employeeId: string }> }) {
  const params = await props.params;
  try {
    // Validasi sesi user menggunakan Supabase auth
    const supabase = await supabaseRouteHandler();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Dapatkan data user dari database menggunakan authId
    const user = await prisma.user.findUnique({
      where: { authId: session.user.id }, // Gunakan authId bukan id
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Ambil parameter dari URL
    const { employeeId } = params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // Cari employee berdasarkan userId (parameter employeeId sebenarnya adalah userId)
    const employee = await prisma.employee.findFirst({
      where: { userId: employeeId },
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
      return NextResponse.json(
        { error: 'Data karyawan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Hanya admin atau employee itu sendiri yang bisa mengakses data
    const isAdmin = user.role === 'ADMIN';
    const isOwnData = employee.user.id === user.id;
    
    if (!isAdmin && !isOwnData) {
      return NextResponse.json(
        { error: 'Tidak memiliki akses untuk melihat data karyawan lain' },
        { status: 403 }
      );
    }

    // Jika ada parameter date, ambil attendance untuk tanggal tersebut
    if (date) {
      const targetDate = new Date(date);
      const startDate = startOfDay(targetDate);
      const endDate = endOfDay(targetDate);

      const attendance = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          attendanceDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Data attendance berhasil diambil',
        attendance: attendance ? {
          id: attendance.id,
          employeeId: employee.id,
          checkIn: attendance.checkInTime,
          checkOut: attendance.checkOutTime,
          mainWorkHours: attendance.mainWorkHours,
          overtimeHours: attendance.regularOvertimeHours,
          weeklyOvertimeHours: attendance.weeklyOvertimeHours,
          status: attendance.checkOutTime ? 'Completed' : 'InProgress'
        } : null
      });
    }
    
    // Format data response untuk informasi employee
    const formattedEmployee = {
      id: employee.id,
      name: employee.user.name,
      email: employee.user.email,
      department: employee.department?.name,
      position: employee.position?.name,
      shift: employee.shift,
      // Tambahkan informasi lain yang diperlukan
    };
    
    return NextResponse.json({
      success: true,
      message: 'Data karyawan berhasil diambil',
      data: formattedEmployee
    });
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data' },
      { status: 500 }
    );
  }
} 