import { prisma } from '@/lib/db';
import { calculateWorkHours, calculateWeeklyOvertimeHours } from '@/lib/utils/attendance-calculator';
import { AttendanceStatus } from '@prisma/client';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
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

interface AttendanceWithEmployee {
  id: string;
  employeeId: string;
  attendanceDate: Date;
  checkInTime: Date;
  checkOutTime: Date | null;
  mainWorkHours: number | null;
  regularOvertimeHours: number | null;
  weeklyOvertimeHours: number | null;
  status: AttendanceStatus;
  employee: {
    id: string;
    employeeId: string;
    user: {
      name: string;
      email: string;
    };
    department: {
      id: string;
      name: string;
    } | null;
    shift: {
      id: string;
      name: string;
      mainWorkStart: Date;
      mainWorkEnd: Date;
      lunchBreakStart: Date | null;
      lunchBreakEnd: Date | null;
      regularOvertimeStart: Date | null;
      regularOvertimeEnd: Date | null;
      weeklyOvertimeStart: Date | null;
      weeklyOvertimeEnd: Date | null;
    } | null;
  };
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
export async function getAttendancesByDate(date: Date): Promise<AttendanceWithEmployee[]> {
  const startDate = startOfDay(date);
  const endDate = endOfDay(date);

  return prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: startDate,
        lte: endDate,
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
  }) as Promise<AttendanceWithEmployee[]>;
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
export async function createAttendance(
  employeeId: string,
  checkInTime: Date,
  checkOutTime?: Date
) {
  // Ambil data employee dengan shift
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      shift: true,
      user: { select: { name: true } }
    }
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  if (!employee.shift) {
    throw new Error('Employee shift configuration not found');
  }

  // Hitung jam kerja jika ada check-out
  let workHours = null;
  if (checkOutTime) {
    workHours = calculateWorkHours(employee.shift, checkInTime, checkOutTime);
  }

  const attendanceDate = startOfDay(checkInTime);

  const attendance = await prisma.attendance.create({
    data: {
      employeeId,
      attendanceDate,
      checkInTime,
      checkOutTime: checkOutTime || null,
      mainWorkHours: workHours?.mainWorkHours || null,
      regularOvertimeHours: workHours?.regularOvertimeHours || null,
      weeklyOvertimeHours: workHours?.weeklyOvertimeHours || null,
      status: 'PRESENT'
    }
  });

  console.log(`Attendance created for ${employee.user.name}:`, {
    checkInTime,
    checkOutTime,
    workHours
  });

  return attendance;
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
export async function getTodayAttendances(): Promise<AttendanceWithEmployee[]> {
  const today = new Date();
  const startDate = startOfDay(today);
  const endDate = endOfDay(today);

  return prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: startDate,
        lte: endDate,
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
  }) as Promise<AttendanceWithEmployee[]>;
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

// Update attendance record with check-out
export async function updateAttendanceCheckOut(
  attendanceId: string,
  checkOutTime: Date
) {
  // Ambil data attendance dengan employee dan shift
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      employee: {
        include: {
          shift: true,
          user: { select: { name: true } }
        }
      }
    }
  });

  if (!attendance) {
    throw new Error('Attendance record not found');
  }

  if (!attendance.employee.shift) {
    throw new Error('Employee shift configuration not found');
  }

  if (!attendance.checkInTime) {
    throw new Error('Check-in time not found');
  }

  // Hitung jam kerja
  const workHours = calculateWorkHours(
    attendance.employee.shift,
    attendance.checkInTime,
    checkOutTime
  );

  const updatedAttendance = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      checkOutTime,
      mainWorkHours: workHours.mainWorkHours,
      regularOvertimeHours: workHours.regularOvertimeHours,
      weeklyOvertimeHours: workHours.weeklyOvertimeHours
    }
  });

  console.log(`Check-out updated for ${attendance.employee.user.name}:`, {
    checkOutTime,
    workHours
  });

  return updatedAttendance;
}

// Menghitung dan update jam lembur mingguan untuk semua karyawan
export async function calculateAndUpdateWeeklyOvertimes(weekDate: Date = new Date()) {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 }); // Mulai dari Senin
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

  console.log(`Calculating weekly overtime for week: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`);

  // Ambil semua attendance dalam minggu ini
  const weeklyAttendances = await prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: weekStart,
        lte: weekEnd
      },
      checkOutTime: {
        not: null // Hanya yang sudah check-out
      }
    },
    include: {
      employee: {
        include: {
          user: { select: { name: true } }
        }
      }
    },
    orderBy: [
      { employeeId: 'asc' },
      { attendanceDate: 'asc' }
    ]
  });

  // Group by employee dengan proper typing
  const employeeAttendances = weeklyAttendances.reduce((acc: Record<string, typeof weeklyAttendances>, attendance) => {
    const employeeId = attendance.employeeId;
    if (!acc[employeeId]) {
      acc[employeeId] = [];
    }
    acc[employeeId].push(attendance);
    return acc;
  }, {});

  const updatePromises = [];

  // Calculate weekly overtime untuk setiap employee
  for (const [employeeId, attendances] of Object.entries(employeeAttendances)) {
    const weeklyData = attendances.map((att) => ({
      mainWorkHours: att.mainWorkHours || 0,
      regularOvertimeHours: att.regularOvertimeHours || 0
    }));

    const weeklyOvertimeHours = calculateWeeklyOvertimeHours(weeklyData);

    if (weeklyOvertimeHours > 0) {
      // Update semua attendance record untuk employee ini dalam minggu ini
      const updatePromise = prisma.attendance.updateMany({
        where: {
          employeeId,
          attendanceDate: {
            gte: weekStart,
            lte: weekEnd
          }
        },
        data: {
          weeklyOvertimeHours: weeklyOvertimeHours / attendances.length // Distribusi rata
        }
      });

      updatePromises.push(updatePromise);

      console.log(`Updated weekly overtime for ${attendances[0].employee.user.name}: ${weeklyOvertimeHours} hours`);
    }
  }

  // Execute all updates
  await Promise.all(updatePromises);

  console.log(`Weekly overtime calculation completed for ${Object.keys(employeeAttendances).length} employees`);
  
  return {
    processedEmployees: Object.keys(employeeAttendances).length,
    weekStart,
    weekEnd
  };
}

// Mendapatkan statistik attendance untuk periode tertentu
export async function getAttendanceStats(startDate: Date, endDate: Date) {
  const attendances = await prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      employee: {
        include: {
          user: { select: { name: true } },
          department: { select: { name: true } }
        }
      }
    }
  });

  const stats = {
    totalAttendances: attendances.length,
    completedAttendances: attendances.filter((a) => a.checkOutTime).length,
    inProgressAttendances: attendances.filter((a) => !a.checkOutTime).length,
    totalMainWorkHours: attendances.reduce((sum, a) => sum + (a.mainWorkHours || 0), 0),
    totalRegularOvertimeHours: attendances.reduce((sum, a) => sum + (a.regularOvertimeHours || 0), 0),
    totalWeeklyOvertimeHours: attendances.reduce((sum, a) => sum + (a.weeklyOvertimeHours || 0), 0),
    byDepartment: {} as Record<string, {
      count: number;
      totalMainWorkHours: number;
      totalOvertimeHours: number;
    }>
  };

  // Group statistics by department
  attendances.forEach(attendance => {
    const deptName = attendance.employee.department?.name || 'Unknown';
    
    if (!stats.byDepartment[deptName]) {
      stats.byDepartment[deptName] = {
        count: 0,
        totalMainWorkHours: 0,
        totalOvertimeHours: 0
      };
    }
    
    stats.byDepartment[deptName].count++;
    stats.byDepartment[deptName].totalMainWorkHours += attendance.mainWorkHours || 0;
    stats.byDepartment[deptName].totalOvertimeHours += 
      (attendance.regularOvertimeHours || 0) + (attendance.weeklyOvertimeHours || 0);
  });

  return stats;
}

// Validasi dan fix attendance records yang memiliki jam kerja belum dihitung
export async function recalculateAttendanceHours(startDate?: Date, endDate?: Date) {
  const whereCondition: {
    checkOutTime: { not: null };
    OR: Array<{ mainWorkHours: null } | { regularOvertimeHours: null }>;
    attendanceDate?: { gte: Date; lte: Date };
  } = {
    checkOutTime: { not: null },
    OR: [
      { mainWorkHours: null },
      { regularOvertimeHours: null }
    ]
  };

  if (startDate && endDate) {
    whereCondition.attendanceDate = {
      gte: startDate,
      lte: endDate
    };
  }

  const attendancesToFix = await prisma.attendance.findMany({
    where: whereCondition,
    include: {
      employee: {
        include: {
          shift: true,
          user: { select: { name: true } }
        }
      }
    }
  });

  console.log(`Found ${attendancesToFix.length} attendance records to recalculate`);

  const updatePromises = attendancesToFix.map(async (attendance) => {
    if (!attendance.employee.shift || !attendance.checkInTime || !attendance.checkOutTime) {
      console.log(`Skipping attendance ${attendance.id} - missing required data`);
      return;
    }

    const workHours = calculateWorkHours(
      attendance.employee.shift,
      attendance.checkInTime,
      attendance.checkOutTime
    );

    return prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        mainWorkHours: workHours.mainWorkHours,
        regularOvertimeHours: workHours.regularOvertimeHours,
        weeklyOvertimeHours: workHours.weeklyOvertimeHours
      }
    });
  });

  const results = await Promise.all(updatePromises);
  const successCount = results.filter(r => r).length;

  console.log(`Successfully recalculated ${successCount} attendance records`);
  
  return {
    total: attendancesToFix.length,
    successful: successCount,
    failed: attendancesToFix.length - successCount
  };
} 