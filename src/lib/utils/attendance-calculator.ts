import { Shift } from "@prisma/client";

interface WorkHoursResult {
  mainWorkHours: number;
  regularOvertimeHours: number;
  weeklyOvertimeHours: number;
}

// Interface untuk shift dengan overtime properties yang sudah diperbaiki
interface ExtendedShift extends Shift {
  regularOvertimeStart: Date | null;
  regularOvertimeEnd: Date | null;
  weeklyOvertimeStart: Date | null;
  weeklyOvertimeEnd: Date | null;
}

/**
 * Menghitung jam kerja berdasarkan shift dan waktu presensi
 * Mengikuti spesifikasi di instructions.md
 * 
 * @param shift - Data shift karyawan
 * @param checkInTime - Waktu presensi masuk
 * @param checkOutTime - Waktu presensi keluar
 * @returns Perhitungan jam kerja (utama, lembur reguler, lembur mingguan)
 */
export function calculateWorkHours(
  shift: ExtendedShift,
  checkInTime: Date,
  checkOutTime: Date
): WorkHoursResult {
  // Konversi waktu shift untuk hari ini
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Buat waktu shift berdasarkan konfigurasi
  const mainWorkStart = createTimeFromShift(today, shift.mainWorkStart);
  const mainWorkEnd = createTimeFromShift(today, shift.mainWorkEnd);
  
  let lunchBreakStart: Date | null = null;
  let lunchBreakEnd: Date | null = null;
  
  if (shift.lunchBreakStart && shift.lunchBreakEnd) {
    lunchBreakStart = createTimeFromShift(today, shift.lunchBreakStart);
    lunchBreakEnd = createTimeFromShift(today, shift.lunchBreakEnd);
  }

  let regularOvertimeStart: Date | null = null;
  let regularOvertimeEnd: Date | null = null;
  
  if (shift.regularOvertimeStart && shift.regularOvertimeEnd) {
    regularOvertimeStart = createTimeFromShift(today, shift.regularOvertimeStart);
    regularOvertimeEnd = createTimeFromShift(today, shift.regularOvertimeEnd);
  }

  // Handle shift yang melewati hari berikutnya
  if (mainWorkEnd <= mainWorkStart) {
    mainWorkEnd.setDate(mainWorkEnd.getDate() + 1);
  }
  
  if (regularOvertimeStart && regularOvertimeEnd && regularOvertimeEnd <= regularOvertimeStart) {
    regularOvertimeEnd.setDate(regularOvertimeEnd.getDate() + 1);
  }

  // Tentukan waktu check-in yang efektif berdasarkan spesifikasi
  let effectiveCheckInTime = new Date(checkInTime);
  
  // Jika karyawan datang lebih awal, waktu kerja dimulai sesuai jadwal
  if (checkInTime < mainWorkStart) {
    effectiveCheckInTime = new Date(mainWorkStart);
  }
  
  // Jika karyawan terlambat, bulatkan ke 15 menit berikutnya
  if (checkInTime > mainWorkStart) {
    const minutesLate = Math.ceil((checkInTime.getTime() - mainWorkStart.getTime()) / (15 * 60 * 1000)) * 15;
    effectiveCheckInTime = new Date(mainWorkStart);
    effectiveCheckInTime.setMinutes(effectiveCheckInTime.getMinutes() + minutesLate);
  }

  // Hitung jam kerja utama
  let mainWorkHours = 0;
  
  // Pastikan check-out tidak lebih awal dari check-in
  const effectiveCheckOutTime = checkOutTime > effectiveCheckInTime ? checkOutTime : effectiveCheckInTime;
  
  // Tentukan akhir jam kerja utama yang efektif
  const effectiveMainWorkEnd = effectiveCheckOutTime < mainWorkEnd ? effectiveCheckOutTime : mainWorkEnd;
  
  if (effectiveMainWorkEnd > effectiveCheckInTime) {
    const workDuration = effectiveMainWorkEnd.getTime() - effectiveCheckInTime.getTime();
    mainWorkHours = workDuration / (1000 * 60 * 60); // Convert to hours
    
    // Kurangi waktu istirahat makan siang jika ada
    if (lunchBreakStart && lunchBreakEnd && 
        effectiveCheckInTime <= lunchBreakEnd && 
        effectiveMainWorkEnd >= lunchBreakStart) {
      
      const lunchStart = Math.max(lunchBreakStart.getTime(), effectiveCheckInTime.getTime());
      const lunchEnd = Math.min(lunchBreakEnd.getTime(), effectiveMainWorkEnd.getTime());
      
      if (lunchEnd > lunchStart) {
        const lunchDuration = (lunchEnd - lunchStart) / (1000 * 60 * 60);
        mainWorkHours -= lunchDuration;
      }
    }
  }

  // Hitung jam lembur reguler
  let regularOvertimeHours = 0;
  
  if (regularOvertimeStart && regularOvertimeEnd && 
      checkOutTime > regularOvertimeStart) {
    
    const overtimeStartTime = Math.max(regularOvertimeStart.getTime(), effectiveCheckInTime.getTime());
    const overtimeEndTime = Math.min(regularOvertimeEnd.getTime(), checkOutTime.getTime());
    
    if (overtimeEndTime > overtimeStartTime) {
      regularOvertimeHours = (overtimeEndTime - overtimeStartTime) / (1000 * 60 * 60);
    }
  }

  // Pastikan tidak ada nilai negatif
  mainWorkHours = Math.max(0, mainWorkHours);
  regularOvertimeHours = Math.max(0, regularOvertimeHours);

  // Bulatkan ke 2 desimal
  mainWorkHours = Math.round(mainWorkHours * 100) / 100;
  regularOvertimeHours = Math.round(regularOvertimeHours * 100) / 100;

  return {
    mainWorkHours,
    regularOvertimeHours,
    weeklyOvertimeHours: 0 // Akan dihitung terpisah secara mingguan
  };
}

/**
 * Membuat waktu dari konfigurasi shift
 */
function createTimeFromShift(baseDate: Date, shiftTime: Date): Date {
  const result = new Date(baseDate);
  result.setHours(
    shiftTime.getHours(),
    shiftTime.getMinutes(),
    shiftTime.getSeconds(),
    shiftTime.getMilliseconds()
  );
  return result;
}

/**
 * Memeriksa apakah presensi dilakukan pada shift yang benar
 * 
 * @param shift - Data shift karyawan
 * @param currentTime - Waktu saat ini
 * @returns boolean - true jika waktu saat ini dalam shift
 */
export function isWithinShiftTime(shift: Shift, currentTime: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mainWorkStart = createTimeFromShift(today, shift.mainWorkStart);
  const mainWorkEnd = createTimeFromShift(today, shift.mainWorkEnd);

  // Handle shift yang melewati hari berikutnya
  if (mainWorkEnd <= mainWorkStart) {
    mainWorkEnd.setDate(mainWorkEnd.getDate() + 1);
  }

  // Berikan buffer 2 jam sebelum shift dimulai
  const bufferStart = new Date(mainWorkStart);
  bufferStart.setHours(bufferStart.getHours() - 2);

  return currentTime >= bufferStart && currentTime <= mainWorkEnd;
}

/**
 * Menghitung jam lembur mingguan berdasarkan data attendance dalam seminggu
 * 
 * @param weeklyAttendances - Data attendance dalam seminggu
 * @param maxWeeklyHours - Maksimal jam kerja normal per minggu (default 40 jam)
 * @returns Jam lembur mingguan
 */
export function calculateWeeklyOvertimeHours(
  weeklyAttendances: Array<{
    mainWorkHours: number;
    regularOvertimeHours: number;
  }>,
  maxWeeklyHours: number = 40
): number {
  // Hitung total jam kerja dalam seminggu
  const totalMainWorkHours = weeklyAttendances.reduce((total, att) => total + att.mainWorkHours, 0);
  const totalRegularOvertimeHours = weeklyAttendances.reduce((total, att) => total + att.regularOvertimeHours, 0);
  
  const totalWeeklyHours = totalMainWorkHours + totalRegularOvertimeHours;
  
  // Jika total jam kerja melebihi batas normal, sisanya adalah lembur mingguan
  const weeklyOvertimeHours = Math.max(0, totalWeeklyHours - maxWeeklyHours);
  
  return Math.round(weeklyOvertimeHours * 100) / 100;
}

/**
 * Validasi apakah check-in/check-out sesuai dengan aturan shift
 */
export function validateAttendanceTime(
  shift: ExtendedShift,
  checkInTime: Date,
  checkOutTime?: Date
): {
  isValid: boolean;
  message: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mainWorkStart = createTimeFromShift(today, shift.mainWorkStart);
  const mainWorkEnd = createTimeFromShift(today, shift.mainWorkEnd);

  // Handle shift yang melewati hari berikutnya
  if (mainWorkEnd <= mainWorkStart) {
    mainWorkEnd.setDate(mainWorkEnd.getDate() + 1);
  }

  // Validasi check-in tidak terlalu awal (maksimal 3 jam sebelum shift)
  const maxEarlyCheckIn = new Date(mainWorkStart);
  maxEarlyCheckIn.setHours(maxEarlyCheckIn.getHours() - 3);

  if (checkInTime < maxEarlyCheckIn) {
    return {
      isValid: false,
      message: `Check-in terlalu awal. Maksimal 3 jam sebelum shift dimulai (${mainWorkStart.toLocaleTimeString()})`
    };
  }

  // Validasi check-out jika ada
  if (checkOutTime) {
    if (checkOutTime <= checkInTime) {
      return {
        isValid: false,
        message: 'Waktu check-out harus setelah check-in'
      };
    }

    // Maksimal 2 jam setelah shift berakhir
    const maxLateCheckOut = new Date(mainWorkEnd);
    maxLateCheckOut.setHours(maxLateCheckOut.getHours() + 2);

    if (checkOutTime > maxLateCheckOut) {
      return {
        isValid: false,
        message: `Check-out terlalu lambat. Maksimal 2 jam setelah shift berakhir (${mainWorkEnd.toLocaleTimeString()})`
      };
    }
  }

  return {
    isValid: true,
    message: 'Waktu presensi valid'
  };
} 