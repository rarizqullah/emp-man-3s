import { prisma } from '@/lib/db/prisma';

// Tipe data untuk parameter allowance baru
export interface AllowanceCreateInput {
  name: string;
  description?: string | null;
  applicableRule: string;
  umkAmount?: number | null;
  companyPercentage?: number | null;
  employeePercentage?: number | null;
}

// Tipe data untuk parameter update allowance
export interface AllowanceUpdateInput {
  name?: string;
  description?: string | null;
  applicableRule?: string;
  umkAmount?: number | null;
  companyPercentage?: number | null;
  employeePercentage?: number | null;
  isActive?: boolean;
}

/**
 * Kalkulasi nominal berdasarkan persentase dan UMK
 */
function calculateAmounts(umkAmount?: number | null, companyPercentage?: number | null, employeePercentage?: number | null) {
  const companyAmount = umkAmount && companyPercentage ? (umkAmount * companyPercentage) / 100 : null;
  const employeeAmount = umkAmount && employeePercentage ? (umkAmount * employeePercentage) / 100 : null;
  
  return { companyAmount, employeeAmount };
}

/**
 * Mendapatkan semua data allowance aktif
 */
export const getAllAllowances = async () => {
  return prisma.allowance.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          employeeAllowances: {
            where: {
              isActive: true
            }
          }
        }
      }
    }
  });
};

/**
 * Mendapatkan data allowance berdasarkan ID
 */
export const getAllowanceById = async (id: string) => {
  return prisma.allowance.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          employeeAllowances: true
        }
      }
    }
  });
};

/**
 * Mencari allowance berdasarkan nama
 */
export const searchAllowances = async (searchTerm: string) => {
  return prisma.allowance.findMany({
    where: {
      AND: [
        { isActive: true },
        {
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              applicableRule: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          ]
        }
      ]
    },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          employeeAllowances: {
            where: {
              isActive: true
            }
          }
        }
      }
    }
  });
};

/**
 * Membuat allowance baru
 */
export const createAllowance = async (data: AllowanceCreateInput) => {
  const { companyAmount, employeeAmount } = calculateAmounts(
    data.umkAmount,
    data.companyPercentage,
    data.employeePercentage
  );

  return prisma.allowance.create({
    data: {
      ...data,
      companyAmount,
      employeeAmount
    }
  });
};

/**
 * Mengupdate data allowance berdasarkan ID
 */
export const updateAllowance = async (id: string, data: AllowanceUpdateInput) => {
  // Ambil data existing untuk kalkulasi
  const existingAllowance = await getAllowanceById(id);
  if (!existingAllowance) {
    throw new Error('Allowance tidak ditemukan');
  }

  const umkAmount = data.umkAmount !== undefined ? data.umkAmount : existingAllowance.umkAmount;
  const companyPercentage = data.companyPercentage !== undefined ? data.companyPercentage : existingAllowance.companyPercentage;
  const employeePercentage = data.employeePercentage !== undefined ? data.employeePercentage : existingAllowance.employeePercentage;

  const { companyAmount, employeeAmount } = calculateAmounts(
    umkAmount,
    companyPercentage,
    employeePercentage
  );

  return prisma.allowance.update({
    where: { id },
    data: {
      ...data,
      companyAmount,
      employeeAmount
    }
  });
};

/**
 * Menghapus allowance berdasarkan ID (hard delete)
 */
export const deleteAllowance = async (id: string) => {
  // Hapus semua relasi employee_allowance terlebih dahulu
  await prisma.employeeAllowance.deleteMany({
    where: { allowanceId: id }
  });
  
  // Kemudian hapus allowance
  return prisma.allowance.delete({
    where: { id }
  });
};

/**
 * Mendapatkan jumlah karyawan yang menggunakan allowance tertentu
 */
export const getAllowanceEmployeeCount = async (id: string) => {
  return prisma.employeeAllowance.count({
    where: { 
      allowanceId: id,
      isActive: true
    }
  });
};

/**
 * Cek apakah nama allowance sudah ada
 */
export const checkAllowanceDuplicate = async (name: string, excludeId?: string) => {
  const where: {
    name: { equals: string; mode: 'insensitive' };
    id?: { not: string };
    isActive: boolean;
  } = {
    name: { equals: name, mode: 'insensitive' },
    isActive: true
  };
  
  if (excludeId) {
    where.id = { not: excludeId };
  }
  
  const count = await prisma.allowance.count({ where });
  return count > 0;
};

/**
 * Mendapatkan allowance yang aktif untuk karyawan
 */
export const getEmployeeAllowances = async (employeeId: string) => {
  return prisma.employeeAllowance.findMany({
    where: {
      employeeId,
      isActive: true,
      allowance: {
        isActive: true
      }
    },
    include: {
      allowance: true
    }
  });
};

/**
 * Menambahkan allowance ke karyawan
 */
export const addAllowanceToEmployee = async (employeeId: string, allowanceId: string) => {
  return prisma.employeeAllowance.upsert({
    where: {
      employeeId_allowanceId: {
        employeeId,
        allowanceId
      }
    },
    update: {
      isActive: true
    },
    create: {
      employeeId,
      allowanceId,
      isActive: true
    }
  });
};

/**
 * Menghapus allowance dari karyawan
 */
export const removeAllowanceFromEmployee = async (employeeId: string, allowanceId: string) => {
  return prisma.employeeAllowance.updateMany({
    where: {
      employeeId,
      allowanceId
    },
    data: {
      isActive: false
    }
  });
};
