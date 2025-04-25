import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { prisma } from '@/lib/db';
import { getTodayAttendanceByEmployeeId } from '@/lib/db/attendance.service';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export async function GET(request: NextRequest) {
  try {
    // Validasi sesi user menggunakan Supabase auth
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Dapatkan data user dari database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Ambil employeeId dari URL query parameter
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Parameter employeeId diperlukan' },
        { status: 400 }
      );
    }

    // Cek apakah user adalah admin atau karyawan itu sendiri
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
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
        { error: 'Tidak memiliki akses untuk melihat data presensi karyawan lain' },
        { status: 403 }
      );
    }

    // Ambil data presensi hari ini
    const todayAttendance = await getTodayAttendanceByEmployeeId(employeeId);
    const today = new Date();
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
      }
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