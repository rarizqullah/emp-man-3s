import { NextResponse } from 'next/server';
import { createAttendance } from '@/lib/db/attendance.service';
import { getEmployeeById } from '@/lib/db/employee.service';
import { AttendanceStatus } from '@prisma/client';

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

    // Periksa apakah karyawan sudah melakukan presensi hari ini
    // (Pada implementasi nyata, Anda akan memeriksa ini di database)
    
    // Contoh: Buat presensi baru
    const attendance = await createAttendance({
      employeeId: employeeId,
      checkInTime: new Date(),
      status: AttendanceStatus.PRESENT,
    });

    return NextResponse.json({
      success: true,
      message: 'Presensi masuk berhasil dicatat',
      data: {
        id: attendance.id,
        employeeId: attendance.employeeId,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat memproses presensi masuk' },
      { status: 500 }
    );
  }
} 