import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { 
  getAllSubDepartments, 
  createSubDepartment,
  searchSubDepartments,
  getSubDepartmentsByDepartment
} from '@/lib/db/sub-department.service';
import { getDepartmentById } from '@/lib/db/department.service';

// Schema validasi untuk membuat sub-departemen baru
const subDepartmentCreateSchema = z.object({
  name: z.string().min(1, "Nama sub-departemen wajib diisi"),
  departmentId: z.string().min(1, "Departemen wajib dipilih"),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const departmentId = searchParams.get('departmentId');
    
    if (departmentId) {
      // Cek apakah departemen ada
      const department = await getDepartmentById(departmentId);
      if (!department) {
        return NextResponse.json(
          { error: 'Departemen tidak ditemukan' },
          { status: 404 }
        );
      }
      
      const subDepartments = await getSubDepartmentsByDepartment(departmentId);
      return NextResponse.json(subDepartments);
    }
    
    if (search) {
      const subDepartments = await searchSubDepartments(search);
      return NextResponse.json(subDepartments);
    }
    
    const subDepartments = await getAllSubDepartments();
    return NextResponse.json(subDepartments);
  } catch (error) {
    console.error('Gagal mengambil data sub-departemen:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data sub-departemen' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = subDepartmentCreateSchema.parse(data);
    
    // Cek apakah departemen ada
    const department = await getDepartmentById(validatedData.departmentId);
    if (!department) {
      return NextResponse.json(
        { error: 'Departemen tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Buat sub-departemen baru
    const subDepartment = await createSubDepartment(validatedData);
    
    return NextResponse.json(subDepartment, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat sub-departemen baru:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat sub-departemen' },
      { status: 500 }
    );
  }
} 