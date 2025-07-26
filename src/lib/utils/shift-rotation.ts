import { differenceInWeeks, startOfWeek, parseISO } from 'date-fns';

/**
 * Menentukan shift aktif untuk karyawan dalam grup rotasi.
 * @param anchorDate - Tanggal referensi dimulainya rotasi.
 * @param currentDate - Tanggal saat ini untuk pengecekan.
 * @param shiftAId - ID dari Shift A.
 * @param shiftBId - ID dari Shift B.
 * @returns ID shift yang aktif (shiftAId atau shiftBId).
 */
export function getActiveShiftFromRotation(
  anchorDate: Date | string,
  currentDate: Date | string,
  shiftAId: string,
  shiftBId: string
): string {
  // Konversi ke Date jika berupa string
  const anchor = typeof anchorDate === 'string' ? parseISO(anchorDate) : anchorDate;
  const current = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate;

  // Dapatkan awal minggu untuk kedua tanggal
  const startOfAnchorWeek = startOfWeek(anchor, { weekStartsOn: 1 }); // Minggu dimulai dari Senin
  const startOfCurrentWeek = startOfWeek(current, { weekStartsOn: 1 });

  // Hitung selisih minggu antara tanggal saat ini dan tanggal jangkar
  const weekDifference = differenceInWeeks(startOfCurrentWeek, startOfAnchorWeek);

  // Jika selisih minggu adalah genap (0, 2, 4, ...), gunakan Shift A.
  // Jika ganjil (1, 3, 5, ...), gunakan Shift B.
  if (weekDifference % 2 === 0) {
    return shiftAId;
  } else {
    return shiftBId;
  }
}

/**
 * Menghitung minggu ke berapa dalam rotasi (1-indexed).
 * @param anchorDate - Tanggal referensi dimulainya rotasi.
 * @param currentDate - Tanggal saat ini untuk pengecekan.
 * @returns Nomor minggu dalam rotasi (1 untuk minggu pertama, 2 untuk minggu kedua, dst.)
 */
export function getRotationWeekNumber(
  anchorDate: Date | string,
  currentDate: Date | string
): number {
  const anchor = typeof anchorDate === 'string' ? parseISO(anchorDate) : anchorDate;
  const current = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate;

  const startOfAnchorWeek = startOfWeek(anchor, { weekStartsOn: 1 });
  const startOfCurrentWeek = startOfWeek(current, { weekStartsOn: 1 });

  const weekDifference = differenceInWeeks(startOfCurrentWeek, startOfAnchorWeek);

  // Mengembalikan 1 untuk minggu pertama, 2 untuk minggu kedua, dst.
  return Math.abs(weekDifference) + 1;
}

/**
 * Menentukan apakah minggu saat ini adalah minggu Shift A atau Shift B.
 * @param anchorDate - Tanggal referensi dimulainya rotasi.
 * @param currentDate - Tanggal saat ini untuk pengecekan.
 * @returns 'A' jika minggu Shift A, 'B' jika minggu Shift B
 */
export function getCurrentShiftPhase(
  anchorDate: Date | string,
  currentDate: Date | string
): 'A' | 'B' {
  const anchor = typeof anchorDate === 'string' ? parseISO(anchorDate) : anchorDate;
  const current = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate;

  const startOfAnchorWeek = startOfWeek(anchor, { weekStartsOn: 1 });
  const startOfCurrentWeek = startOfWeek(current, { weekStartsOn: 1 });

  const weekDifference = differenceInWeeks(startOfCurrentWeek, startOfAnchorWeek);

  return weekDifference % 2 === 0 ? 'A' : 'B';
}

/**
 * Memvalidasi apakah tanggal jangkar valid (tidak di masa depan).
 * @param anchorDate - Tanggal referensi yang akan divalidasi.
 * @param currentDate - Tanggal saat ini untuk perbandingan (default: hari ini).
 * @returns true jika valid, false jika tidak valid
 */
export function validateAnchorDate(
  anchorDate: Date | string,
  currentDate: Date | string = new Date()
): boolean {
  const anchor = typeof anchorDate === 'string' ? parseISO(anchorDate) : anchorDate;
  const current = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate;

  // Tanggal jangkar tidak boleh di masa depan
  return anchor <= current;
}

/**
 * Mendapatkan tanggal awal minggu berikutnya dari tanggal yang diberikan.
 * Berguna untuk menentukan kapan rotasi shift akan berlaku.
 * @param date - Tanggal referensi.
 * @returns Tanggal awal minggu berikutnya (Senin).
 */
export function getNextWeekStart(date: Date | string): Date {
  const targetDate = typeof date === 'string' ? parseISO(date) : date;
  const nextWeek = new Date(targetDate);
  nextWeek.setDate(targetDate.getDate() + 7);
  return startOfWeek(nextWeek, { weekStartsOn: 1 });
}
