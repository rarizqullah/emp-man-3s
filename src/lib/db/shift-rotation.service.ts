import { prisma } from '@/lib/db';
import { differenceInWeeks, startOfWeek } from 'date-fns';

export interface ShiftRotationGroupCreateInput {
  name: string;
  description?: string;
  subDepartmentId?: string | null;
  anchorDate: Date;
  shiftAId: string;
  shiftBId: string;
  isActive?: boolean;
}

export interface ShiftRotationGroupUpdateInput {
  name?: string;
  description?: string;
  subDepartmentId?: string | null;
  anchorDate?: Date;
  shiftAId?: string;
  shiftBId?: string;
  isActive?: boolean;
}

/**
 * Mendapatkan semua grup rotasi shift
 */
export async function getAllShiftRotationGroups() {
  return prisma.shiftRotationGroup.findMany({
    include: {
      shiftA: true,
      shiftB: true,
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
    },
    orderBy: {
      name: 'asc'
    }
  });
}

/**
 * Mendapatkan grup rotasi shift berdasarkan ID
 */
export async function getShiftRotationGroupById(id: string) {
  return prisma.shiftRotationGroup.findUnique({
    where: { id },
    include: {
      shiftA: true,
      shiftB: true,
      subDepartment: {
        include: {
          department: true
        }
      },
      employees: {
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          department: {
            select: {
              name: true
            }
          },
          subDepartment: {
            select: {
              name: true
            }
          }
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
 * Membuat grup rotasi shift baru
 */
export async function createShiftRotationGroup(data: ShiftRotationGroupCreateInput) {
  // Validasi bahwa kedua shift berbeda
  if (data.shiftAId === data.shiftBId) {
    throw new Error('Shift A dan Shift B harus berbeda');
  }

  // Pastikan shift tidak digunakan di grup rotasi lain
  const existingGroupWithShiftA = await prisma.shiftRotationGroup.findFirst({
    where: {
      OR: [
        { shiftAId: data.shiftAId },
        { shiftBId: data.shiftAId }
      ]
    }
  });

  const existingGroupWithShiftB = await prisma.shiftRotationGroup.findFirst({
    where: {
      OR: [
        { shiftAId: data.shiftBId },
        { shiftBId: data.shiftBId }
      ]
    }
  });

  if (existingGroupWithShiftA) {
    throw new Error(`Shift A sudah digunakan dalam grup rotasi "${existingGroupWithShiftA.name}"`);
  }

  if (existingGroupWithShiftB) {
    throw new Error(`Shift B sudah digunakan dalam grup rotasi "${existingGroupWithShiftB.name}"`);
  }

  return prisma.shiftRotationGroup.create({
    data: {
      name: data.name,
      description: data.description,
      subDepartmentId: data.subDepartmentId,
      anchorDate: startOfWeek(data.anchorDate, { weekStartsOn: 1 }), // Mulai dari Senin
      shiftAId: data.shiftAId,
      shiftBId: data.shiftBId,
      isActive: data.isActive ?? true
    },
    include: {
      shiftA: true,
      shiftB: true,
      subDepartment: {
        include: {
          department: true
        }
      }
    }
  });
}

/**
 * Update grup rotasi shift
 */
export async function updateShiftRotationGroup(id: string, data: ShiftRotationGroupUpdateInput) {
  // Jika mengubah shift, validasi bahwa keduanya berbeda
  if (data.shiftAId && data.shiftBId && data.shiftAId === data.shiftBId) {
    throw new Error('Shift A dan Shift B harus berbeda');
  }

  // Jika mengubah anchorDate, pastikan dimulai dari Senin
  if (data.anchorDate) {
    data.anchorDate = startOfWeek(data.anchorDate, { weekStartsOn: 1 });
  }

  return prisma.shiftRotationGroup.update({
    where: { id },
    data,
    include: {
      shiftA: true,
      shiftB: true,
      subDepartment: {
        include: {
          department: true
        }
      }
    }
  });
}

/**
 * Hapus grup rotasi shift
 */
export async function deleteShiftRotationGroup(id: string) {
  // Cek apakah ada karyawan yang terdaftar dalam grup ini
  const group = await prisma.shiftRotationGroup.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          employees: true
        }
      }
    }
  });

  if (!group) {
    throw new Error('Grup rotasi tidak ditemukan');
  }

  if (group._count.employees > 0) {
    throw new Error('Tidak dapat menghapus grup rotasi yang masih memiliki karyawan');
  }

  return prisma.shiftRotationGroup.delete({
    where: { id }
  });
}

/**
 * Menambahkan karyawan ke grup rotasi
 */
export async function addEmployeeToRotationGroup(employeeId: string, groupId: string) {
  return prisma.employee.update({
    where: { id: employeeId },
    data: {
      shiftRotationGroupId: groupId
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      },
      shiftRotationGroup: {
        include: {
          shiftA: true,
          shiftB: true
        }
      }
    }
  });
}

/**
 * Menghapus karyawan dari grup rotasi
 */
export async function removeEmployeeFromRotationGroup(employeeId: string) {
  return prisma.employee.update({
    where: { id: employeeId },
    data: {
      shiftRotationGroupId: null
    }
  });
}

/**
 * Menentukan shift aktif untuk karyawan dalam grup rotasi
 * @param anchorDate - Tanggal referensi dimulainya rotasi
 * @param currentDate - Tanggal saat ini untuk pengecekan
 * @param shiftAId - ID dari Shift A
 * @param shiftBId - ID dari Shift B
 * @returns ID shift yang aktif (shiftAId atau shiftBId)
 */
export function getActiveShiftFromRotation(
  anchorDate: Date,
  currentDate: Date,
  shiftAId: string,
  shiftBId: string
): string {
  // Pastikan kedua tanggal dimulai dari awal minggu (Senin)
  const startOfAnchorWeek = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Hitung selisih minggu antara tanggal saat ini dan tanggal jangkar
  const weekDifference = differenceInWeeks(startOfCurrentWeek, startOfAnchorWeek);

  // Jika selisih minggu adalah genap (0, 2, 4, ...), gunakan Shift A
  // Jika ganjil (1, 3, 5, ...), gunakan Shift B
  if (weekDifference % 2 === 0) {
    return shiftAId;
  } else {
    return shiftBId;
  }
}

/**
 * Mendapatkan shift aktif untuk karyawan berdasarkan grup rotasi mereka
 */
export async function getEmployeeActiveShift(employeeId: string, date?: Date): Promise<string> {
  const currentDate = date || new Date();
  
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      shiftRotationGroup: true
    }
  });

  if (!employee) {
    throw new Error('Karyawan tidak ditemukan');
  }

  // Jika karyawan tidak dalam grup rotasi, gunakan shift tetap mereka
  if (!employee.shiftRotationGroup) {
    return employee.shiftId;
  }

  // Jika dalam grup rotasi, hitung shift aktif berdasarkan rotasi
  return getActiveShiftFromRotation(
    employee.shiftRotationGroup.anchorDate,
    currentDate,
    employee.shiftRotationGroup.shiftAId,
    employee.shiftRotationGroup.shiftBId
  );
}

/**
 * Mendapatkan karyawan berdasarkan grup rotasi
 */
export async function getEmployeesByRotationGroup(groupId: string) {
  return prisma.employee.findMany({
    where: {
      shiftRotationGroupId: groupId,
      deletedAt: null
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      },
      department: {
        select: {
          name: true
        }
      },
      subDepartment: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      user: {
        name: 'asc'
      }
    }
  });
}

/**
 * Mendapatkan preview rotasi untuk minggu-minggu tertentu
 */
export async function getRotationPreview(groupId: string, weeksCount: number = 4) {
  const group = await getShiftRotationGroupById(groupId);
  if (!group) {
    throw new Error('Grup rotasi tidak ditemukan');
  }

  const preview = [];
  const currentDate = new Date();
  
  for (let i = 0; i < weeksCount; i++) {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() + (i * 7));
    
    const activeShiftId = getActiveShiftFromRotation(
      group.anchorDate,
      weekStart,
      group.shiftAId,
      group.shiftBId
    );
    
    const activeShift = activeShiftId === group.shiftAId ? group.shiftA : group.shiftB;
    
    preview.push({
      weekNumber: i + 1,
      weekStart: startOfWeek(weekStart, { weekStartsOn: 1 }),
      activeShift: {
        id: activeShift.id,
        name: activeShift.name,
        type: activeShift.shiftType
      }
    });
  }
  
  return preview;
}
