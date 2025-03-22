import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Tipe data untuk parameter position baru
export interface PositionCreateInput {
  name: string;
  description?: string | null;
  level?: number;
}

// Tipe data untuk update position
export type PositionUpdateInput = Partial<PositionCreateInput>;

// Mendapatkan semua jabatan
export async function getAllPositions() {
  try {
    return await prisma.$transaction(async (tx) => {
      // @ts-ignore - Model Position belum diupdate di TS tapi sudah ada di database
      return tx.position.findMany({
        orderBy: {
          level: 'asc',
        },
      });
    });
  } catch (error) {
    console.error('Error getting positions:', error);
    return [];
  }
}

// Mendapatkan jabatan berdasarkan ID
export async function getPositionById(id: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      // @ts-ignore - Model Position belum diupdate di TS tapi sudah ada di database
      return tx.position.findUnique({
        where: { id },
      });
    });
  } catch (error) {
    console.error('Error getting position:', error);
    return null;
  }
}

// Membuat jabatan baru
export async function createPosition(data: PositionCreateInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      // @ts-ignore - Model Position belum diupdate di TS tapi sudah ada di database
      return tx.position.create({
        data,
      });
    });
  } catch (error) {
    console.error('Error creating position:', error);
    throw error;
  }
}

// Update jabatan
export async function updatePosition(id: string, data: PositionUpdateInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      // @ts-ignore - Model Position belum diupdate di TS tapi sudah ada di database
      return tx.position.update({
        where: { id },
        data,
      });
    });
  } catch (error) {
    console.error('Error updating position:', error);
    return null;
  }
}

// Hapus jabatan
export async function deletePosition(id: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      // @ts-ignore - Model Position belum diupdate di TS tapi sudah ada di database
      return tx.position.delete({
        where: { id },
      });
    });
  } catch (error) {
    console.error('Error deleting position:', error);
    throw error;
  }
}

// Mencari jabatan berdasarkan nama
export async function searchPositions(searchTerm: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      // @ts-ignore - Model Position belum diupdate di TS tapi sudah ada di database
      return tx.position.findMany({
        where: {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        orderBy: {
          level: 'asc',
        },
      });
    });
  } catch (error) {
    console.error('Error searching positions:', error);
    return [];
  }
}

// Mendapatkan jumlah karyawan pada jabatan
export async function getEmployeeCountByPosition(positionId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      // @ts-ignore - Relasi dengan position belum diupdate di TS tapi sudah ada di database
      return tx.employee.count({
        where: {
          positionId,
        },
      });
    });
  } catch (error) {
    console.error('Error counting employees by position:', error);
    return 0;
  }
} 