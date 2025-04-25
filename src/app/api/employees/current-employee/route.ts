import { NextResponse } from 'next/server';
import { supabaseRouteHandler } from '@/lib/supabase/server';
import { getTodayAttendanceByEmployeeId } from '@/lib/db/attendance.service';
import { getEmployeeByUserId } from '@/lib/db/employee.service';

export async function GET() {
  try {
    // Validasi sesi user menggunakan Supabase auth
    const supabase = await supabaseRouteHandler();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Dapatkan data employee berdasarkan user ID dari session
    console.log(`Mencoba mendapatkan data karyawan dengan user ID: ${session.user.id}`);
    const employee = await getEmployeeByUserId(session.user.id);

    if (!employee) {
      console.error(`Karyawan dengan user ID ${session.user.id} tidak ditemukan`);
      return NextResponse.json(
        { success: false, message: 'Data karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log(`Berhasil mendapatkan data karyawan: ${employee.id}`);

    // Dapatkan data presensi hari ini untuk karyawan ini
    const todayAttendance = await getTodayAttendanceByEmployeeId(employee.id);
    console.log(`Data presensi hari ini: ${todayAttendance ? 'Ada' : 'Tidak ada'}`);

    // Format data employee untuk response
    const formattedEmployee = {
      id: employee.id,
      employeeId: employee.employeeId,
      user: {
        id: employee.user?.id || '',
        name: employee.user?.name || '',
        email: employee.user?.email || '',
      },
      department: {
        id: employee.department?.id || '',
        name: employee.department?.name || '',
      },
      subDepartment: employee.subDepartment ? {
        id: employee.subDepartment.id,
        name: employee.subDepartment.name,
      } : null,
      shift: employee.shift ? {
        id: employee.shift.id,
        name: employee.shift.name,
        type: employee.shift.shiftType,
      } : null,
      contractType: employee.contractType,
      contractStartDate: employee.contractStartDate,
      contractEndDate: employee.contractEndDate,
      warningStatus: employee.warningStatus,
      todayAttendance: todayAttendance ? {
        id: todayAttendance.id,
        checkInTime: todayAttendance.checkInTime,
        checkOutTime: todayAttendance.checkOutTime,
      } : null,
    };

    return NextResponse.json({
      success: true,
      message: 'Data karyawan berhasil didapatkan',
      employee: formattedEmployee,
    });
  } catch (error) {
    console.error('Error fetching current employee:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mengambil data karyawan' },
      { status: 500 }
    );
  }
} 