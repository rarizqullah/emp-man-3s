import { NextResponse } from "next/server";
import { z } from "zod";
import { 
  getAllDepartments, 
  createDepartment,
  searchDepartments
} from '@/lib/db/department.service';

// Schema validasi untuk pembuatan departemen
const departmentCreateSchema = z.object({
  name: z.string().min(1, { message: "Nama departemen wajib diisi" }),
});

// Fungsi untuk mendapatkan semua departemen
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    
    if (search) {
      const departments = await searchDepartments(search);
      return NextResponse.json(departments);
    }
    
    const departments = await getAllDepartments();
    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data departemen" },
      { status: 500 }
    );
  }
}

// Fungsi untuk membuat departemen baru
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = departmentCreateSchema.parse(data);
    
    // Cek apakah departemen sudah ada
    const existingDepartments = await searchDepartments(validatedData.name);
    const exactMatch = existingDepartments.find(
      dept => dept.name.toLowerCase() === validatedData.name.toLowerCase()
    );
    
    if (exactMatch) {
      return NextResponse.json(
        { error: "Departemen dengan nama tersebut sudah ada" },
        { status: 400 }
      );
    }
    
    // Buat departemen baru
    const department = await createDepartment(validatedData);
    
    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat departemen baru:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat departemen" },
      { status: 500 }
    );
  }
} 