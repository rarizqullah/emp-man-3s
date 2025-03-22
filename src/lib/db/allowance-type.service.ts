import { prisma } from '@/lib/db/prisma';

// Tipe data untuk parameter allowance type baru
export interface AllowanceTypeCreateInput {
  name: string;
  description?: string | null;
}

// Tipe data untuk parameter update allowance type
export interface AllowanceTypeUpdateInput {
  name?: string;
  description?: string | null;
}

/**
 * Mendapatkan semua data tipe tunjangan
 */
export async function getAllAllowanceTypes() {
  return prisma.allowanceType.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          allowanceValues: true
        }
      }
    }
  });
}

/**
 * Mendapatkan data tipe tunjangan berdasarkan ID
 */
export async function getAllowanceTypeById(id: string) {
  return prisma.allowanceType.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          allowanceValues: true
        }
      }
    }
  });
}

/**
 * Mencari tipe tunjangan berdasarkan nama
 */
export async function searchAllowanceTypes(searchTerm: string) {
  return prisma.allowanceType.findMany({
    where: {
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
        }
      ]
    },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          allowanceValues: true
        }
      }
    }
  });
}

/**
 * Membuat tipe tunjangan baru
 */
export async function createAllowanceType(data: AllowanceTypeCreateInput) {
  return prisma.allowanceType.create({
    data
  });
}

/**
 * Mengupdate data tipe tunjangan berdasarkan ID
 */
export async function updateAllowanceType(id: string, data: AllowanceTypeUpdateInput) {
  return prisma.allowanceType.update({
    where: { id },
    data
  });
}

/**
 * Menghapus tipe tunjangan berdasarkan ID
 */
export async function deleteAllowanceType(id: string) {
  return prisma.allowanceType.delete({
    where: { id }
  });
}

/**
 * Mendapatkan jumlah nilai tunjangan yang menggunakan tipe tunjangan tertentu
 */
export async function getAllowanceTypeValueCount(id: string) {
  return prisma.allowanceValue.count({
    where: { allowanceTypeId: id }
  });
}

/**
 * Cek apakah nama tipe tunjangan sudah ada
 */
export async function checkAllowanceTypeDuplicate(name: string, excludeId?: string) {
  const where: {
    name: { equals: string; mode: 'insensitive' };
    id?: { not: string };
  } = {
    name: { equals: name, mode: 'insensitive' }
  };
  
  if (excludeId) {
    where.id = { not: excludeId };
  }
  
  const count = await prisma.allowanceType.count({ where });
  return count > 0;
} 