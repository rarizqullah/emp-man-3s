import { prisma } from '@/lib/db/prisma';

// Tipe data untuk parameter sub-department baru
export interface SubDepartmentCreateInput {
  name: string;
  departmentId: string;
}

// Tipe data untuk parameter update sub-department
export interface SubDepartmentUpdateInput {
  name?: string;
  departmentId?: string;
}

/**
 * Mendapatkan semua data sub-departemen
 */
export async function getAllSubDepartments() {
  return prisma.subDepartment.findMany({
    orderBy: { name: 'asc' },
    include: {
      department: true,
      _count: {
        select: {
          employees: true
        }
      }
    }
  });
}

/**
 * Mendapatkan data sub-departemen berdasarkan ID
 */
export async function getSubDepartmentById(id: string) {
  return prisma.subDepartment.findUnique({
    where: { id },
    include: {
      department: true,
      _count: {
        select: {
          employees: true
        }
      }
    }
  });
}

/**
 * Mendapatkan data sub-departemen berdasarkan departemen
 */
export async function getSubDepartmentsByDepartment(departmentId: string) {
  return prisma.subDepartment.findMany({
    where: { departmentId },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          employees: true
        }
      }
    }
  });
}

/**
 * Mencari sub-departemen berdasarkan nama
 */
export async function searchSubDepartments(searchTerm: string) {
  return prisma.subDepartment.findMany({
    where: {
      name: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    },
    orderBy: { name: 'asc' },
    include: {
      department: true,
      _count: {
        select: {
          employees: true
        }
      }
    }
  });
}

/**
 * Membuat sub-departemen baru
 */
export async function createSubDepartment(data: SubDepartmentCreateInput) {
  return prisma.subDepartment.create({
    data,
    include: {
      department: true
    }
  });
}

/**
 * Mengupdate data sub-departemen berdasarkan ID
 */
export async function updateSubDepartment(id: string, data: SubDepartmentUpdateInput) {
  return prisma.subDepartment.update({
    where: { id },
    data,
    include: {
      department: true
    }
  });
}

/**
 * Menghapus sub-departemen berdasarkan ID
 */
export async function deleteSubDepartment(id: string) {
  return prisma.subDepartment.delete({
    where: { id }
  });
}

/**
 * Mendapatkan jumlah karyawan yang menggunakan sub-departemen tertentu
 */
export async function getSubDepartmentEmployeeCount(id: string) {
  return prisma.employee.count({
    where: { subDepartmentId: id }
  });
}

/**
 * Cek apakah nama sub-departemen sudah ada dalam departemen yang sama
 */
export async function checkSubDepartmentDuplicate(name: string, departmentId: string, excludeId?: string) {
  const where: {
    name: { equals: string; mode: 'insensitive' };
    departmentId: string;
    id?: { not: string };
  } = {
    name: { equals: name, mode: 'insensitive' },
    departmentId
  };
  
  if (excludeId) {
    where.id = { not: excludeId };
  }
  
  const count = await prisma.subDepartment.count({ where });
  return count > 0;
} 