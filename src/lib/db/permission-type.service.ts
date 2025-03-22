import { PermissionType } from "@prisma/client"
import { prisma } from "../db/prisma"

// Interface untuk membuat jenis izin baru
export interface CreatePermissionTypeInput {
  name: string
  description: string
  maxDays?: number
}

// Interface untuk memperbarui jenis izin
export interface UpdatePermissionTypeInput {
  name?: string
  description?: string
  maxDays?: number
}

/**
 * Mendapatkan semua jenis izin dari database
 * @returns Promise array dari semua jenis izin
 */
export async function getAllPermissionTypes() {
  try {
    return await prisma.permissionType.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            permissions: true
          }
        }
      }
    })
  } catch (error) {
    console.error('Gagal mengambil jenis izin:', error)
    throw new Error('Gagal mengambil jenis izin dari database')
  }
}

/**
 * Mendapatkan jenis izin berdasarkan ID
 * @param id ID jenis izin
 * @returns Jenis izin
 */
export async function getPermissionTypeById(id: string) {
  try {
    return await prisma.permissionType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            permissions: true
          }
        }
      }
    })
  } catch (error) {
    console.error(`Gagal mengambil jenis izin ID ${id}:`, error)
    throw new Error('Gagal mengambil jenis izin dari database')
  }
}

/**
 * Mencari jenis izin berdasarkan istilah pencarian
 * @param search Istilah pencarian
 * @returns Array jenis izin yang cocok
 */
export async function searchPermissionTypes(search: string) {
  try {
    return await prisma.permissionType.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      },
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            permissions: true
          }
        }
      }
    })
  } catch (error) {
    console.error('Gagal mencari jenis izin:', error)
    throw new Error('Gagal mencari jenis izin dari database')
  }
}

/**
 * Membuat jenis izin baru
 * @param data Data jenis izin baru
 * @returns Jenis izin yang dibuat
 */
export async function createPermissionType(data: CreatePermissionTypeInput) {
  try {
    return await prisma.permissionType.create({
      data
    })
  } catch (error) {
    console.error('Gagal membuat jenis izin:', error)
    throw new Error('Gagal membuat jenis izin baru')
  }
}

/**
 * Memperbarui jenis izin yang ada
 * @param id ID jenis izin
 * @param data Data yang akan diperbarui
 * @returns Jenis izin yang diperbarui
 */
export async function updatePermissionType(id: string, data: UpdatePermissionTypeInput) {
  try {
    return await prisma.permissionType.update({
      where: { id },
      data
    })
  } catch (error) {
    console.error(`Gagal memperbarui jenis izin ID ${id}:`, error)
    throw new Error('Gagal memperbarui jenis izin')
  }
}

/**
 * Menghapus jenis izin berdasarkan ID
 * @param id ID jenis izin
 * @returns Jenis izin yang dihapus
 */
export async function deletePermissionType(id: string) {
  try {
    return await prisma.permissionType.delete({
      where: { id }
    })
  } catch (error) {
    console.error(`Gagal menghapus jenis izin ID ${id}:`, error)
    throw new Error('Gagal menghapus jenis izin')
  }
}

/**
 * Memeriksa apakah nama jenis izin sudah ada
 * @param name Nama jenis izin
 * @param excludeId ID jenis izin yang dikecualikan (untuk update)
 * @returns Boolean yang menunjukkan apakah nama sudah ada
 */
export async function checkPermissionTypeDuplicate(name: string, excludeId?: string) {
  try {
    const count = await prisma.permissionType.count({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId && { id: { not: excludeId } })
      }
    })
    return count > 0
  } catch (error) {
    console.error('Gagal memeriksa duplikat jenis izin:', error)
    throw new Error('Gagal memeriksa duplikat jenis izin')
  }
}

/**
 * Mendapatkan jumlah izin yang menggunakan jenis izin
 * @param id ID jenis izin
 * @returns Jumlah izin yang terkait
 */
export async function getPermissionCount(id: string) {
  try {
    return await prisma.permission.count({
      where: {
        typeId: id
      }
    })
  } catch (error) {
    console.error(`Gagal mendapatkan jumlah izin untuk jenis ID ${id}:`, error)
    throw new Error('Gagal mendapatkan jumlah izin terkait')
  }
}

/**
 * Mendapatkan detail jenis izin
 * @param type Jenis izin
 * @returns Objek yang berisi informasi tentang jenis izin
 */
export function getPermissionTypeDetails(type: PermissionType): {
  name: string
  description: string
  maxDays?: number
} {
  switch (type) {
    case "SICK":
      return {
        name: "Sakit",
        description: "Izin untuk ketidakhadiran karena sakit atau alasan kesehatan",
        maxDays: 14, // Contoh: maksimal 14 hari
      }
    case "VACATION":
      return {
        name: "Cuti",
        description: "Cuti tahunan yang dapat diambil oleh karyawan",
        maxDays: 12, // Contoh: maksimal 12 hari
      }
    case "PERSONAL":
      return {
        name: "Pribadi",
        description: "Izin untuk keperluan pribadi atau keluarga",
        maxDays: 3, // Contoh: maksimal 3 hari
      }
    case "OTHER":
      return {
        name: "Lainnya",
        description: "Izin untuk alasan lain yang tidak termasuk dalam kategori di atas",
      }
    default:
      return {
        name: type,
        description: "Jenis izin",
      }
  }
}

/**
 * Mendapatkan semua jenis izin dengan detailnya untuk kompatibilitas
 * @returns Array dari semua jenis izin dengan informasi detailnya
 */
export async function getAllPermissionTypesWithDetails() {
  const types = await getAllPermissionTypes()
  return types.map((type) => ({
    id: type.id,
    type: type.id, // Untuk kompatibilitas dengan kode lama
    name: type.name,
    description: type.description,
    maxDays: type.maxDays,
    permissionCount: type._count.permissions
  }))
} 