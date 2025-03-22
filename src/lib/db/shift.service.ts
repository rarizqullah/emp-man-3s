import { prisma } from '@/lib/db/prisma';
import { ShiftType } from '@prisma/client';

// Tipe data untuk parameter shift baru
export interface ShiftCreateInput {
  name: string;
  shiftType: ShiftType;
  subDepartmentId?: string | null;
  mainWorkStart: Date;
  mainWorkEnd: Date;
  lunchBreakStart?: Date | null;
  lunchBreakEnd?: Date | null;
  regularOvertimeStart?: Date | null;
  regularOvertimeEnd?: Date | null;
  weeklyOvertimeStart?: Date | null;
  weeklyOvertimeEnd?: Date | null;
}

// Tipe data untuk parameter update shift
export interface ShiftUpdateInput {
  name?: string;
  shiftType?: ShiftType;
  subDepartmentId?: string | null;
  mainWorkStart?: Date;
  mainWorkEnd?: Date;
  lunchBreakStart?: Date | null;
  lunchBreakEnd?: Date | null;
  regularOvertimeStart?: Date | null;
  regularOvertimeEnd?: Date | null;
  weeklyOvertimeStart?: Date | null;
  weeklyOvertimeEnd?: Date | null;
}

/**
 * Mendapatkan semua data shift
 */
export async function getAllShifts() {
  return prisma.shift.findMany({
    orderBy: { name: 'asc' },
    include: {
      subDepartment: {
        include: {
          department: true
        }
      },
      _count: {
        select: {
          employees: true
        }
      }
    }
  });
}

/**
 * Mendapatkan data shift berdasarkan ID
 */
export async function getShiftById(id: string) {
  return prisma.shift.findUnique({
    where: { id },
    include: {
      subDepartment: {
        include: {
          department: true
        }
      },
      _count: {
        select: {
          employees: true
        }
      }
    }
  });
}

/**
 * Mendapatkan data shift berdasarkan sub-departemen
 */
export async function getShiftsBySubDepartment(subDepartmentId: string) {
  return prisma.shift.findMany({
    where: { subDepartmentId },
    orderBy: { name: 'asc' },
    include: {
      subDepartment: {
        include: {
          department: true
        }
      },
      _count: {
        select: {
          employees: true
        }
      }
    }
  });
}

/**
 * Mencari shift berdasarkan nama
 */
export async function searchShifts(searchTerm: string) {
  return prisma.shift.findMany({
    where: {
      name: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    },
    orderBy: { name: 'asc' },
    include: {
      subDepartment: {
        include: {
          department: true
        }
      },
      _count: {
        select: {
          employees: true
        }
      }
    }
  });
}

/**
 * Membuat shift baru
 */
export async function createShift(data: ShiftCreateInput) {
  return prisma.shift.create({
    data,
    include: {
      subDepartment: {
        include: {
          department: true
        }
      }
    }
  });
}

/**
 * Mengupdate data shift berdasarkan ID
 */
export async function updateShift(id: string, data: ShiftUpdateInput) {
  return prisma.shift.update({
    where: { id },
    data,
    include: {
      subDepartment: {
        include: {
          department: true
        }
      }
    }
  });
}

/**
 * Menghapus shift berdasarkan ID
 */
export async function deleteShift(id: string) {
  return prisma.shift.delete({
    where: { id }
  });
}

/**
 * Mendapatkan jumlah karyawan yang menggunakan shift tertentu
 */
export async function getShiftEmployeeCount(id: string) {
  return prisma.employee.count({
    where: { shiftId: id }
  });
}

/**
 * Cek apakah nama shift sudah ada
 */
export async function checkShiftDuplicate(name: string, excludeId?: string) {
  const where: {
    name: { equals: string; mode: 'insensitive' };
    id?: { not: string };
  } = {
    name: { equals: name, mode: 'insensitive' }
  };
  
  if (excludeId) {
    where.id = { not: excludeId };
  }
  
  const count = await prisma.shift.count({ where });
  return count > 0;
} 