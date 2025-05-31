import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50;
    const employeeId = url.searchParams.get('employeeId');
    
    console.log(`[API] Mengambil daftar kehadiran dengan filter: startDate=${startDate}, endDate=${endDate}, limit=${limit}, employeeId=${employeeId}`);
    
    // Buat filter untuk query
    const filter: Prisma.AttendanceWhereInput = {};
    
    // Filter berdasarkan rentang tanggal
    if (startDate || endDate) {
      filter.attendanceDate = {};
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.attendanceDate.gte = start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.attendanceDate.lte = end;
      }
    }
    
    // Filter berdasarkan employeeId jika ada
    if (employeeId) {
      // Cari dulu ID karyawan berdasarkan employeeId
      const employee = await prisma.employee.findFirst({
        where: { employeeId }
      });
      
      if (employee) {
        filter.employeeId = employee.id;
      } else {
        // Jika karyawan tidak ditemukan, kembalikan array kosong
        return NextResponse.json({
          success: true,
          attendances: [],
          message: `Karyawan dengan ID ${employeeId} tidak ditemukan`
        });
      }
    }
    
    // Query untuk mendapatkan data absensi
    const attendances = await prisma.attendance.findMany({
      where: filter,
      take: limit,
      orderBy: {
        attendanceDate: 'desc'
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
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
        }
      }
    });
    
    console.log(`Ditemukan ${attendances.length} data kehadiran`);
    
    // Format data untuk respons
    const formattedAttendances = attendances.map(attendance => ({
      id: attendance.id,
      employeeId: attendance.employee.employeeId,
      employeeName: attendance.employee.user?.name || 'Unknown',
      departmentName: attendance.employee.department?.name || 'Unknown',
      shiftName: attendance.employee.shift?.name || 'Unknown',
      attendanceDate: attendance.attendanceDate.toISOString().split('T')[0],
      checkInTime: attendance.checkInTime.toISOString(),
      checkOutTime: attendance.checkOutTime ? attendance.checkOutTime.toISOString() : null,
      mainWorkHours: attendance.mainWorkHours,
      regularOvertimeHours: attendance.regularOvertimeHours,
      weeklyOvertimeHours: attendance.weeklyOvertimeHours,
      status: attendance.status
    }));
    
    return NextResponse.json({
      success: true,
      attendances: formattedAttendances
    });
  } catch (error) {
    console.error('[API] Error mengambil daftar kehadiran:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mengambil daftar kehadiran' },
      { status: 500 }
    );
  }
} 