import { Shift } from '@prisma/client';
import { addMinutes, isAfter, isBefore, isEqual } from 'date-fns';

// Interface untuk shift yang diperluas
interface ExtendedShift extends Shift {
  regularOvertimeStart: Date | null;
  regularOvertimeEnd: Date | null;
  weeklyOvertimeStart: Date | null;
  weeklyOvertimeEnd: Date | null;
}

// Interface untuk informasi sesi kerja
export interface WorkSession {
  type: 'MAIN_WORK' | 'REGULAR_OVERTIME' | 'WEEKLY_OVERTIME';
  name: string;
  startTime: Date;
  endTime: Date;
  gracePeriodStart: Date;
  gracePeriodEnd: Date;
  isActive: boolean;
  isInGracePeriod: boolean;
}

// Interface untuk keputusan checkout
export interface CheckoutDecision {
  checkoutTime: Date;
  originalTime: Date;
  sessionType: string;
  isGracePeriod: boolean;
  isActiveSession: boolean;
  isLateCheckout: boolean; // NEW: Flag untuk checkout terlambat
  lateCheckoutLabel: string | null; // NEW: Label untuk checkout terlambat
  reason: string;
  canCheckout: boolean;
  useActualTime: boolean;
}

// Interface untuk informasi multi-session
export interface MultiSessionInfo {
  activeSessions: WorkSession[];
  gracePeriodSessions: WorkSession[];
  currentSession: WorkSession | null;
  currentGracePeriodSession: WorkSession | null;
  canCheckout: boolean;
  checkoutDecision: CheckoutDecision;
}

/**
 * Enhanced Session Checkout Manager
 * Mengelola logika checkout multi-session dengan grace period independen
 */
export class SessionCheckoutManager {

  /**
   * Menentukan waktu checkout yang tepat berdasarkan multi-session logic
   */
  static determineCheckoutTime(
    shift: ExtendedShift,
    currentTime: Date = new Date(),
    isManualOverride: boolean = false
  ): MultiSessionInfo {
    
    // Buat semua sesi kerja berdasarkan shift configuration
    const sessions = this.createWorkSessions(shift, currentTime);
    
    // Klasifikasi sesi berdasarkan status saat ini
    const activeSessions = sessions.filter(session => session.isActive);
    const gracePeriodSessions = sessions.filter(session => session.isInGracePeriod);
    
    // Tentukan sesi saat ini
    const currentSession = activeSessions.length > 0 ? activeSessions[0] : null;
    const currentGracePeriodSession = gracePeriodSessions.length > 0 ? gracePeriodSessions[0] : null;
    
    // Tentukan apakah bisa checkout
    const canCheckout = currentSession !== null || 
                       currentGracePeriodSession !== null || 
                       isManualOverride;
    
    // Buat keputusan checkout
    const checkoutDecision = this.makeCheckoutDecision(
      currentTime,
      currentSession,
      currentGracePeriodSession,
      isManualOverride,
      sessions // Pass all sessions untuk deteksi late checkout
    );
    
    return {
      activeSessions,
      gracePeriodSessions,
      currentSession,
      currentGracePeriodSession,
      canCheckout,
      checkoutDecision
    };
  }

  /**
   * Membuat semua sesi kerja berdasarkan konfigurasi shift
   */
  private static createWorkSessions(shift: ExtendedShift, currentTime: Date): WorkSession[] {
    const sessions: WorkSession[] = [];
    
    // Main Work Session
    if (shift.mainWorkStart && shift.mainWorkEnd) {
      const mainWorkSession = this.createWorkSession(
        'MAIN_WORK',
        'Main Work',
        shift.mainWorkStart,
        shift.mainWorkEnd,
        currentTime
      );
      sessions.push(mainWorkSession);
    }
    
    // Regular Overtime Session
    if (shift.regularOvertimeStart && shift.regularOvertimeEnd) {
      const regularOvertimeSession = this.createWorkSession(
        'REGULAR_OVERTIME',
        'Regular Overtime',
        shift.regularOvertimeStart,
        shift.regularOvertimeEnd,
        currentTime
      );
      sessions.push(regularOvertimeSession);
    }
    
    // Weekly Overtime Session
    if (shift.weeklyOvertimeStart && shift.weeklyOvertimeEnd) {
      const weeklyOvertimeSession = this.createWorkSession(
        'WEEKLY_OVERTIME',
        'Weekly Overtime',
        shift.weeklyOvertimeStart,
        shift.weeklyOvertimeEnd,
        currentTime
      );
      sessions.push(weeklyOvertimeSession);
    }
    
    return sessions;
  }

  /**
   * Membuat sesi kerja individual dengan grace period
   */
  private static createWorkSession(
    type: 'MAIN_WORK' | 'REGULAR_OVERTIME' | 'WEEKLY_OVERTIME',
    name: string,
    startTime: Date,
    endTime: Date,
    currentTime: Date
  ): WorkSession {
    // Convert shift times ke hari ini
    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);
    
    const sessionStartTime = new Date(today);
    sessionStartTime.setHours(
      startTime.getHours(),
      startTime.getMinutes(),
      startTime.getSeconds(),
      0
    );
    
    const sessionEndTime = new Date(today);
    sessionEndTime.setHours(
      endTime.getHours(),
      endTime.getMinutes(),
      endTime.getSeconds(),
      0
    );
    
    // Handle cross-day sessions
    if (sessionEndTime <= sessionStartTime) {
      sessionEndTime.setDate(sessionEndTime.getDate() + 1);
    }
    
    // Grace period 15 menit setelah sesi berakhir
    const gracePeriodStart = new Date(sessionEndTime);
    const gracePeriodEnd = addMinutes(sessionEndTime, 15);
    
    // Tentukan status sesi
    const isActive = currentTime >= sessionStartTime && currentTime <= sessionEndTime;
    const isInGracePeriod = currentTime > sessionEndTime && currentTime <= gracePeriodEnd;
    
    return {
      type,
      name,
      startTime: sessionStartTime,
      endTime: sessionEndTime,
      gracePeriodStart,
      gracePeriodEnd,
      isActive,
      isInGracePeriod
    };
  }

  /**
   * Membuat keputusan checkout berdasarkan kondisi saat ini
   */
  private static makeCheckoutDecision(
    currentTime: Date,
    currentSession: WorkSession | null,
    currentGracePeriodSession: WorkSession | null,
    isManualOverride: boolean,
    allSessions: WorkSession[]
  ): CheckoutDecision {
    
    let checkoutTime = currentTime;
    let reason = '';
    let sessionType = 'NONE';
    let isGracePeriod = false;
    let isActiveSession = false;
    let isLateCheckout = false;
    let lateCheckoutLabel: string | null = null;
    let canCheckout = false;
    let useActualTime = true;

    // PRIORITY 1: Checkout dalam sesi aktif
    if (currentSession) {
      checkoutTime = currentTime; // Waktu aktual
      reason = `Checkout dalam sesi aktif ${currentSession.name}`;
      sessionType = currentSession.type;
      isActiveSession = true;
      canCheckout = true;
      useActualTime = true;
    }
    // PRIORITY 2: Checkout dalam grace period
    else if (currentGracePeriodSession) {
      checkoutTime = currentGracePeriodSession.endTime; // Waktu akhir sesi
      reason = `Checkout dalam grace period ${currentGracePeriodSession.name} - menggunakan waktu akhir sesi`;
      sessionType = currentGracePeriodSession.type;
      isGracePeriod = true;
      canCheckout = true;
      useActualTime = false;
    }
    // PRIORITY 3: Manual override (CASE 4 dengan label "Terlambat Checkout")
    else if (isManualOverride) {
      checkoutTime = currentTime; // Waktu aktual
      
      // Periksa apakah ini adalah checkout terlambat (setelah semua grace period)
      const isAfterAllGracePeriods = this.isAfterAllGracePeriods(currentTime, allSessions);
      
      if (isAfterAllGracePeriods) {
        isLateCheckout = true;
        lateCheckoutLabel = "Terlambat Checkout";
        reason = 'Manual override checkout setelah grace period - Terlambat Checkout';
      } else {
        reason = 'Manual override checkout - waktu aktual';
      }
      
      sessionType = 'MANUAL_OVERRIDE';
      canCheckout = true;
      useActualTime = true;
    }
    // PRIORITY 4: Tidak bisa checkout
    else {
      checkoutTime = currentTime;
      reason = 'Checkout tidak diizinkan - tidak dalam sesi aktif atau grace period';
      sessionType = 'NOT_ALLOWED';
      canCheckout = false;
      useActualTime = true;
    }
    
    return {
      checkoutTime,
      originalTime: currentTime,
      sessionType,
      isGracePeriod,
      isActiveSession,
      isLateCheckout,
      lateCheckoutLabel,
      reason,
      canCheckout,
      useActualTime
    };
  }

  /**
   * Periksa apakah waktu checkout setelah semua grace period berakhir
   */
  private static isAfterAllGracePeriods(currentTime: Date, allSessions: WorkSession[]): boolean {
    if (allSessions.length === 0) return true;
    
    // Cari grace period terakhir dari semua sesi
    const latestGracePeriodEnd = allSessions.reduce((latest, session) => {
      return session.gracePeriodEnd > latest ? session.gracePeriodEnd : latest;
    }, new Date(0));
    
    return currentTime > latestGracePeriodEnd;
  }

  /**
   * Validasi apakah checkout diizinkan pada waktu tertentu
   */
  static canCheckoutAtTime(
    shift: ExtendedShift,
    checkoutTime: Date
  ): boolean {
    const sessionInfo = this.determineCheckoutTime(shift, checkoutTime, false);
    return sessionInfo.canCheckout;
  }

  /**
   * Format debug info untuk troubleshooting
   */
  static getDebugInfo(
    shift: ExtendedShift,
    currentTime: Date = new Date()
  ): string {
    const sessionInfo = this.determineCheckoutTime(shift, currentTime);
    
    let debugInfo = `=== Session Checkout Debug Info ===\n`;
    debugInfo += `Current Time: ${currentTime.toISOString()}\n`;
    debugInfo += `Can Checkout: ${sessionInfo.canCheckout}\n`;
    debugInfo += `Checkout Decision: ${sessionInfo.checkoutDecision.reason}\n`;
    debugInfo += `Checkout Time: ${sessionInfo.checkoutDecision.checkoutTime.toISOString()}\n`;
    debugInfo += `Use Actual Time: ${sessionInfo.checkoutDecision.useActualTime}\n`;
    debugInfo += `Is Late Checkout: ${sessionInfo.checkoutDecision.isLateCheckout}\n`;
    debugInfo += `Late Checkout Label: ${sessionInfo.checkoutDecision.lateCheckoutLabel || 'None'}\n\n`;
    
    debugInfo += `Active Sessions (${sessionInfo.activeSessions.length}):\n`;
    sessionInfo.activeSessions.forEach(session => {
      debugInfo += `  - ${session.name} (${session.type}): ${session.startTime.toISOString()} - ${session.endTime.toISOString()}\n`;
    });
    
    debugInfo += `\nGrace Period Sessions (${sessionInfo.gracePeriodSessions.length}):\n`;
    sessionInfo.gracePeriodSessions.forEach(session => {
      debugInfo += `  - ${session.name} Grace (${session.type}): ${session.gracePeriodStart.toISOString()} - ${session.gracePeriodEnd.toISOString()}\n`;
    });
    
    return debugInfo;
  }

  /**
   * Test scenarios untuk validasi implementasi
   */
  static runTestScenarios(shift: ExtendedShift): string {
    let testResults = `=== Session Checkout Test Scenarios ===\n\n`;
    
    // Test Case 1: 16:30 (main work aktif) → 16:30 ✅
    const case1Time = new Date();
    case1Time.setHours(16, 30, 0, 0);
    const case1Result = this.determineCheckoutTime(shift, case1Time);
    testResults += `Case 1 - 16:30 (main work aktif):\n`;
    testResults += `  Expected: 16:30 (actual time)\n`;
    testResults += `  Actual: ${case1Result.checkoutDecision.checkoutTime.toLocaleTimeString()}\n`;
    testResults += `  Reason: ${case1Result.checkoutDecision.reason}\n`;
    testResults += `  Late Checkout: ${case1Result.checkoutDecision.isLateCheckout}\n`;
    testResults += `  ✓ ${case1Result.checkoutDecision.useActualTime && !case1Result.checkoutDecision.isLateCheckout ? 'PASS' : 'FAIL'}\n\n`;
    
    // Test Case 2: 17:05 (grace period main work) → 17:00 ✅
    const case2Time = new Date();
    case2Time.setHours(17, 5, 0, 0);
    const case2Result = this.determineCheckoutTime(shift, case2Time);
    testResults += `Case 2 - 17:05 (grace period main work):\n`;
    testResults += `  Expected: 17:00 (end of main work)\n`;
    testResults += `  Actual: ${case2Result.checkoutDecision.checkoutTime.toLocaleTimeString()}\n`;
    testResults += `  Reason: ${case2Result.checkoutDecision.reason}\n`;
    testResults += `  Late Checkout: ${case2Result.checkoutDecision.isLateCheckout}\n`;
    testResults += `  ✓ ${!case2Result.checkoutDecision.useActualTime && case2Result.checkoutDecision.isGracePeriod && !case2Result.checkoutDecision.isLateCheckout ? 'PASS' : 'FAIL'}\n\n`;
    
    // Test Case 3: 19:05 (grace period overtime) → 19:00 ✅
    const case3Time = new Date();
    case3Time.setHours(19, 5, 0, 0);
    const case3Result = this.determineCheckoutTime(shift, case3Time);
    testResults += `Case 3 - 19:05 (grace period overtime):\n`;
    testResults += `  Expected: 19:00 (end of overtime)\n`;
    testResults += `  Actual: ${case3Result.checkoutDecision.checkoutTime.toLocaleTimeString()}\n`;
    testResults += `  Reason: ${case3Result.checkoutDecision.reason}\n`;
    testResults += `  Late Checkout: ${case3Result.checkoutDecision.isLateCheckout}\n`;
    testResults += `  ✓ ${!case3Result.checkoutDecision.useActualTime && case3Result.checkoutDecision.isGracePeriod && !case3Result.checkoutDecision.isLateCheckout ? 'PASS' : 'FAIL'}\n\n`;
    
    // Test Case 4: 19:20 (setelah semua grace) → 19:20 + "Terlambat Checkout" ✅
    const case4Time = new Date();
    case4Time.setHours(19, 20, 0, 0);
    const case4Result = this.determineCheckoutTime(shift, case4Time, true); // Manual override
    testResults += `Case 4 - 19:20 (setelah semua grace, manual override):\n`;
    testResults += `  Expected: 19:20 (actual time) + "Terlambat Checkout"\n`;
    testResults += `  Actual: ${case4Result.checkoutDecision.checkoutTime.toLocaleTimeString()}\n`;
    testResults += `  Reason: ${case4Result.checkoutDecision.reason}\n`;
    testResults += `  Late Checkout: ${case4Result.checkoutDecision.isLateCheckout}\n`;
    testResults += `  Late Checkout Label: ${case4Result.checkoutDecision.lateCheckoutLabel || 'None'}\n`;
    testResults += `  ✓ ${case4Result.checkoutDecision.useActualTime && case4Result.checkoutDecision.isLateCheckout && case4Result.checkoutDecision.lateCheckoutLabel === "Terlambat Checkout" ? 'PASS' : 'FAIL'}\n\n`;
    
    return testResults;
  }
}
