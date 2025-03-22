import { prisma } from '@/lib/db/prisma';

// Tipe data untuk parameter nilai tunjangan baru
export interface AllowanceValueCreateInput {
  allowanceTypeId: string;
  departmentId: string;
  contractType: "PERMANENT" | "TRAINING";
  value: number;
  description?: string | null;
}

// Tipe data untuk parameter nilai tunjangan yang diperbarui
export interface AllowanceValueUpdateInput {
  allowanceTypeId?: string;
  departmentId?: string;
  contractType?: "PERMANENT" | "TRAINING";
  value?: number;
  description?: string | null;
}

/**
 * Mendapatkan semua nilai tunjangan
 * Diurutkan berdasarkan tipe dan departemen, termasuk informasi tipe tunjangan
 */
export async function getAllAllowanceValues() {
  return await prisma.allowanceValue.findMany({
    orderBy: [
      {
        allowanceType: {
          name: "asc",
        },
      },
      {
        department: {
          name: "asc",
        },
      },
    ],
    include: {
      allowanceType: true,
      department: true,
    },
  });
}

/**
 * Mendapatkan nilai tunjangan berdasarkan ID
 * @param id - ID nilai tunjangan
 */
export async function getAllowanceValueById(id: string) {
  return await prisma.allowanceValue.findUnique({
    where: {
      id,
    },
    include: {
      allowanceType: true,
      department: true,
    },
  });
}

/**
 * Mendapatkan semua nilai tunjangan berdasarkan tipe tunjangan
 * @param allowanceTypeId - ID tipe tunjangan
 */
export async function getAllowanceValuesByType(allowanceTypeId: string) {
  return await prisma.allowanceValue.findMany({
    where: {
      allowanceTypeId,
    },
    orderBy: [
      {
        department: {
          name: "asc",
        },
      },
      {
        contractType: "asc",
      },
    ],
    include: {
      allowanceType: true,
      department: true,
    },
  });
}

/**
 * Mendapatkan nilai tunjangan berdasarkan departemen
 * @param departmentId - ID departemen
 */
export async function getAllowanceValuesByDepartment(departmentId: string) {
  return await prisma.allowanceValue.findMany({
    where: {
      departmentId,
    },
    orderBy: [
      {
        allowanceType: {
          name: "asc",
        },
      },
      {
        contractType: "asc",
      },
    ],
    include: {
      allowanceType: true,
      department: true,
    },
  });
}

/**
 * Mencari nilai tunjangan berdasarkan kata kunci
 * @param searchTerm - Kata kunci pencarian
 */
export async function searchAllowanceValues(searchTerm: string) {
  return await prisma.allowanceValue.findMany({
    where: {
      OR: [
        {
          allowanceType: {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          department: {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
      ],
    },
    orderBy: [
      {
        allowanceType: {
          name: "asc",
        },
      },
      {
        department: {
          name: "asc",
        },
      },
    ],
    include: {
      allowanceType: true,
      department: true,
    },
  });
}

/**
 * Membuat nilai tunjangan baru
 * @param data - Data nilai tunjangan baru
 */
export async function createAllowanceValue(data: AllowanceValueCreateInput) {
  return await prisma.allowanceValue.create({
    data: {
      allowanceTypeId: data.allowanceTypeId,
      departmentId: data.departmentId,
      contractType: data.contractType,
      value: data.value,
    },
    include: {
      allowanceType: true,
      department: true,
    },
  });
}

/**
 * Memperbarui nilai tunjangan yang sudah ada
 * @param id - ID nilai tunjangan
 * @param data - Data nilai tunjangan yang diperbarui
 */
export async function updateAllowanceValue(id: string, data: AllowanceValueUpdateInput) {
  return await prisma.allowanceValue.update({
    where: {
      id,
    },
    data,
    include: {
      allowanceType: true,
      department: true,
    },
  });
}

/**
 * Menghapus nilai tunjangan
 * @param id - ID nilai tunjangan
 */
export async function deleteAllowanceValue(id: string) {
  return await prisma.allowanceValue.delete({
    where: {
      id,
    },
  });
}

/**
 * Memeriksa duplikat nilai tunjangan (kombinasi tipe tunjangan, departemen, dan tipe kontrak)
 * @param allowanceTypeId - ID tipe tunjangan
 * @param departmentId - ID departemen
 * @param contractType - Tipe kontrak
 * @param excludeId - ID nilai tunjangan yang dikecualikan (untuk update)
 */
export async function checkAllowanceValueDuplicate(
  allowanceTypeId: string,
  departmentId: string,
  contractType: "PERMANENT" | "TRAINING",
  excludeId?: string
) {
  const where: any = {
    allowanceTypeId,
    departmentId,
    contractType,
  };

  if (excludeId) {
    where.id = {
      not: excludeId,
    };
  }

  const count = await prisma.allowanceValue.count({
    where,
  });

  return count > 0;
}

/**
 * Mendapatkan jumlah karyawan yang menggunakan nilai tunjangan
 * @param allowanceValueId - ID nilai tunjangan
 */
export async function getEmployeeCountByAllowanceValue(allowanceValueId: string) {
  return await prisma.employeeAllowance.count({
    where: {
      allowanceValueId,
    },
  });
} 