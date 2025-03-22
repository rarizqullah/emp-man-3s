import { NextResponse } from 'next/server';
import { getTodayAttendances } from '@/lib/db/attendance.service';

export async function GET() {
  try {
    const attendances = await getTodayAttendances();

    // Format response untuk keperluan UI
    const formattedAttendances = attendances.map(attendance => ({
      id: attendance.id,
      employeeId: attendance.employee.employeeId,
      employeeName: attendance.employee.user.name,
      department: attendance.employee.department.name,
      shift: attendance.employee.shift.name,
      checkInTime: attendance.checkInTime.toISOString(),
      checkOutTime: attendance.checkOutTime ? attendance.checkOutTime.toISOString() : null,
      mainWorkHours: attendance.mainWorkHours,
      overtimeHours: attendance.regularOvertimeHours,
      weeklyOvertimeHours: attendance.weeklyOvertimeHours,
      status: attendance.checkOutTime ? 'Completed' : 'InProgress'
    }));

    return NextResponse.json({
      success: true,
      message: 'Data presensi hari ini berhasil didapatkan',
      attendances: formattedAttendances,
    });
  } catch (error) {
    console.error('Error fetching today attendances:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mengambil data presensi hari ini' },
      { status: 500 }
    );
  }
} 