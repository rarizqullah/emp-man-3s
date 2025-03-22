import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  deleteSubDepartment, 
  getSubDepartmentById, 
  getSubDepartmentEmployeeCount, 
  updateSubDepartment,
  checkSubDepartmentDuplicate
} from '@/lib/db/sub-department.service';
import { getDepartmentById } from '@/lib/db/department.service';

// Schema validasi untuk update sub-departemen
const subDepartmentUpdateSchema = z.object({
  name: z.string().min(1, "Nama sub-departemen wajib diisi").optional(),
  departmentId: z.string().min(1, "Departemen wajib dipilih").optional(),
});

// GET: Mendapatkan sub-departemen berdasarkan ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subDepartment = await getSubDepartmentById(params.id);
    
    if (!subDepartment) {
      return NextResponse.json(
        { error: 'Sub-departemen tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Dapatkan jumlah karyawan yang menggunakan sub-departemen ini
    const employeeCount = await getSubDepartmentEmployeeCount(params.id);
    
    return NextResponse.json({
      ...subDepartment,
      employeeCount
    });
  } catch (error) {
    console.error('Gagal mendapatkan detail sub-departemen:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendapatkan detail sub-departemen' },
      { status: 500 }
    );
  }
}

// PUT: Mengupdate sub-departemen berdasarkan ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = subDepartmentUpdateSchema.parse(data);
    
    // Pastikan sub-departemen ada
    const existingSubDepartment = await getSubDepartmentById(params.id);
    if (!existingSubDepartment) {
      return NextResponse.json(
        { error: 'Sub-departemen tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Jika departmentId berubah, periksa departemen baru
    if (validatedData.departmentId && validatedData.departmentId !== existingSubDepartment.departmentId) {
      const department = await getDepartmentById(validatedData.departmentId);
      if (!department) {
        return NextResponse.json(
          { error: 'Departemen tidak ditemukan' },
          { status: 404 }
        );
      }
    }
    
    // Periksa duplikat nama sub-departemen dalam departemen yang sama
    if (
      (validatedData.name && validatedData.name !== existingSubDepartment.name) || 
      (validatedData.departmentId && validatedData.departmentId !== existingSubDepartment.departmentId)
    ) {
      const name = validatedData.name || existingSubDepartment.name;
      const departmentId = validatedData.departmentId || existingSubDepartment.departmentId;
      
      const isDuplicate = await checkSubDepartmentDuplicate(name, departmentId, params.id);
      if (isDuplicate) {
        return NextResponse.json(
          { 
            error: 'Sub-departemen sudah ada', 
            message: 'Nama sub-departemen sudah digunakan dalam departemen yang sama' 
          },
          { status: 400 }
        );
      }
    }
    
    // Update sub-departemen
    const updatedSubDepartment = await updateSubDepartment(params.id, validatedData);
    
    return NextResponse.json(updatedSubDepartment);
  } catch (error) {
    console.error('Gagal mengupdate sub-departemen:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate sub-departemen' },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus sub-departemen berdasarkan ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Periksa apakah sub-departemen digunakan oleh karyawan
    const employeeCount = await getSubDepartmentEmployeeCount(params.id);
    
    if (employeeCount > 0) {
      return NextResponse.json(
        { 
          error: 'Sub-departemen tidak dapat dihapus', 
          message: `Sub-departemen ini digunakan oleh ${employeeCount} karyawan` 
        },
        { status: 400 }
      );
    }
    
    // Periksa apakah sub-departemen ada
    const existingSubDepartment = await getSubDepartmentById(params.id);
    if (!existingSubDepartment) {
      return NextResponse.json(
        { error: 'Sub-departemen tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Hapus sub-departemen
    await deleteSubDepartment(params.id);
    
    return NextResponse.json({ message: 'Sub-departemen berhasil dihapus' });
  } catch (error) {
    console.error('Gagal menghapus sub-departemen:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus sub-departemen' },
      { status: 500 }
    );
  }
} 