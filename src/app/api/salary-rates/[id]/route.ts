import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  deleteSalaryRate, 
  getSalaryRateById, 
  updateSalaryRate,
  checkSalaryRateDuplicate
} from '@/lib/db/salary-rate.service';
import { getDepartmentById } from '@/lib/db/department.service';

// Schema validasi untuk update tarif gaji
const salaryRateUpdateSchema = z.object({
  contractType: z.enum(['PERMANENT', 'TRAINING']).optional(),
  departmentId: z.string().min(1, "Departemen wajib dipilih").optional(),
  mainWorkHourRate: z.number().min(0, "Tarif jam kerja harus lebih dari 0").optional(),
  regularOvertimeRate: z.number().min(0, "Tarif lembur reguler harus lebih dari 0").optional(),
  weeklyOvertimeRate: z.number().min(0, "Tarif lembur mingguan harus lebih dari 0").optional(),
});

// GET: Mendapatkan tarif gaji berdasarkan ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const salaryRate = await getSalaryRateById(params.id);
    
    if (!salaryRate) {
      return NextResponse.json(
        { error: 'Tarif gaji tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(salaryRate);
  } catch (error) {
    console.error('Gagal mendapatkan detail tarif gaji:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendapatkan detail tarif gaji' },
      { status: 500 }
    );
  }
}

// PUT: Mengupdate tarif gaji berdasarkan ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = salaryRateUpdateSchema.parse(data);
    
    // Pastikan tarif gaji ada
    const existingSalaryRate = await getSalaryRateById(params.id);
    if (!existingSalaryRate) {
      return NextResponse.json(
        { error: 'Tarif gaji tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Jika departmentId berubah, periksa departemen baru
    if (validatedData.departmentId && validatedData.departmentId !== existingSalaryRate.departmentId) {
      const department = await getDepartmentById(validatedData.departmentId);
      if (!department) {
        return NextResponse.json(
          { error: 'Departemen tidak ditemukan' },
          { status: 404 }
        );
      }
    }
    
    // Jika departmentId atau contractType berubah, periksa duplikat
    if (
      (validatedData.departmentId && validatedData.departmentId !== existingSalaryRate.departmentId) ||
      (validatedData.contractType && validatedData.contractType !== existingSalaryRate.contractType)
    ) {
      const departmentId = validatedData.departmentId || existingSalaryRate.departmentId;
      const contractType = validatedData.contractType || existingSalaryRate.contractType;
      
      const isDuplicate = await checkSalaryRateDuplicate(
        departmentId,
        contractType,
        params.id
      );
      
      if (isDuplicate) {
        return NextResponse.json(
          { 
            error: 'Tarif gaji sudah ada',
            message: `Tarif gaji untuk departemen dan tipe kontrak ini sudah ada` 
          },
          { status: 400 }
        );
      }
    }
    
    // Update tarif gaji
    const updatedSalaryRate = await updateSalaryRate(params.id, validatedData);
    
    return NextResponse.json(updatedSalaryRate);
  } catch (error) {
    console.error('Gagal mengupdate tarif gaji:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate tarif gaji' },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus tarif gaji berdasarkan ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Periksa apakah tarif gaji ada
    const existingSalaryRate = await getSalaryRateById(params.id);
    if (!existingSalaryRate) {
      return NextResponse.json(
        { error: 'Tarif gaji tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Hapus tarif gaji
    await deleteSalaryRate(params.id);
    
    return NextResponse.json({ message: 'Tarif gaji berhasil dihapus' });
  } catch (error) {
    console.error('Gagal menghapus tarif gaji:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus tarif gaji' },
      { status: 500 }
    );
  }
} 