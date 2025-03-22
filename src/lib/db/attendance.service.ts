import prisma from '@/lib/db/prisma';
import { AttendanceStatus } from '@prisma/client';
import { getEmployeesWithFaceData } from './employee.service';

export interface AttendanceCreateInput {
  employeeId: string;
  checkInTime: Date;
  status: AttendanceStatus;
}

export interface AttendanceUpdateInput {
  checkOutTime?: Date;
  mainWorkHours?: number;
  regularOvertimeHours?: number;
  weeklyOvertimeHours?: number;
  status?: AttendanceStatus;
}

// Mendapatkan semua data absensi
export async function getAllAttendances() {
  return prisma.attendance.findMany({
    include: {
      employee: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          department: true,
          shift: true,
        },
      },
    },
    orderBy: {
      attendanceDate: 'desc',
    },
  });
}

// Mendapatkan absensi berdasarkan ID
export async function getAttendanceById(id: string) {
  return prisma.attendance.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          department: true,
          shift: true,
        },
      },
    },
  });
}

// Mendapatkan absensi berdasarkan tanggal
export async function getAttendancesByDate(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          department: true,
          shift: true,
        },
      },
    },
    orderBy: {
      attendanceDate: 'desc',
    },
  });
}

// Mendapatkan absensi karyawan per periode
export async function getEmployeeAttendances(employeeId: string, startDate: Date, endDate: Date) {
  return prisma.attendance.findMany({
    where: {
      employeeId,
      attendanceDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      attendanceDate: 'desc',
    },
  });
}

// Membuat absensi baru (check-in)
export async function createAttendance(data: AttendanceCreateInput) {
  return prisma.attendance.create({
    data: {
      ...data,
      attendanceDate: new Date(), // Set tanggal absensi ke hari ini
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
          shift: true,
        },
      },
    },
  });
}

// Update absensi (check-out dan kalkulasi jam kerja)
export async function updateAttendance(id: string, data: AttendanceUpdateInput) {
  return prisma.attendance.update({
    where: { id },
    data,
    include: {
      employee: true,
    },
  });
}

// Menganalisis karyawan masuk berdasarkan face recognition descriptor
export async function recognizeEmployeeByFace(faceDescriptor: number[]) {
  // Dapatkan semua karyawan yang memiliki data wajah
  const employeesWithFaceData = await getEmployeesWithFaceData();

  // Saat ini hanya mengembalikan data untuk simulasi
  // Dalam implementasi sebenarnya, logika matching akan dilakukan client-side dengan face-api.js
  return {
    employeesWithFaceData,
    faceDescriptor,
  };
}

// Mendapatkan absensi hari ini untuk dashboard
export async function getTodayAttendances() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          department: true,
          shift: true,
        },
      },
    },
    orderBy: {
      checkInTime: 'desc',
    },
  });
}

// Mendapatkan jumlah karyawan berdasarkan status absensi hari ini
export async function getTodayAttendanceStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const totalEmployees = await prisma.employee.count();

  const presentCount = await prisma.attendance.count({
    where: {
      attendanceDate: {
        gte: today,
        lt: tomorrow,
      },
      status: 'PRESENT',
    },
  });

  const lateCount = await prisma.attendance.count({
    where: {
      attendanceDate: {
        gte: today,
        lt: tomorrow,
      },
      status: 'LATE',
    },
  });

  const permissionCount = await prisma.permission.count({
    where: {
      startDate: {
        lte: today,
      },
      endDate: {
        gte: today,
      },
      status: 'APPROVED',
    },
  });

  // Absen adalah total karyawan dikurangi yang hadir, terlambat, atau izin
  const absentCount = totalEmployees - (presentCount + lateCount + permissionCount);

  return {
    totalEmployees,
    presentToday: presentCount,
    lateToday: lateCount,
    onLeaveToday: permissionCount,
    absentToday: absentCount > 0 ? absentCount : 0,
  };
}

/**
 * Mendapatkan presensi karyawan hari ini
 */
export async function getTodayAttendanceByEmployeeId(employeeId: string) {
  // Buat tanggal awal dan akhir hari ini
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.attendance.findFirst({
    where: {
      employeeId,
      attendanceDate: {
        gte: today,
        lt: tomorrow,
      },
    },
  });
}

/**
 * Mengecek apakah karyawan sudah melakukan presensi masuk hari ini
 */
export async function hasCheckedInToday(employeeId: string): Promise<boolean> {
  const attendance = await getTodayAttendanceByEmployeeId(employeeId);
  return !!attendance;
}

/**
 * Mengecek apakah karyawan sudah melakukan presensi keluar hari ini
 */
export async function hasCheckedOutToday(employeeId: string): Promise<boolean> {
  const attendance = await getTodayAttendanceByEmployeeId(employeeId);
  return !!attendance && !!attendance.checkOutTime;
}

// Menghitung jam kerja dari check-in sampai check-out
export function calculateWorkingHours(
  checkInTime: Date,
  checkOutTime: Date,
  shiftConfig: {
    mainWorkStart: Date;
    mainWorkEnd: Date;
    lunchBreakStart?: Date | null;
    lunchBreakEnd?: Date | null;
    overtimeStart?: Date | null;
    overtimeEnd?: Date | null;
  }
) {
  // Fungsi untuk mendapatkan jam dari Date
  const getHours = (date: Date) => {
    return date.getHours() + date.getMinutes() / 60;
  };

  // Konversi waktu ke jam dalam format decimal
  const checkInHour = getHours(checkInTime);
  const checkOutHour = getHours(checkOutTime);

  const mainWorkStartHour = getHours(shiftConfig.mainWorkStart);
  const mainWorkEndHour = getHours(shiftConfig.mainWorkEnd);

  let lunchBreakStartHour = 0;
  let lunchBreakEndHour = 0;
  if (shiftConfig.lunchBreakStart && shiftConfig.lunchBreakEnd) {
    lunchBreakStartHour = getHours(shiftConfig.lunchBreakStart);
    lunchBreakEndHour = getHours(shiftConfig.lunchBreakEnd);
  }

  let overtimeStartHour = 0;
  let overtimeEndHour = 0;
  if (shiftConfig.overtimeStart && shiftConfig.overtimeEnd) {
    overtimeStartHour = getHours(shiftConfig.overtimeStart);
    overtimeEndHour = getHours(shiftConfig.overtimeEnd);
  }

  // Menghitung jam kerja pokok (mengurangi waktu istirahat)
  let mainWorkHours = 0;
  if (checkInHour <= mainWorkEndHour && checkOutHour >= mainWorkStartHour) {
    const effectiveStart = Math.max(checkInHour, mainWorkStartHour);
    const effectiveEnd = Math.min(checkOutHour, mainWorkEndHour);

    mainWorkHours = effectiveEnd - effectiveStart;

    // Kurangi waktu istirahat jika ada
    if (
      shiftConfig.lunchBreakStart &&
      shiftConfig.lunchBreakEnd &&
      effectiveStart <= lunchBreakEndHour &&
      effectiveEnd >= lunchBreakStartHour
    ) {
      const breakStart = Math.max(effectiveStart, lunchBreakStartHour);
      const breakEnd = Math.min(effectiveEnd, lunchBreakEndHour);

      // Jika waktu istirahat berada dalam rentang kerja
      if (breakEnd > breakStart) {
        mainWorkHours -= (breakEnd - breakStart);
      }
    }
  }

  // Menghitung jam lembur reguler
  let regularOvertimeHours = 0;
  if (
    shiftConfig.overtimeStart &&
    shiftConfig.overtimeEnd &&
    checkInHour <= overtimeEndHour &&
    checkOutHour >= overtimeStartHour
  ) {
    const overtimeEffectiveStart = Math.max(checkInHour, overtimeStartHour);
    const overtimeEffectiveEnd = Math.min(checkOutHour, overtimeEndHour);

    regularOvertimeHours = Math.max(0, overtimeEffectiveEnd - overtimeEffectiveStart);
  }

  return {
    mainWorkHours: Math.max(0, mainWorkHours),
    regularOvertimeHours,
    // Weekly overtime akan dihitung terpisah berdasarkan hari dan total jam kerja dalam seminggu
    weeklyOvertimeHours: 0,
  };
} 