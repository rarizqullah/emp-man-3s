import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as allowanceValueService from '@/lib/db/allowance-value.service';
import * as allowanceTypeService from '@/lib/db/allowance-type.service';
import * as departmentService from '@/lib/db/department.service';

// Schema validasi untuk pembaruan nilai tunjangan
const allowanceValueUpdateSchema = z.object({
  allowanceTypeId: z.string().min(1, { message: 'ID tipe tunjangan wajib diisi' }),
  departmentId: z.string().min(1, { message: 'ID departemen wajib diisi' }),
  contractType: z.enum(['PERMANENT', 'TRAINING'], { 
    message: 'Tipe kontrak harus PERMANENT atau TRAINING' 
  }),
  value: z.coerce.number().min(0, { message: 'Nilai tunjangan harus minimal 0' }),
  description: z.string().optional(),
});

// GET: Mendapatkan nilai tunjangan berdasarkan ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = params.id;
    const allowanceValue = await allowanceValueService.getAllowanceValueById(id);
    
    if (!allowanceValue) {
      return NextResponse.json(
        { error: 'Nilai tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(allowanceValue);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data nilai tunjangan' },
      { status: 500 }
    );
  }
}

// PUT: Mengupdate nilai tunjangan berdasarkan ID
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = params.id;
    const body = await request.json();
    
    // Cek apakah nilai tunjangan ada
    const existingAllowanceValue = await allowanceValueService.getAllowanceValueById(id);
    
    if (!existingAllowanceValue) {
      return NextResponse.json(
        { error: 'Nilai tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Validasi input
    const validationResult = allowanceValueUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', issues: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Cek apakah tipe tunjangan ada
    const allowanceType = await allowanceTypeService.getAllowanceTypeById(data.allowanceTypeId);
    
    if (!allowanceType) {
      return NextResponse.json(
        { error: 'Tipe tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Cek apakah departemen ada
    const department = await departmentService.getDepartmentById(data.departmentId);
    
    if (!department) {
      return NextResponse.json(
        { error: 'Departemen tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Cek apakah nilai tunjangan dengan kombinasi yang sama sudah ada
    const isDuplicate = await allowanceValueService.checkAllowanceValueDuplicate(
      data.allowanceTypeId,
      data.departmentId,
      data.contractType,
      id // Kecualikan ID saat ini untuk pembaruan
    );
    
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Nilai tunjangan untuk kombinasi tipe tunjangan, departemen, dan tipe kontrak ini sudah ada' },
        { status: 400 }
      );
    }
    
    // Perbarui nilai tunjangan
    const updatedAllowanceValue = await allowanceValueService.updateAllowanceValue(id, data);
    
    return NextResponse.json(updatedAllowanceValue);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui nilai tunjangan' },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus nilai tunjangan berdasarkan ID
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = params.id;
    
    // Cek apakah nilai tunjangan ada
    const existingAllowanceValue = await allowanceValueService.getAllowanceValueById(id);
    
    if (!existingAllowanceValue) {
      return NextResponse.json(
        { error: 'Nilai tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Cek apakah nilai tunjangan digunakan oleh karyawan
    const employeeCount = await allowanceValueService.getEmployeeCountByAllowanceValue(id);
    
    if (employeeCount > 0) {
      return NextResponse.json(
        { 
          error: 'Nilai tunjangan tidak dapat dihapus karena sedang digunakan oleh karyawan',
          count: employeeCount
        },
        { status: 400 }
      );
    }
    
    // Hapus nilai tunjangan
    await allowanceValueService.deleteAllowanceValue(id);
    
    return NextResponse.json(
      { message: 'Nilai tunjangan berhasil dihapus' }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus nilai tunjangan' },
      { status: 500 }
    );
  }
}