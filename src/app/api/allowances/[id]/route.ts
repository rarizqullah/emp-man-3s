import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as allowanceService from '@/lib/db/allowance.service';

// Schema validasi untuk update allowance
const allowanceUpdateSchema = z.object({
  name: z.string().min(1, "Nama tunjangan wajib diisi").optional(),
  description: z.string().optional().nullable(),
  applicableRule: z.string().min(1, "Aturan berlaku wajib diisi").optional(),
  umkAmount: z.coerce.number().min(0, "Jumlah UMK harus minimal 0").optional().nullable(),
  companyPercentage: z.coerce.number().min(0).max(100, "Persentase perusahaan harus antara 0-100").optional().nullable(),
  employeePercentage: z.coerce.number().min(0).max(100, "Persentase karyawan harus antara 0-100").optional().nullable(),
});

// GET: Mendapatkan allowance berdasarkan ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const allowance = await allowanceService.getAllowanceById(params.id);
    
    if (!allowance) {
      return NextResponse.json(
        { error: 'Tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Dapatkan jumlah karyawan yang menggunakan tunjangan ini
    const employeeCount = await allowanceService.getAllowanceEmployeeCount(params.id);
    
    return NextResponse.json({
      ...allowance,
      employeeCount
    });
  } catch (error) {
    console.error('Gagal mendapatkan detail tunjangan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendapatkan detail tunjangan' },
      { status: 500 }
    );
  }
}

// PUT: Mengupdate allowance berdasarkan ID
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = allowanceUpdateSchema.parse(data);
    
    // Pastikan allowance ada
    const existingAllowance = await allowanceService.getAllowanceById(params.id);
    if (!existingAllowance) {
      return NextResponse.json(
        { error: 'Tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Periksa duplikat nama jika nama diubah
    if (validatedData.name && validatedData.name !== existingAllowance.name) {
      const isDuplicate = await allowanceService.checkAllowanceDuplicate(validatedData.name, params.id);
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Nama tunjangan sudah digunakan' },
          { status: 400 }
        );
      }
    }
    
    // Update allowance
    const updatedAllowance = await allowanceService.updateAllowance(params.id, validatedData);
    
    return NextResponse.json(updatedAllowance);
  } catch (error) {
    console.error('Gagal mengupdate tunjangan:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate tunjangan' },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus allowance berdasarkan ID (hard delete)
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const allowanceId = params.id;
  
  console.log(`🗑️ DELETE request untuk allowance ID: ${allowanceId}`);
  
  try {
    // Pastikan allowance ada
    const existingAllowance = await allowanceService.getAllowanceById(allowanceId);
    if (!existingAllowance) {
      console.log(`❌ Allowance dengan ID ${allowanceId} tidak ditemukan`);
      return NextResponse.json(
        { error: 'Tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    console.log(`✅ Allowance ditemukan: ${existingAllowance.name}`);
    
    // Cek apakah allowance digunakan oleh karyawan
    const employeeCount = await allowanceService.getAllowanceEmployeeCount(allowanceId);
    console.log(`👥 Jumlah karyawan yang menggunakan allowance: ${employeeCount}`);
    
    if (employeeCount > 0) {
      console.log(`⚠️ Allowance tidak dapat dihapus karena digunakan oleh ${employeeCount} karyawan`);
      return NextResponse.json(
        { 
          error: 'Tunjangan tidak dapat dihapus karena sedang digunakan oleh karyawan',
          count: employeeCount
        },
        { status: 400 }
      );
    }
    
    // Hapus allowance (hard delete)
    console.log(`🔥 Melakukan hard delete allowance: ${allowanceId}`);
    const deletedAllowance = await allowanceService.deleteAllowance(allowanceId);
    console.log(`✅ Allowance berhasil dihapus:`, deletedAllowance);
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Tunjangan berhasil dihapus',
        deletedId: allowanceId
      }
    );
  } catch (error) {
    console.error('❌ Gagal menghapus tunjangan:', error);
    return NextResponse.json(
      { 
        error: 'Terjadi kesalahan saat menghapus tunjangan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
