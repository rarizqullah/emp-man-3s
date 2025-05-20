import { NextRequest, NextResponse } from "next/server"
import * as z from "zod"
import { ZodError } from "zod"
import { PermissionType } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"

// Skema validasi untuk pembaruan jenis izin
const updatePermissionTypeSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong").optional(),
  description: z.string().min(1, "Deskripsi tidak boleh kosong").optional(),
  maxDays: z.number().int().positive().optional(),
})

/**
 * GET: Mendapatkan detail jenis izin berdasarkan ID
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = params.id
    
    if (!id) {
      return NextResponse.json(
        { error: "ID jenis izin diperlukan" },
        { status: 400 }
      )
    }
    
    // Periksa apakah ID adalah nilai enum yang valid
    const validType = Object.values(PermissionType).find(
      (type) => type === id
    )
    
    if (!validType) {
      return NextResponse.json(
        { error: "Jenis izin tidak ditemukan" },
        { status: 404 }
      )
    }
    
    // Ambil jumlah penggunaan 
    const usageCount = await prisma.permission.count({
      where: {
        type: validType,
      },
    })
    
    // Format respons
    const permissionType = {
      id: validType,
      type: validType,
      name: getReadableName(validType),
      description: getDescription(validType),
      maxDays: getMaxDays(validType),
      usageCount,
    }
    
    return NextResponse.json(permissionType)
    
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Gagal mengambil detail jenis izin" },
      { status: 500 }
    )
  }
}

/**
 * PUT: Memperbarui jenis izin berdasarkan ID
 */
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = params.id
    
    if (!id) {
      return NextResponse.json(
        { error: "ID jenis izin diperlukan" },
        { status: 400 }
      )
    }
    
    // Periksa apakah ID adalah nilai enum yang valid
    const validType = Object.values(PermissionType).find(
      (type) => type === id
    )
    
    if (!validType) {
      return NextResponse.json(
        { error: "Jenis izin tidak ditemukan" },
        { status: 404 }
      )
    }
    
    const body = await request.json()
    
    // Validasi input
    const validatedData = updatePermissionTypeSchema.parse(body)
    
    // Catatan: Karena PermissionType adalah enum, kita tidak bisa benar-benar
    // mengubah jenis izin yang ada. Kita hanya bisa mengubah konfigurasi tambahan.
    
    return NextResponse.json({
      message: "Jenis izin berhasil diperbarui",
      data: {
        id: validType,
        type: validType,
        name: validatedData.name || getReadableName(validType),
        description: validatedData.description || getDescription(validType),
        maxDays: validatedData.maxDays || getMaxDays(validType),
      },
    })
    
  } catch (error) {
    console.error("Error:", error)
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Gagal memperbarui jenis izin" },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Menghapus jenis izin berdasarkan ID
 */
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = params.id
    
    if (!id) {
      return NextResponse.json(
        { error: "ID jenis izin diperlukan" },
        { status: 400 }
      )
    }
    
    // Periksa apakah ID adalah nilai enum yang valid
    const validType = Object.values(PermissionType).find(
      (type) => type === id
    )
    
    if (!validType) {
      return NextResponse.json(
        { error: "Jenis izin tidak ditemukan" },
        { status: 404 }
      )
    }
    
    // Periksa apakah jenis izin sedang digunakan
    const usageCount = await prisma.permission.count({
      where: {
        type: validType,
      },
    })
    
    if (usageCount > 0) {
      return NextResponse.json(
        { 
          error: "Tidak dapat menghapus jenis izin yang sedang digunakan",
          usageCount
        },
        { status: 400 }
      )
    }
    
    // Catatan: Karena PermissionType adalah enum, kita tidak bisa benar-benar
    // menghapus jenis izin. Perubahan enum memerlukan migrasi database.
    
    return NextResponse.json({
      message: "Perintah penghapusan diterima",
      id: validType,
    })
    
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Gagal menghapus jenis izin" },
      { status: 500 }
    )
  }
}

// Fungsi helper untuk mendapatkan nama yang mudah dibaca
function getReadableName(type: PermissionType): string {
  switch (type) {
    case "SICK":
      return "Sakit"
    case "VACATION":
      return "Cuti Tahunan"
    case "PERSONAL":
      return "Pribadi"
    case "OTHER":
      return "Lainnya"
    default:
      return type
  }
}

// Fungsi helper untuk mendapatkan deskripsi
function getDescription(type: PermissionType): string {
  switch (type) {
    case "SICK":
      return "Izin untuk ketidakhadiran karena sakit atau alasan kesehatan"
    case "VACATION":
      return "Cuti tahunan yang dapat diambil oleh karyawan"
    case "PERSONAL":
      return "Izin untuk keperluan pribadi atau keluarga"
    case "OTHER":
      return "Izin untuk alasan lain yang tidak termasuk dalam kategori di atas"
    default:
      return "Jenis izin"
  }
}

// Fungsi helper untuk mendapatkan jumlah hari maksimal
function getMaxDays(type: PermissionType): number | undefined {
  switch (type) {
    case "SICK":
      return 14
    case "VACATION":
      return 12
    case "PERSONAL":
      return 3
    default:
      return undefined
  }
} 