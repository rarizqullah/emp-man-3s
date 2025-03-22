import { prisma } from '@/lib/db';
import { PermissionStatus, PermissionType } from '@prisma/client';

export interface PermissionCreateInput {
  userId: string;
  type: PermissionType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status?: PermissionStatus;
}

export interface PermissionUpdateInput {
  type?: PermissionType;
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  status?: PermissionStatus;
}

// Mendapatkan semua izin/cuti
export async function getAllPermissions() {
  return prisma.permission.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          employee: {
            include: {
              department: true,
            },
          },
        },
      },
    },
    orderBy: {
      startDate: 'desc',
    },
  });
}

// Mendapatkan izin/cuti berdasarkan ID
export async function getPermissionById(id: string) {
  return prisma.permission.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          employee: {
            include: {
              department: true,
            },
          },
        },
      },
    },
  });
}

// Mendapatkan izin/cuti berdasarkan user
export async function getPermissionsByUser(userId: string) {
  return prisma.permission.findMany({
    where: {
      userId,
    },
    orderBy: {
      startDate: 'desc',
    },
  });
}

// Mendapatkan izin/cuti untuk rentang tanggal
export async function getPermissionsByDateRange(startDate: Date, endDate: Date) {
  return prisma.permission.findMany({
    where: {
      OR: [
        {
          // Izin yang dimulai dalam rentang
          startDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Izin yang berakhir dalam rentang
          endDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Izin yang mencakup seluruh rentang
          AND: [
            {
              startDate: {
                lte: startDate,
              },
            },
            {
              endDate: {
                gte: endDate,
              },
            },
          ],
        },
      ],
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          employee: {
            include: {
              department: true,
            },
          },
        },
      },
    },
    orderBy: {
      startDate: 'asc',
    },
  });
}

// Membuat izin/cuti baru
export async function createPermission(data: PermissionCreateInput) {
  return prisma.permission.create({
    data,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

// Update izin/cuti
export async function updatePermission(id: string, data: PermissionUpdateInput) {
  return prisma.permission.update({
    where: { id },
    data,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

// Hapus izin/cuti
export async function deletePermission(id: string) {
  return prisma.permission.delete({
    where: { id },
  });
}

// Menyetujui izin/cuti
export async function approvePermission(id: string) {
  return prisma.permission.update({
    where: { id },
    data: {
      status: 'APPROVED',
    },
  });
}

// Menolak izin/cuti
export async function rejectPermission(id: string) {
  return prisma.permission.update({
    where: { id },
    data: {
      status: 'REJECTED',
    },
  });
}

// Mendapatkan izin/cuti aktif hari ini
export async function getActivePermissionsToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return prisma.permission.findMany({
    where: {
      startDate: {
        lte: today,
      },
      endDate: {
        gte: today,
      },
      status: 'APPROVED',
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          employee: {
            include: {
              department: true,
            },
          },
        },
      },
    },
  });
} 