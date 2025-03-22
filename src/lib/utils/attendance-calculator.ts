import { Shift } from "@prisma/client";

interface WorkHoursResult {
  mainWorkHours: number;
  regularOvertimeHours: number;
  weeklyOvertimeHours: number;
}

// Interface untuk shift dengan overtime properties
interface ExtendedShift extends Shift {
  overtimeStart?: Date | null;
  overtimeEnd?: Date | null;
}

/**
 * Menghitung jam kerja berdasarkan shift dan waktu presensi
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
  // Mengkonversi waktu shift untuk hari ini
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mainWorkStart = new Date(today);
  mainWorkStart.setHours(
    shift.mainWorkStart.getHours(),
    shift.mainWorkStart.getMinutes(),
    0, 0
  );

  const mainWorkEnd = new Date(today);
  mainWorkEnd.setHours(
    shift.mainWorkEnd.getHours(),
    shift.mainWorkEnd.getMinutes(),
    0, 0
  );

  let lunchBreakStart: Date | null = null;
  let lunchBreakEnd: Date | null = null;

  if (shift.lunchBreakStart && shift.lunchBreakEnd) {
    lunchBreakStart = new Date(today);
    lunchBreakStart.setHours(
      shift.lunchBreakStart.getHours(),
      shift.lunchBreakStart.getMinutes(),
      0, 0
    );

    lunchBreakEnd = new Date(today);
    lunchBreakEnd.setHours(
      shift.lunchBreakEnd.getHours(),
      shift.lunchBreakEnd.getMinutes(),
      0, 0
    );
  }

  let overtimeStart: Date | null = null;
  let overtimeEnd: Date | null = null;

  // Tipe shift mungkin berbeda, jadi kita gunakan pendekatan defensive
  if (shift.overtimeStart && shift.overtimeEnd) {
    overtimeStart = new Date(today);
    overtimeStart.setHours(
      shift.overtimeStart.getHours(),
      shift.overtimeStart.getMinutes(),
      0, 0
    );

    overtimeEnd = new Date(today);
    overtimeEnd.setHours(
      shift.overtimeEnd.getHours(),
      shift.overtimeEnd.getMinutes(),
      0, 0
    );

    // Jika jam lembur berakhir sebelum jam mulai, berarti lembur berlanjut ke hari berikutnya
    if (overtimeEnd <= overtimeStart) {
      overtimeEnd.setDate(overtimeEnd.getDate() + 1);
    }
  }

  // Jika jam akhir kerja sebelum jam mulai, berarti shift berlanjut ke hari berikutnya
  if (mainWorkEnd <= mainWorkStart) {
    mainWorkEnd.setDate(mainWorkEnd.getDate() + 1);
  }

  // Menangani kasus check-in lebih awal
  let actualCheckInTime = new Date(checkInTime);

  // Jika check-in lebih dari 15 menit sebelum jadwal, tetap gunakan jadwal
  if (actualCheckInTime < mainWorkStart) {
    actualCheckInTime = new Date(mainWorkStart);
  }

  // Jika check-in terlambat, bulatkan ke 15 menit berikutnya
  if (actualCheckInTime > mainWorkStart) {
    const minutesLate = Math.ceil((actualCheckInTime.getTime() - mainWorkStart.getTime()) / (15 * 60 * 1000)) * 15;
    actualCheckInTime = new Date(mainWorkStart);
    actualCheckInTime.setMinutes(actualCheckInTime.getMinutes() + minutesLate);
  }

  // Hitung jam kerja utama
  let mainWorkHours = 0;
  let regularOvertimeHours = 0;
  let weeklyOvertimeHours = 0;

  // Durasi jam kerja utama (dalam milidetik)
  let mainWorkDuration = 0;

  // Jika check-out sebelum akhir jam kerja utama
  if (checkOutTime <= mainWorkEnd) {
    mainWorkDuration = checkOutTime.getTime() - actualCheckInTime.getTime();
  } else {
    mainWorkDuration = mainWorkEnd.getTime() - actualCheckInTime.getTime();
  }

  // Kurangi waktu istirahat jika ada
  if (lunchBreakStart && lunchBreakEnd &&
    actualCheckInTime <= lunchBreakEnd &&
    checkOutTime >= lunchBreakStart) {

    const lunchStart = Math.max(lunchBreakStart.getTime(), actualCheckInTime.getTime());
    const lunchEnd = Math.min(lunchBreakEnd.getTime(), checkOutTime.getTime());

    if (lunchEnd > lunchStart) {
      mainWorkDuration -= (lunchEnd - lunchStart);
    }
  }

  // Konversi ke jam
  mainWorkHours = Math.max(0, mainWorkDuration / (1000 * 60 * 60));

  // Hitung jam lembur reguler jika ada
  if (overtimeStart && overtimeEnd && checkOutTime > overtimeStart) {
    const otStart = Math.max(overtimeStart.getTime(), actualCheckInTime.getTime());
    const otEnd = Math.min(overtimeEnd.getTime(), checkOutTime.getTime());

    if (otEnd > otStart) {
      regularOvertimeHours = (otEnd - otStart) / (1000 * 60 * 60);
    }
  }

  // Bulatkan ke 1 desimal
  mainWorkHours = Math.round(mainWorkHours * 10) / 10;
  regularOvertimeHours = Math.round(regularOvertimeHours * 10) / 10;

  // Hitung lembur mingguan (ini akan dihitung terpisah berdasarkan data mingguan)
  // Untuk contoh ini, kita atur ke 0
  weeklyOvertimeHours = 0;

  return {
    mainWorkHours,
    regularOvertimeHours,
    weeklyOvertimeHours
  };
}

/**
 * Memeriksa apakah presensi dilakukan pada shift yang benar
 * 
 * @param shift - Data shift karyawan
 * @param currentTime - Waktu saat ini
 * @returns boolean - true jika waktu saat ini dalam shift
 */
export function isWithinShiftTime(shift: Shift, currentTime: Date): boolean {
  // Mengkonversi waktu shift untuk hari ini
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mainWorkStart = new Date(today);
  mainWorkStart.setHours(
    shift.mainWorkStart.getHours(),
    shift.mainWorkStart.getMinutes(),
    0, 0
  );

  const mainWorkEnd = new Date(today);
  mainWorkEnd.setHours(
    shift.mainWorkEnd.getHours(),
    shift.mainWorkEnd.getMinutes(),
    0, 0
  );

  // Jika jam akhir kerja sebelum jam mulai, berarti shift berlanjut ke hari berikutnya
  if (mainWorkEnd <= mainWorkStart) {
    mainWorkEnd.setDate(mainWorkEnd.getDate() + 1);
  }

  // Berikan buffer 2 jam sebelum shift dimulai
  const bufferStart = new Date(mainWorkStart);
  bufferStart.setHours(bufferStart.getHours() - 2);

  // Memeriksa apakah waktu saat ini dalam rentang shift atau dalam buffer
  return currentTime >= bufferStart && currentTime <= mainWorkEnd;
}

/**
 * Menghitung total lembur mingguan berdasarkan data presensi mingguan
 * 
 * @param weeklyHours - Total jam kerja dalam seminggu
 * @returns number - Jam lembur mingguan
 */
export function calculateWeeklyOvertime(weeklyHours: number): number {
  // Standar 40 jam per minggu
  const standardWeeklyHours = 40;

  // Jika total jam kerja melebihi standar, sisanya adalah lembur mingguan
  const weeklyOvertime = Math.max(0, weeklyHours - standardWeeklyHours);

  // Bulatkan ke 1 desimal
  return Math.round(weeklyOvertime * 10) / 10;
} 