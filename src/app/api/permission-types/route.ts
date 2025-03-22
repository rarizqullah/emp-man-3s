import { NextRequest, NextResponse } from "next/server"
import * as z from "zod"
import { ZodError } from "zod"
import { PermissionType } from "@prisma/client"
import { 
  getAllPermissionTypesWithDetails,
  updatePermissionTypeDetails 
} from "@/lib/db/permission-type-mock.service"

// Skema validasi untuk pembaruan jenis izin
const updatePermissionTypeSchema = z.object({
  name: z.string().min(1, "Kode jenis izin tidak boleh kosong"),
  displayName: z.string().min(1, "Nama tampilan tidak boleh kosong"),
  description: z.string().min(1, "Deskripsi tidak boleh kosong"),
  maxDays: z.number().int().positive().optional(),
})

/**
 * GET: Mendapatkan semua jenis izin
 */
export async function GET() {
  try {
    // Dapatkan semua jenis izin dengan detail
    const permissionTypes = getAllPermissionTypesWithDetails();

    return NextResponse.json(permissionTypes);
  } catch (error) {
    console.error("Error saat mengambil data jenis izin:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data jenis izin" },
      { status: 500 }
    )
  }
}

/**
 * POST: Memperbarui jenis izin yang sudah ada (karena enum tidak bisa ditambahkan secara dinamis)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validasi input
    const validatedData = updatePermissionTypeSchema.parse(body)
    
    // Validasi bahwa nilai adalah salah satu dari enum yang valid
    const typeValue = validatedData.name.toUpperCase();
    const validTypes = Object.values(PermissionType) as string[];
    
    if (!validTypes.includes(typeValue)) {
      return NextResponse.json(
        { 
          error: `Jenis izin harus salah satu dari: ${validTypes.join(', ')}. 
                 Jenis izin baru hanya dapat ditambahkan dengan mengubah skema database.` 
        },
        { status: 400 }
      );
    }
    
    // Update jenis izin yang sudah ada
    try {
      const permissionType = typeValue as PermissionType;
      const updatedType = updatePermissionTypeDetails(permissionType, {
        name: validatedData.displayName, // Gunakan displayName sebagai nama yang ditampilkan
        description: validatedData.description,
        maxDays: validatedData.maxDays
      });
      
      return NextResponse.json(
        { 
          message: "Jenis izin berhasil diperbarui",
          data: updatedType
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error saat memperbarui jenis izin:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal memperbarui jenis izin";
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
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