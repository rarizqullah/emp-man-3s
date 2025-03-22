import { NextResponse } from 'next/server';
import { updateAttendance, getTodayAttendanceByEmployeeId } from '@/lib/db/attendance.service';
import { getEmployeeById } from '@/lib/db/employee.service';
import { calculateWorkHours } from '@/lib/utils/attendance-calculator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, message: 'ID karyawan diperlukan' },
        { status: 400 }
      );
    }

    // Verifikasi apakah karyawan ada
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Dapatkan presensi hari ini yang belum memiliki checkout
    const todayAttendance = await getTodayAttendanceByEmployeeId(employeeId);
    
    if (!todayAttendance) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada presensi masuk hari ini untuk karyawan ini' },
        { status: 404 }
      );
    }

    if (todayAttendance.checkOutTime) {
      return NextResponse.json(
        { success: false, message: 'Karyawan sudah melakukan presensi keluar hari ini' },
        { status: 400 }
      );
    }

    // Hitung jam kerja berdasarkan check-in dan check-out
    const checkOutTime = new Date();
    const { mainWorkHours, regularOvertimeHours, weeklyOvertimeHours } = calculateWorkHours(
      employee.shift,
      todayAttendance.checkInTime,
      checkOutTime
    );

    // Update presensi dengan waktu checkout dan jam kerja
    const updatedAttendance = await updateAttendance(todayAttendance.id, {
      checkOutTime: checkOutTime,
      mainWorkHours,
      regularOvertimeHours,
      weeklyOvertimeHours,
    });

    return NextResponse.json({
      success: true,
      message: 'Presensi keluar berhasil dicatat',
      data: {
        id: updatedAttendance.id,
        employeeId: updatedAttendance.employeeId,
        checkInTime: updatedAttendance.checkInTime,
        checkOutTime: updatedAttendance.checkOutTime,
        mainWorkHours: updatedAttendance.mainWorkHours,
        regularOvertimeHours: updatedAttendance.regularOvertimeHours,
        weeklyOvertimeHours: updatedAttendance.weeklyOvertimeHours,
        status: updatedAttendance.status,
      },
    });
  } catch (error) {
    console.error('Error processing check-out:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat memproses presensi keluar' },
      { status: 500 }
    );
  }
} 