import { NextResponse } from 'next/server';
import { getEmployeeByEmployeeId } from '@/lib/db/employee.service';
import { getTodayAttendanceByEmployeeId } from '@/lib/db/attendance.service';

export async function GET() {
  try {
    // Simulasi data employee berdasarkan employee ID
    // Pastikan ID ini benar-benar ada di database
    const employeeId = "EMP001"; // ID karyawan yang digunakan untuk pengujian

    console.log(`Mencoba mendapatkan data karyawan dengan ID: ${employeeId}`);
    const employee = await getEmployeeByEmployeeId(employeeId);

    if (!employee) {
      console.error(`Karyawan dengan ID ${employeeId} tidak ditemukan`);
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