import { NextRequest } from 'next/server';
import { getTodayAttendanceByEmployeeId } from '@/lib/db/attendance.service';
import { getEmployeeByUserId } from '@/lib/db/employee.service';
import { requireAuth, ApiResponse } from '@/lib/auth/api-helpers';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    console.log(`Getting current employee data for user: ${user.email}`);
    
    // Dapatkan data employee berdasarkan user ID
    const employee = await getEmployeeByUserId(user.id);

    if (!employee) {
      console.error(`Employee with user ID ${user.id} not found`);
      return ApiResponse.notFound('Data karyawan tidak ditemukan');
    }

    console.log(`Employee data found: ${employee.id}`);

    // Dapatkan data presensi hari ini untuk karyawan ini
    const todayAttendance = await getTodayAttendanceByEmployeeId(employee.id);
    console.log(`Today's attendance: ${todayAttendance ? 'Found' : 'Not found'}`);

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
        id: employee.subDepartment?.id || '',
        name: employee.subDepartment?.name || '',
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

    return ApiResponse.success({
      employee: formattedEmployee,
    }, 'Data karyawan berhasil didapatkan');
    
  } catch (error) {
    console.error('Error fetching current employee:', error);
    return ApiResponse.error('Terjadi kesalahan saat mengambil data karyawan', 500);
  }
});
