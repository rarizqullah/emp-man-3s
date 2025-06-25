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
  if (!shift.mainWorkStart || !shift.mainWorkEnd) {
    throw new Error('Shift configuration incomplete: missing mainWorkStart or mainWorkEnd');
  }
  
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
  if (!shift.mainWorkStart || !shift.mainWorkEnd) {
    return false;
  }
  
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
  if (!shift.mainWorkStart || !shift.mainWorkEnd) {
    return {
      isValid: false,
      message: 'Konfigurasi shift tidak lengkap'
    };
  }
  
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

/**
 * Menentukan waktu check-in yang akan digunakan untuk pencatatan
 * Mengikuti logika:
 * 1. Jika karyawan masuk terlambat, otomatis check-in tercatat lebih 15 menit
 * 2. Jika karyawan masuk lebih awal, otomatis check-in tercatat sesuai jam shift
 * 
 * @param shift - Data shift karyawan
 * @param actualCheckInTime - Waktu check-in aktual
 * @returns Waktu check-in yang akan dicatat dalam sistem
 */
export function calculateAdjustedCheckInTime(
  shift: ExtendedShift,
  actualCheckInTime: Date
): {
  adjustedCheckInTime: Date;
  isAdjusted: boolean;
  adjustmentReason: string;
  originalTime: Date;
  adjustmentMinutes: number;
} {
  if (!shift.mainWorkStart) {
    return {
      adjustedCheckInTime: actualCheckInTime,
      isAdjusted: false,
      adjustmentReason: 'Shift tidak memiliki jam mulai',
      originalTime: actualCheckInTime,
      adjustmentMinutes: 0
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shiftStartTime = createTimeFromShift(today, shift.mainWorkStart);
  
  // Case 1: Masuk lebih awal dari jam shift - set ke jam shift
  if (actualCheckInTime < shiftStartTime) {
    return {
      adjustedCheckInTime: new Date(shiftStartTime),
      isAdjusted: true,
      adjustmentReason: `Masuk lebih awal, disesuaikan ke jam shift ${formatTimeDisplay(shiftStartTime)}`,
      originalTime: actualCheckInTime,
      adjustmentMinutes: Math.round((shiftStartTime.getTime() - actualCheckInTime.getTime()) / (60 * 1000))
    };
  }
  
  // Case 2: Masuk terlambat - bulatkan ke 15 menit berikutnya
  if (actualCheckInTime > shiftStartTime) {
    const minutesLate = Math.ceil((actualCheckInTime.getTime() - shiftStartTime.getTime()) / (60 * 1000));
    const roundedMinutesLate = Math.ceil(minutesLate / 15) * 15;
    
    const adjustedTime = new Date(shiftStartTime);
    adjustedTime.setMinutes(adjustedTime.getMinutes() + roundedMinutesLate);
    
    return {
      adjustedCheckInTime: adjustedTime,
      isAdjusted: true,
      adjustmentReason: `Terlambat ${minutesLate} menit, dibulatkan ke ${formatTimeDisplay(adjustedTime)}`,
      originalTime: actualCheckInTime,
      adjustmentMinutes: roundedMinutesLate
    };
  }
  
  // Case 3: Masuk tepat waktu
  return {
    adjustedCheckInTime: actualCheckInTime,
    isAdjusted: false,
    adjustmentReason: 'Masuk tepat waktu',
    originalTime: actualCheckInTime,
    adjustmentMinutes: 0
  };
}

/**
 * Menghitung dan mencatat waktu istirahat dan lembur otomatis berdasarkan konfigurasi shift
 * 
 * @param shift - Data shift karyawan
 * @param checkInTime - Waktu check-in yang sudah disesuaikan
 * @param checkOutTime - Waktu check-out
 * @returns Data auto record untuk jam istirahat dan lembur
 */
export function calculateAutoTimeRecord(
  shift: ExtendedShift,
  checkInTime: Date,
  checkOutTime: Date
): {
  breakStartTime: Date | null;
  breakEndTime: Date | null;
  overtimeStartTime: Date | null;
  overtimeEndTime: Date | null;
  autoRecordReason: string[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let breakStartTime: Date | null = null;
  let breakEndTime: Date | null = null;
  let overtimeStartTime: Date | null = null;
  let overtimeEndTime: Date | null = null;
  const autoRecordReason: string[] = [];

  // Auto record jam istirahat jika shift memiliki konfigurasi lunch break
  if (shift.lunchBreakStart && shift.lunchBreakEnd) {
    const lunchStart = createTimeFromShift(today, shift.lunchBreakStart);
    const lunchEnd = createTimeFromShift(today, shift.lunchBreakEnd);
    
    // PERBAIKAN LOGIC: Ada beberapa skenario untuk mencatat jam istirahat
    const totalWorkDuration = (checkOutTime.getTime() - checkInTime.getTime()) / (60 * 60 * 1000); // dalam jam
    
    // Skenario 1: Karyawan bekerja melewati jam istirahat (normal case)
    if (checkInTime <= lunchStart && checkOutTime >= lunchEnd) {
      breakStartTime = lunchStart;
      breakEndTime = lunchEnd;
      autoRecordReason.push(`Jam istirahat otomatis: ${formatTimeDisplay(lunchStart)} - ${formatTimeDisplay(lunchEnd)}`);
    }
    // Skenario 2: Karyawan masuk setelah jam istirahat, tapi bekerja cukup lama (>4 jam)
    // Dalam hal ini, kita asumsikan karyawan mengambil istirahat di tengah-tengah waktu kerjanya
    else if (checkInTime > lunchEnd && totalWorkDuration >= 4) {
      // Hitung jam istirahat di tengah-tengah shift
      const midWorkTime = new Date(checkInTime.getTime() + (checkOutTime.getTime() - checkInTime.getTime()) / 2);
      breakStartTime = new Date(midWorkTime.getTime() - 30 * 60 * 1000); // 30 menit sebelum tengah
      breakEndTime = new Date(midWorkTime.getTime() + 30 * 60 * 1000);   // 30 menit setelah tengah
      autoRecordReason.push(`Jam istirahat otomatis (tengah shift): ${formatTimeDisplay(breakStartTime)} - ${formatTimeDisplay(breakEndTime)}`);
    }
    // Skenario 3: Karyawan checkout sebelum jam istirahat, tapi bekerja cukup lama (>4 jam)
    else if (checkOutTime < lunchStart && totalWorkDuration >= 4) {
      // Hitung jam istirahat di tengah-tengah shift
      const midWorkTime = new Date(checkInTime.getTime() + (checkOutTime.getTime() - checkInTime.getTime()) / 2);
      breakStartTime = new Date(midWorkTime.getTime() - 30 * 60 * 1000); // 30 menit sebelum tengah
      breakEndTime = new Date(midWorkTime.getTime() + 30 * 60 * 1000);   // 30 menit setelah tengah
      autoRecordReason.push(`Jam istirahat otomatis (tengah shift): ${formatTimeDisplay(breakStartTime)} - ${formatTimeDisplay(breakEndTime)}`);
    }
    // Skenario 4: Karyawan bekerja pendek (<4 jam), tidak ada istirahat
    else if (totalWorkDuration < 4) {
      autoRecordReason.push(`Tidak ada jam istirahat (durasi kerja < 4 jam: ${totalWorkDuration.toFixed(1)} jam)`);
    }
  }

  // Auto record jam lembur jika shift memiliki konfigurasi overtime dan karyawan bekerja melewati jam normal
  if (shift.mainWorkEnd && shift.regularOvertimeStart && shift.regularOvertimeEnd) {
    const mainWorkEnd = createTimeFromShift(today, shift.mainWorkEnd);
    const overtimeStart = createTimeFromShift(today, shift.regularOvertimeStart);
    const overtimeEnd = createTimeFromShift(today, shift.regularOvertimeEnd);
    
    // Handle shift yang melewati hari berikutnya
    if (overtimeEnd <= overtimeStart) {
      overtimeEnd.setDate(overtimeEnd.getDate() + 1);
    }
    
    // Jika karyawan bekerja melewati jam kerja normal sampai ke jam lembur
    if (checkOutTime > mainWorkEnd && checkOutTime >= overtimeStart) {
      overtimeStartTime = overtimeStart;
      overtimeEndTime = checkOutTime < overtimeEnd ? checkOutTime : overtimeEnd;
      autoRecordReason.push(`Lembur otomatis: ${formatTimeDisplay(overtimeStartTime)} - ${formatTimeDisplay(overtimeEndTime)}`);
    }
  }

  return {
    breakStartTime,
    breakEndTime,
    overtimeStartTime,
    overtimeEndTime,
    autoRecordReason
  };
}

/**
 * Mendeteksi keterlambatan dengan logika baru yang sudah disesuaikan
 * Fungsi ini di-update untuk menggunakan calculateAdjustedCheckInTime
 */
export function detectLatenessAndCalculateRoundedTime(
  shift: ExtendedShift,
  checkInTime: Date
): {
  isLate: boolean;
  actualMinutesLate: number;
  roundedMinutesLate: number;
  originalShiftStart: Date;
  roundedCheckInTime: Date;
  latenessMessage: string;
} {
  // Gunakan fungsi baru untuk menghitung waktu check-in yang disesuaikan
  const adjustmentResult = calculateAdjustedCheckInTime(shift, checkInTime);
  
  if (!shift.mainWorkStart) {
    return {
      isLate: false,
      actualMinutesLate: 0,
      roundedMinutesLate: 0,
      originalShiftStart: checkInTime,
      roundedCheckInTime: checkInTime,
      latenessMessage: ''
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shiftStartTime = createTimeFromShift(today, shift.mainWorkStart);
  
  const isLate = checkInTime > shiftStartTime;
  
  if (isLate) {
    const actualMinutesLate = Math.ceil((checkInTime.getTime() - shiftStartTime.getTime()) / (60 * 1000));
    const roundedMinutesLate = adjustmentResult.adjustmentMinutes;
    
    const lateHours = Math.floor(roundedMinutesLate / 60);
    const lateMinutes = roundedMinutesLate % 60;
    
    let latenessMessage = '';
    if (lateHours > 0) {
      latenessMessage = `Anda terlambat ${lateHours} jam ${lateMinutes} menit (dibulatkan dari ${actualMinutesLate} menit keterlambatan)`;
    } else {
      latenessMessage = `Anda terlambat ${lateMinutes} menit (dibulatkan dari ${actualMinutesLate} menit keterlambatan)`;
    }
    
    return {
      isLate: true,
      actualMinutesLate,
      roundedMinutesLate,
      originalShiftStart: shiftStartTime,
      roundedCheckInTime: adjustmentResult.adjustedCheckInTime,
      latenessMessage
    };
  }

  return {
    isLate: false,
    actualMinutesLate: 0,
    roundedMinutesLate: 0,
    originalShiftStart: shiftStartTime,
    roundedCheckInTime: adjustmentResult.adjustedCheckInTime,
    latenessMessage: ''
  };
}

/**
 * Format waktu untuk tampilan (HH:MM)
 */
export function formatTimeDisplay(time: Date): string {
  return time.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
} 