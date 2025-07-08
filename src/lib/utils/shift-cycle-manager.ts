import { Shift } from '@prisma/client';
import { addMinutes, isAfter, startOfDay } from 'date-fns';

// Interface untuk shift cycle information
export interface ShiftCycleInfo {
  currentShift: {
    id: string;
    name: string;
    type: 'SHIFT_A' | 'SHIFT_B' | 'NON_SHIFT';
    startTime: Date;
    endTime: Date;
    gracePeriodEnd: Date;
  } | null;
  nextShift: {
    id: string;
    name: string;
    type: 'SHIFT_A' | 'SHIFT_B' | 'NON_SHIFT';
    startTime: Date;
    endTime: Date;
  } | null;
  isInGracePeriod: boolean;
  isActiveShiftPeriod: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

// Interface untuk shift dengan properties yang diperlukan
interface ExtendedShift extends Shift {
  regularOvertimeStart: Date | null;
  regularOvertimeEnd: Date | null;
  weeklyOvertimeStart: Date | null;
  weeklyOvertimeEnd: Date | null;
}

/**
 * Enhanced Shift Detection Logic
 * Mendeteksi shift cycle berdasarkan waktu saat ini dan konfigurasi shift
 */
export class ShiftCycleManager {
  
  /**
   * Menentukan shift cycle saat ini berdasarkan waktu dan konfigurasi shift
   */
  static determineCurrentShiftCycle(
    shifts: ExtendedShift[],
    currentTime: Date = new Date()
  ): ShiftCycleInfo {
    // Filter shift yang aktif (bukan NON_SHIFT dan memiliki konfigurasi waktu)
    const activeShifts = shifts.filter(shift => 
      shift.shiftType !== 'NON_SHIFT' && 
      shift.mainWorkStart && 
      shift.mainWorkEnd
    );

    if (activeShifts.length === 0) {
      return {
        currentShift: null,
        nextShift: null,
        isInGracePeriod: false,
        isActiveShiftPeriod: false,
        canCheckIn: false,
        canCheckOut: false
      };
    }

    // Konversi shift ke shift cycle dengan handling cross-day
    const shiftCycles = this.convertShiftsToShiftCycles(activeShifts, currentTime);
    
    // Tentukan shift cycle yang aktif
    const currentShiftCycle = this.findCurrentShiftCycle(shiftCycles, currentTime);
    const nextShiftCycle = this.findNextShiftCycle(shiftCycles, currentTime);

    // Periksa apakah dalam grace period
    const isInGracePeriod = currentShiftCycle ? 
      this.isInGracePeriod(currentShiftCycle, currentTime) : false;

    // Periksa apakah dalam periode shift aktif
    const isActiveShiftPeriod = currentShiftCycle ? 
      this.isInActiveShiftPeriod(currentShiftCycle, currentTime) : false;

    return {
      currentShift: currentShiftCycle,
      nextShift: nextShiftCycle,
      isInGracePeriod,
      isActiveShiftPeriod,
      canCheckIn: this.canCheckIn(currentShiftCycle, nextShiftCycle, currentTime),
      canCheckOut: this.canCheckOut(currentShiftCycle, isInGracePeriod, currentTime)
    };
  }

  /**
   * Konversi shift configuration ke shift cycles dengan handling cross-day
   */
  private static convertShiftsToShiftCycles(
    shifts: ExtendedShift[],
    currentTime: Date
  ) {
    const cycles = [];
    
    for (const shift of shifts) {
      if (!shift.mainWorkStart || !shift.mainWorkEnd) continue;

      // Buat shift cycle untuk hari ini
      const todayShiftCycle = this.createShiftCycleForDay(shift, currentTime);
      cycles.push(todayShiftCycle);

      // Jika shift melewati hari berikutnya, buat cycle untuk hari kemarin
      if (this.isShiftCrossDay(shift)) {
        const yesterday = new Date(currentTime);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayShiftCycle = this.createShiftCycleForDay(shift, yesterday);
        cycles.push(yesterdayShiftCycle);
      }

      // Buat shift cycle untuk hari besok (untuk kontinuitas)
      const tomorrow = new Date(currentTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowShiftCycle = this.createShiftCycleForDay(shift, tomorrow);
      cycles.push(tomorrowShiftCycle);
    }

    return cycles.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Buat shift cycle untuk hari tertentu
   */
  private static createShiftCycleForDay(shift: ExtendedShift, baseDate: Date) {
    const dayStart = startOfDay(baseDate);
    
    const startTime = new Date(dayStart);
    startTime.setHours(
      shift.mainWorkStart!.getHours(),
      shift.mainWorkStart!.getMinutes(),
      0,
      0
    );

    const endTime = new Date(dayStart);
    endTime.setHours(
      shift.mainWorkEnd!.getHours(),
      shift.mainWorkEnd!.getMinutes(),
      0,
      0
    );

    // Jika shift melewati hari berikutnya
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    // Grace period 15 menit setelah shift berakhir
    const gracePeriodEnd = addMinutes(endTime, 15);

    return {
      id: shift.id,
      name: shift.name,
      type: shift.shiftType as 'SHIFT_A' | 'SHIFT_B' | 'NON_SHIFT',
      startTime,
      endTime,
      gracePeriodEnd
    };
  }

  /**
   * Periksa apakah shift melewati hari berikutnya
   */
  private static isShiftCrossDay(shift: ExtendedShift): boolean {
    if (!shift.mainWorkStart || !shift.mainWorkEnd) return false;
    
    const startHour = shift.mainWorkStart.getHours();
    const endHour = shift.mainWorkEnd.getHours();
    
    return endHour < startHour || 
           (endHour === startHour && shift.mainWorkEnd.getMinutes() <= shift.mainWorkStart.getMinutes());
  }

  /**
   * Cari shift cycle yang aktif saat ini
   */
  private static findCurrentShiftCycle(shiftCycles: any[], currentTime: Date) {
    return shiftCycles.find(cycle => 
      currentTime >= cycle.startTime && currentTime <= cycle.gracePeriodEnd
    ) || null;
  }

  /**
   * Cari shift cycle berikutnya
   */
  private static findNextShiftCycle(shiftCycles: any[], currentTime: Date) {
    return shiftCycles.find(cycle => 
      cycle.startTime > currentTime
    ) || null;
  }

  /**
   * Periksa apakah dalam grace period
   */
  private static isInGracePeriod(shiftCycle: any, currentTime: Date): boolean {
    return currentTime > shiftCycle.endTime && currentTime <= shiftCycle.gracePeriodEnd;
  }

  /**
   * Periksa apakah dalam periode shift aktif
   */
  private static isInActiveShiftPeriod(shiftCycle: any, currentTime: Date): boolean {
    return currentTime >= shiftCycle.startTime && currentTime <= shiftCycle.endTime;
  }

  /**
   * Periksa apakah dapat melakukan check-in
   * ENHANCED: Hanya izinkan check-in dalam periode shift yang tepat
   */
  private static canCheckIn(currentShift: any, nextShift: any, currentTime: Date): boolean {
    // Jika ada shift aktif saat ini
    if (currentShift) {
      // Hanya izinkan check-in jika dalam periode shift aktif (bukan grace period)
      const isInActiveShiftPeriod = currentTime >= currentShift.startTime && currentTime <= currentShift.endTime;
      
      // REVISI: Tidak izinkan check-in di grace period untuk mencegah presensi di luar jam
      return isInActiveShiftPeriod;
    }

    // Jika tidak ada shift aktif, periksa apakah mendekati shift berikutnya
    if (nextShift) {
      // Hanya izinkan check-in maksimal 30 menit sebelum shift dimulai
      const preShiftWindow = new Date(nextShift.startTime);
      preShiftWindow.setMinutes(preShiftWindow.getMinutes() - 30);
      
      return currentTime >= preShiftWindow && currentTime < nextShift.startTime;
    }

    // Jika tidak ada shift aktif atau berikutnya, tidak izinkan check-in
    return false;
  }

  /**
   * Periksa apakah bisa check-out
   */
  private static canCheckOut(currentShift: any, isInGracePeriod: boolean, currentTime: Date): boolean {
    // Bisa check-out jika:
    // 1. Dalam periode shift aktif, atau
    // 2. Dalam grace period setelah shift berakhir
    return currentShift && (
      this.isInActiveShiftPeriod(currentShift, currentTime) || 
      isInGracePeriod
    );
  }

  /**
   * Dapatkan shift cycles untuk range waktu tertentu
   */
  static getShiftCyclesForRange(
    shifts: ExtendedShift[],
    startDate: Date,
    endDate: Date
  ) {
    const cycles = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const shiftCycleInfo = this.determineCurrentShiftCycle(shifts, currentDate);
      
      if (shiftCycleInfo.currentShift) {
        cycles.push({
          ...shiftCycleInfo.currentShift,
          date: new Date(currentDate)
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return cycles;
  }

  /**
   * Periksa apakah karyawan dengan shift tertentu perlu auto cut-off
   */
  static shouldAutoCutOff(
    shift: ExtendedShift,
    checkInTime: Date,
    currentTime: Date = new Date()
  ): {
    shouldCutOff: boolean;
    cutOffTime: Date | null;
    reason: string;
    isInSession: boolean;
    sessionInfo: string;
    useShiftEndTime: boolean;
  } {
    if (!shift.mainWorkStart || !shift.mainWorkEnd) {
      return {
        shouldCutOff: false,
        cutOffTime: null,
        reason: 'Shift tidak memiliki konfigurasi waktu',
        isInSession: false,
        sessionInfo: 'No shift configuration',
        useShiftEndTime: false
      };
    }

    // Tentukan shift cycle berdasarkan waktu check-in
    const shiftCycleInfo = this.determineCurrentShiftCycle([shift], checkInTime);
    
    if (!shiftCycleInfo.currentShift) {
      return {
        shouldCutOff: false,
        cutOffTime: null,
        reason: 'Tidak ada shift cycle aktif',
        isInSession: false,
        sessionInfo: 'No active shift cycle',
        useShiftEndTime: false
      };
    }

    // Periksa status sesi saat ini
    const isInActiveSession = this.isInActiveShiftPeriod(shiftCycleInfo.currentShift, currentTime);
    const isInGracePeriod = this.isInGracePeriod(shiftCycleInfo.currentShift, currentTime);
    const isAfterGracePeriod = isAfter(currentTime, shiftCycleInfo.currentShift.gracePeriodEnd);
    
    let sessionInfo = '';
    if (isInActiveSession) {
      sessionInfo = `Dalam sesi kerja (${this.formatShiftTime(shiftCycleInfo.currentShift.startTime)} - ${this.formatShiftTime(shiftCycleInfo.currentShift.endTime)})`;
    } else if (isInGracePeriod) {
      sessionInfo = `Dalam grace period (berakhir ${this.formatShiftTime(shiftCycleInfo.currentShift.gracePeriodEnd)})`;
    } else if (isAfterGracePeriod) {
      sessionInfo = `Melewati grace period (berakhir ${this.formatShiftTime(shiftCycleInfo.currentShift.gracePeriodEnd)})`;
    }

    // REVISI LOGIKA BERDASARKAN REQUIREMENT BARU:
    // 1. Jika masih dalam sesi aktif - TIDAK perlu auto cut-off (checkout manual akan gunakan waktu aktual)
    // 2. Jika dalam grace period - TIDAK perlu auto cut-off (checkout manual akan gunakan waktu akhir shift)
    // 3. Jika sudah melewati grace period - perlu auto cut-off dengan waktu akhir shift
    
    if (isAfterGracePeriod) {
      return {
        shouldCutOff: true,
        cutOffTime: shiftCycleInfo.currentShift.endTime,
        reason: `Auto cut-off karena melewati grace period shift ${shiftCycleInfo.currentShift.name} (waktu akhir shift)`,
        isInSession: false,
        sessionInfo,
        useShiftEndTime: true
      };
    }

    return {
      shouldCutOff: false,
      cutOffTime: null,
      reason: isInActiveSession ? 
        'Masih dalam sesi kerja aktif' : 
        'Masih dalam grace period setelah shift berakhir',
      isInSession: isInActiveSession,
      sessionInfo,
      useShiftEndTime: !isInActiveSession
    };
  }

  /**
   * Format waktu untuk display
   */
  static formatShiftTime(date: Date): string {
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  /**
   * Debug info untuk shift cycle
   */
  static getDebugInfo(
    shifts: ExtendedShift[],
    currentTime: Date = new Date()
  ): string {
    const shiftCycleInfo = this.determineCurrentShiftCycle(shifts, currentTime);
    
    let debugInfo = `=== SHIFT CYCLE DEBUG INFO ===\n`;
    debugInfo += `Current Time: ${currentTime.toISOString()}\n`;
    debugInfo += `Total Shifts: ${shifts.length}\n\n`;

    if (shiftCycleInfo.currentShift) {
      debugInfo += `Current Shift: ${shiftCycleInfo.currentShift.name}\n`;
      debugInfo += `Start: ${shiftCycleInfo.currentShift.startTime.toISOString()}\n`;
      debugInfo += `End: ${shiftCycleInfo.currentShift.endTime.toISOString()}\n`;
      debugInfo += `Grace Period End: ${shiftCycleInfo.currentShift.gracePeriodEnd.toISOString()}\n`;
    }

    if (shiftCycleInfo.nextShift) {
      debugInfo += `\nNext Shift: ${shiftCycleInfo.nextShift.name}\n`;
      debugInfo += `Start: ${shiftCycleInfo.nextShift.startTime.toISOString()}\n`;
    }

    debugInfo += `\nStatus:\n`;
    debugInfo += `- In Grace Period: ${shiftCycleInfo.isInGracePeriod}\n`;
    debugInfo += `- Active Shift Period: ${shiftCycleInfo.isActiveShiftPeriod}\n`;
    debugInfo += `- Can Check In: ${shiftCycleInfo.canCheckIn}\n`;
    debugInfo += `- Can Check Out: ${shiftCycleInfo.canCheckOut}\n`;

    return debugInfo;
  }
}

// Export default untuk kemudahan penggunaan
export default ShiftCycleManager; 