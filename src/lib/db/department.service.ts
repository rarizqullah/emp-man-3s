import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

// Tipe data untuk parameter department baru
export interface DepartmentCreateInput {
  name: string;
}

// Tipe data untuk parameter update department
export interface DepartmentUpdateInput {
  name?: string;
}

/**
 * Mendapatkan semua data departemen
 */
export async function getAllDepartments() {
  return prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          employees: true,
          subDepartments: true
        }
      }
    }
  });
}

/**
 * Mendapatkan data departemen berdasarkan ID
 */
export async function getDepartmentById(id: string) {
  return prisma.department.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          employees: true,
          subDepartments: true
        }
      },
      subDepartments: {
        orderBy: { name: 'asc' }
      }
    }
  });
}

/**
 * Mencari departemen berdasarkan nama
 */
export async function searchDepartments(searchTerm: string) {
  return prisma.department.findMany({
    where: {
      name: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          employees: true,
          subDepartments: true
        }
      }
    }
  });
}

/**
 * Membuat departemen baru
 */
export async function createDepartment(data: DepartmentCreateInput) {
  return prisma.department.create({
    data
  });
}

/**
 * Mengupdate data departemen berdasarkan ID
 */
export async function updateDepartment(id: string, data: DepartmentUpdateInput) {
  return prisma.department.update({
    where: { id },
    data
  });
}

/**
 * Menghapus departemen berdasarkan ID
 */
export async function deleteDepartment(id: string) {
  return prisma.department.delete({
    where: { id }
  });
}

/**
 * Mendapatkan jumlah karyawan yang menggunakan departemen tertentu
 */
export async function getDepartmentEmployeeCount(id: string) {
  return prisma.employee.count({
    where: { departmentId: id }
  });
}

/**
 * Mendapatkan jumlah sub-departemen dalam departemen tertentu
 */
export async function getDepartmentSubDepartmentCount(id: string) {
  return prisma.subDepartment.count({
    where: { departmentId: id }
  });
} 