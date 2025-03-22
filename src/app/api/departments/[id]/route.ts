import { NextResponse } from "next/server";
import { z } from "zod";
import { 
  getDepartmentById, 
  updateDepartment, 
  deleteDepartment,
  getDepartmentEmployeeCount,
  getDepartmentSubDepartmentCount,
  searchDepartments
} from '@/lib/db/department.service';

// Schema validasi untuk update departemen
const departmentUpdateSchema = z.object({
  name: z.string().min(1, { message: "Nama departemen wajib diisi" }),
});

// Fungsi untuk mendapatkan departemen berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const department = await getDepartmentById(id);
    
    if (!department) {
      return NextResponse.json(
        { error: "Departemen tidak ditemukan" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(department);
  } catch (error) {
    console.error("Error fetching department:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data departemen" },
      { status: 500 }
    );
  }
}

// Fungsi untuk memperbarui departemen
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await request.json();
    
    // Validasi input
    const validatedData = departmentUpdateSchema.parse(data);
    
    // Cek apakah departemen ada
    const department = await getDepartmentById(id);
    
    if (!department) {
      return NextResponse.json(
        { error: "Departemen tidak ditemukan" },
        { status: 404 }
      );
    }
    
    // Cek apakah nama sudah digunakan departemen lain
    const existingDepartments = await searchDepartments(validatedData.name);
    const exactMatch = existingDepartments.find(
      dept => dept.name.toLowerCase() === validatedData.name.toLowerCase() && dept.id !== id
    );
    
    if (exactMatch) {
      return NextResponse.json(
        { error: "Departemen dengan nama tersebut sudah ada" },
        { status: 400 }
      );
    }
    
    // Update departemen
    const updatedDepartment = await updateDepartment(id, validatedData);
    
    return NextResponse.json(updatedDepartment);
  } catch (error) {
    console.error("Error updating department:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memperbarui departemen" },
      { status: 500 }
    );
  }
}

// Fungsi untuk menghapus departemen
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Cek apakah departemen ada
    const department = await getDepartmentById(id);
    
    if (!department) {
      return NextResponse.json(
        { error: "Departemen tidak ditemukan" },
        { status: 404 }
      );
    }
    
    // Cek apakah departemen sedang digunakan
    const employeeCount = await getDepartmentEmployeeCount(id);
    const subDepartmentCount = await getDepartmentSubDepartmentCount(id);
    
    if (employeeCount > 0 || subDepartmentCount > 0) {
      return NextResponse.json(
        { 
          error: "Departemen tidak dapat dihapus karena sedang digunakan", 
          employees: employeeCount,
          subDepartments: subDepartmentCount
        },
        { status: 400 }
      );
    }
    
    // Hapus departemen
    await deleteDepartment(id);
    
    return NextResponse.json(
      { message: "Departemen berhasil dihapus" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus departemen" },
      { status: 500 }
    );
  }
}
