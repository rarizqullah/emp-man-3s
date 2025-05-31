import { toast } from 'react-hot-toast';

// Interface untuk data karyawan
export interface EmployeeData {
  id: string;
  name: string;
  employeeId?: string;
  departmentName?: string;
  shiftName?: string;
  hasFaceData?: boolean;
}

// Interface untuk data kehadiran
export interface AttendanceData {
  id?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status?: string;
  mainWorkHours?: number | null;
  regularOvertimeHours?: number | null;
  weeklyOvertimeHours?: number | null;
}

// Helper function untuk membuat data employee dummy berdasarkan userId
function createDummyEmployeeData(userId: string): EmployeeData {
  // Gunakan userId sebagai seed untuk membuat data yang konsisten
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const idSuffix = hash % 1000;
  
  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations'];
  const shifts = ['Shift Pagi', 'Shift Siang', 'Non-Shift', 'Shift Malam', 'Fleksibel'];
  
  // Gunakan hash untuk memilih departemen dan shift secara konsisten
  const deptIndex = hash % departments.length;
  const shiftIndex = (hash * 3) % shifts.length;
  
  return {
    id: `EMP${idSuffix.toString().padStart(3, '0')}`,
    name: `Karyawan ${idSuffix}`,
    employeeId: `EMP${idSuffix.toString().padStart(3, '0')}`,
    departmentName: departments[deptIndex],
    shiftName: shifts[shiftIndex],
    hasFaceData: true
  };
}

/**
 * Fungsi untuk mendapatkan data karyawan saat ini
 * Dengan fallback data dummy
 */
export async function getCurrentEmployeeInfo(userId: string): Promise<EmployeeData | null> {
  // Return dummy data for UI compatibility
  return createDummyEmployeeData(userId);
}

/**
 * Fungsi untuk mendapatkan kehadiran hari ini
 * Dengan fallback data dummy
 */
export async function getTodayAttendance(_employeeId: string): Promise<AttendanceData | null> {
  // Return dummy data for UI compatibility
        return createDummyAttendanceData();
}

/**
 * Helper function untuk membuat data dummy presensi hari ini
 */
function createDummyAttendanceData(): AttendanceData {
  const now = new Date();
  const morning = new Date(now);
  morning.setHours(8, 0, 0, 0);
  
  // Cek apakah sudah lewat jam 12 untuk menentukan checkout
  const isAfternoon = now.getHours() >= 12;
  
  return {
    id: `dummy-today-${Date.now()}`,
    checkInTime: morning.toISOString(),
    checkOutTime: isAfternoon ? now.toISOString() : null,
    status: isAfternoon ? 'Completed' : 'InProgress',
    mainWorkHours: isAfternoon ? 8 : null,
    regularOvertimeHours: 0,
    weeklyOvertimeHours: 0
  };
}

/**
 * Fungsi untuk mendapatkan semua kehadiran
 * Dengan fallback data dummy
 */
export async function getAllAttendance(): Promise<AttendanceData[] | null> {
  // Return dummy data for UI compatibility
  return createDummyAttendanceList();
}

/**
 * Helper function untuk membuat daftar dummy presensi
 */
function createDummyAttendanceList(): AttendanceData[] {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  // Buat 3 entri dummy untuk daftar presensi
  return [
    {
      id: `dummy-list-1`,
      checkInTime: new Date(now.setHours(8, 0, 0, 0)).toISOString(),
      checkOutTime: now.getHours() >= 17 ? new Date(now.setHours(17, 0, 0, 0)).toISOString() : null,
      status: now.getHours() >= 17 ? 'Completed' : 'InProgress',
      mainWorkHours: now.getHours() >= 17 ? 8 : null,
      regularOvertimeHours: 0,
      weeklyOvertimeHours: 0
    },
    {
      id: `dummy-list-2`,
      checkInTime: new Date(yesterday.setHours(8, 0, 0, 0)).toISOString(),
      checkOutTime: new Date(yesterday.setHours(17, 0, 0, 0)).toISOString(),
      status: 'Completed',
      mainWorkHours: 8,
      regularOvertimeHours: 1,
      weeklyOvertimeHours: 0
    },
    {
      id: `dummy-list-3`,
      checkInTime: new Date(twoDaysAgo.setHours(8, 0, 0, 0)).toISOString(),
      checkOutTime: new Date(twoDaysAgo.setHours(17, 0, 0, 0)).toISOString(),
      status: 'Completed',
      mainWorkHours: 8,
      regularOvertimeHours: 0,
      weeklyOvertimeHours: 0
    }
  ];
}

/**
 * Dummy function untuk check-in
 */
export async function doCheckIn(_employeeId: string): Promise<boolean> {
  // Just show toast
  toast.success('Check-in berhasil (UI mode)');
      return true;
}

/**
 * Dummy function untuk check-out
 */
export async function doCheckOut(_employeeId: string): Promise<boolean> {
  // Just show toast
  toast.success('Check-out berhasil (UI mode)');
      return true;
}

/**
 * Fungsi untuk mengkonversi dari EmployeeData ke EmployeeInfoType untuk digunakan di halaman attendance
 */
export function convertToEmployeeInfo(data: EmployeeData | null): { id: string; name: string; department: string; shift: string } | null {
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    department: data.departmentName || 'N/A',
    shift: data.shiftName || 'N/A'
  };
} 