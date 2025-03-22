import { PermissionType } from "@prisma/client"

// Tipe data untuk detail permission type
export interface PermissionTypeDetails {
  type: PermissionType
  name: string
  description: string
  maxDays?: number
  usageCount?: number
}

// Menyimpan konfigurasi tambahan untuk setiap jenis izin
// Ini bisa digantikan dengan database atau penyimpanan persisten lainnya
const permissionTypeDetails: Record<PermissionType, PermissionTypeDetails> = {
  SICK: {
    type: "SICK",
    name: "Sakit",
    description: "Izin karena sakit dengan atau tanpa surat dokter",
    maxDays: 14,
    usageCount: 0
  },
  VACATION: {
    type: "VACATION",
    name: "Cuti Tahunan",
    description: "Cuti tahunan yang tersedia bagi semua karyawan",
    maxDays: 12,
    usageCount: 0
  },
  PERSONAL: {
    type: "PERSONAL",
    name: "Keperluan Pribadi",
    description: "Izin untuk keperluan pribadi mendesak",
    maxDays: 3,
    usageCount: 0
  },
  OTHER: {
    type: "OTHER",
    name: "Lainnya",
    description: "Jenis izin lainnya",
    maxDays: undefined,
    usageCount: 0
  }
};

/**
 * Mendapatkan semua jenis izin dengan detailnya
 */
export function getAllPermissionTypesWithDetails(): PermissionTypeDetails[] {
  return Object.values(permissionTypeDetails);
}

/**
 * Mendapatkan detail jenis izin berdasarkan tipe
 */
export function getPermissionTypeDetails(type: PermissionType): PermissionTypeDetails | null {
  return permissionTypeDetails[type] || null;
}

/**
 * Update detail jenis izin
 */
export function updatePermissionTypeDetails(
  type: PermissionType, 
  updates: {
    name?: string;
    description?: string;
    maxDays?: number | undefined;
  }
): PermissionTypeDetails {
  const current = permissionTypeDetails[type];
  
  if (!current) {
    throw new Error(`Jenis izin ${type} tidak ditemukan`);
  }
  
  // Update detail
  if (updates.name) current.name = updates.name;
  if (updates.description) current.description = updates.description;
  if ('maxDays' in updates) current.maxDays = updates.maxDays;
  
  return current;
}

/**
 * Mendapatkan nama yang mudah dibaca untuk jenis izin
 */
export function getReadableName(type: PermissionType): string {
  return permissionTypeDetails[type]?.name || type;
}

/**
 * Mendapatkan deskripsi untuk jenis izin
 */
export function getDescription(type: PermissionType): string {
  return permissionTypeDetails[type]?.description || "Tidak ada deskripsi";
}

/**
 * Mendapatkan jumlah hari maksimum untuk jenis izin
 */
export function getMaxDays(type: PermissionType): number | undefined {
  return permissionTypeDetails[type]?.maxDays;
} 