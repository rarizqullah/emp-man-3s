import { prisma } from '@/lib/db/prisma';
import { ContractType } from '@prisma/client';

// Tipe data untuk parameter salary rate baru
export interface SalaryRateCreateInput {
  contractType: ContractType;
  departmentId: string;
  mainWorkHourRate: number;
  regularOvertimeRate: number;
  weeklyOvertimeRate: number;
}

// Tipe data untuk parameter update salary rate
export interface SalaryRateUpdateInput {
  contractType?: ContractType;
  departmentId?: string;
  mainWorkHourRate?: number;
  regularOvertimeRate?: number;
  weeklyOvertimeRate?: number;
}

/**
 * Mendapatkan semua data tarif gaji
 */
export async function getAllSalaryRates() {
  return prisma.salaryRate.findMany({
    include: {
      department: true
    },
    orderBy: [
      { departmentId: 'asc' },
      { contractType: 'asc' }
    ]
  });
}

/**
 * Mendapatkan data tarif gaji berdasarkan departemen
 */
export async function getSalaryRatesByDepartment(departmentId: string) {
  return prisma.salaryRate.findMany({
    where: { departmentId },
    include: {
      department: true
    },
    orderBy: { contractType: 'asc' }
  });
}

/**
 * Mendapatkan data tarif gaji berdasarkan ID
 */
export async function getSalaryRateById(id: string) {
  return prisma.salaryRate.findUnique({
    where: { id },
    include: {
      department: true
    }
  });
}

/**
 * Mendapatkan data tarif gaji berdasarkan departemen dan tipe kontrak
 */
export async function getSalaryRateByDepartmentAndContract(departmentId: string, contractType: ContractType) {
  return prisma.salaryRate.findUnique({
    where: {
      contractType_departmentId: {
        contractType,
        departmentId
      }
    },
    include: {
      department: true
    }
  });
}

/**
 * Membuat tarif gaji baru
 */
export async function createSalaryRate(data: SalaryRateCreateInput) {
  return prisma.salaryRate.create({
    data,
    include: {
      department: true
    }
  });
}

/**
 * Mengupdate data tarif gaji berdasarkan ID
 */
export async function updateSalaryRate(id: string, data: SalaryRateUpdateInput) {
  return prisma.salaryRate.update({
    where: { id },
    data,
    include: {
      department: true
    }
  });
}

/**
 * Menghapus tarif gaji berdasarkan ID
 */
export async function deleteSalaryRate(id: string) {
  return prisma.salaryRate.delete({
    where: { id }
  });
}

/**
 * Mengecek apakah kombinasi departemen dan tipe kontrak sudah ada
 */
export async function checkSalaryRateDuplicate(departmentId: string, contractType: ContractType, excludeId?: string) {
  const where: any = {
    departmentId,
    contractType
  };
  
  if (excludeId) {
    where.id = { not: excludeId };
  }
  
  const count = await prisma.salaryRate.count({ where });
  return count > 0;
} 