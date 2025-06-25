import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, isAfter, addMinutes } from 'date-fns';
import { calculateWorkHours, calculateAutoTimeRecord } from '@/lib/utils/attendance-calculator';

// Fungsi untuk menentukan status presensi berdasarkan jam kerja dan validasi
function determineAttendanceStatus(attendance: any, shift: any) {
  if (!attendance.checkInTime) {
    return 'Tidak Hadir';
  }

  const now = new Date();
  const today = startOfDay(now);
  
  // Jika tidak ada shift end time, gunakan status lama
  if (!shift?.mainWorkEnd) {
    return attendance.checkOutTime ? 'Selesai' : 'Sedang Berlangsung';
  }

  // Buat waktu akhir shift hari ini
  const shiftEndTime = new Date(today);
  shiftEndTime.setHours(
    shift.mainWorkEnd.getHours(),
    shift.mainWorkEnd.getMinutes(),
    0,
    0
  );

  // Cek apakah sudah check-out terlebih dahulu
  if (attendance.checkOutTime) {
    // Sudah check-out, semua dianggap divalidasi untuk sekarang
    return 'Divalidasi';
  }

  // Jika belum check-out, cek waktu jam kerja
  if (!isAfter(now, shiftEndTime)) {
    // Masih dalam jam kerja dan belum check-out
    return 'Sedang Berlangsung';
  } else {
    // Sudah melewati jam kerja tapi belum check-out
    return 'Belum Divalidasi';
  }
}

// Fungsi untuk melakukan auto cut-off dengan auto record
async function performAutoCutoff(attendance: any, shift: any) {
  if (!shift?.mainWorkEnd || attendance.checkOutTime) {
    return attendance; // Tidak perlu auto cut-off
  }

  const now = new Date();
  const today = startOfDay(now);
  
  const shiftEndTime = new Date(today);
  shiftEndTime.setHours(
    shift.mainWorkEnd.getHours(),
    shift.mainWorkEnd.getMinutes(),
    0,
    0
  );

  // Grace period 15 menit setelah shift berakhir
  const cutoffTime = addMinutes(shiftEndTime, 15);

  // Jika sudah melewati cut-off time dan belum check-out
  if (isAfter(now, cutoffTime) && !attendance.checkOutTime) {
    console.log(`Auto cut-off for employee ${attendance.employee.user.name} at shift end time`);
    
    const checkInTime = new Date(attendance.checkInTime);
    const checkOutTime = shiftEndTime; // Check-out di jam selesai shift
    
    // Calculate work hours and auto time record
    const workHours = calculateWorkHours(shift, checkInTime, checkOutTime);
    const autoTimeRecord = calculateAutoTimeRecord(shift, checkInTime, checkOutTime);
    
    console.log(`Auto cut-off with auto record:`, {
      workHours,
      autoTimeRecord,
      checkOutTime: checkOutTime.toISOString()
    });
    
    // Update attendance dengan auto cut-off dan auto record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: checkOutTime,
        mainWorkHours: workHours.mainWorkHours,
        regularOvertimeHours: workHours.regularOvertimeHours,
        weeklyOvertimeHours: workHours.weeklyOvertimeHours,
        // Auto record jam istirahat dan lembur
        breakStartTime: autoTimeRecord.breakStartTime,
        breakEndTime: autoTimeRecord.breakEndTime,
        overtimeStartTime: autoTimeRecord.overtimeStartTime,
        overtimeEndTime: autoTimeRecord.overtimeEndTime,
        isAutoCutOff: true // Mark sebagai auto cut-off
      }
    });

    return updatedAttendance;
  }

  return attendance;
}

export async function GET() {
  try {
    console.log('=== Today Attendance Public API Called ===');
    
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    // Ambil semua attendance hari ini
    const attendances = await prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            department: {
              select: {
                id: true,
                name: true
              }
            },
            shift: {
              select: {
                id: true,
                name: true,
                mainWorkStart: true,
                mainWorkEnd: true,
                lunchBreakStart: true,
                lunchBreakEnd: true,
                regularOvertimeStart: true,
                regularOvertimeEnd: true,
                weeklyOvertimeStart: true,
                weeklyOvertimeEnd: true
              }
            }
          }
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    console.log(`Found ${attendances.length} attendance records for today`);

    // Proses auto cut-off untuk setiap attendance
    const processedAttendances = [];
    for (const attendance of attendances) {
      const processedAttendance = await performAutoCutoff(attendance, attendance.employee.shift);
      processedAttendances.push(processedAttendance);
    }

    // Format data untuk response
    const formattedAttendances = processedAttendances.map(attendance => {
      // Tentukan apakah check-out tervalidasi (bukan auto cut-off)
      // Check-out dianggap tervalidasi jika:
      // 1. Ada checkOutTime
      // 2. checkOutTime bukan hasil auto cut-off (tidak sama dengan shiftEndTime)
      let hasValidatedCheckOut = false;
      if (attendance.checkOutTime && attendance.employee.shift?.mainWorkEnd) {
        const today = startOfDay(new Date());
        const shiftEndTime = new Date(today);
        shiftEndTime.setHours(
          attendance.employee.shift.mainWorkEnd.getHours(),
          attendance.employee.shift.mainWorkEnd.getMinutes(),
          0,
          0
        );
        
        // Jika checkOutTime tidak sama dengan shiftEndTime, berarti check-out manual
        hasValidatedCheckOut = attendance.checkOutTime.getTime() !== shiftEndTime.getTime();
      }
      
      const status = determineAttendanceStatus(attendance, attendance.employee.shift);

      return {
        id: attendance.id,
        employeeId: attendance.employee.employeeId,
        employeeName: attendance.employee.user.name,
        department: attendance.employee.department?.name || '-',
        shift: attendance.employee.shift?.name || '-',
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        
        // Kolom jam istirahat dan lembur yang sudah di-auto record
        breakStartTime: attendance.breakStartTime,
        breakEndTime: attendance.breakEndTime,
        overtimeStartTime: attendance.overtimeStartTime,
        overtimeEndTime: attendance.overtimeEndTime,
        
        mainWorkHours: attendance.mainWorkHours,
        overtimeHours: attendance.regularOvertimeHours,
        weeklyOvertimeHours: attendance.weeklyOvertimeHours,
        status: status, // Status baru yang dinamis
        
        // Info shift untuk keperluan frontend
        shiftEndTime: attendance.employee.shift?.mainWorkEnd,
        lunchBreakStart: attendance.employee.shift?.lunchBreakStart,
        lunchBreakEnd: attendance.employee.shift?.lunchBreakEnd,
        regularOvertimeStart: attendance.employee.shift?.regularOvertimeStart,
        regularOvertimeEnd: attendance.employee.shift?.regularOvertimeEnd
      };
    });

    // Hitung statistik
    const stats = {
      totalAttendances: processedAttendances.length,
      sedangBerlangsung: formattedAttendances.filter(a => a.status === 'Sedang Berlangsung').length,
      divalidasi: formattedAttendances.filter(a => a.status === 'Divalidasi').length,
      belumDivalidasi: formattedAttendances.filter(a => a.status === 'Belum Divalidasi').length,
      tidakHadir: formattedAttendances.filter(a => a.status === 'Tidak Hadir').length
    };

    return NextResponse.json({
      success: true,
      message: 'Data presensi hari ini berhasil diambil',
      attendances: formattedAttendances,
      stats: stats,
      processedAutoCutoff: processedAttendances.length - attendances.length // Jumlah yang di auto cut-off
    });
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat mengambil data presensi hari ini',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 