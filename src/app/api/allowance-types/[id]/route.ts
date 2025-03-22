import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  deleteAllowanceType, 
  getAllowanceTypeById, 
  getAllowanceTypeValueCount, 
  updateAllowanceType,
  checkAllowanceTypeDuplicate
} from '@/lib/db/allowance-type.service';

// Schema validasi untuk update tipe tunjangan
const allowanceTypeUpdateSchema = z.object({
  name: z.string().min(1, "Nama tipe tunjangan wajib diisi").optional(),
  description: z.string().optional().nullable(),
});

// GET: Mendapatkan tipe tunjangan berdasarkan ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const allowanceType = await getAllowanceTypeById(params.id);
    
    if (!allowanceType) {
      return NextResponse.json(
        { error: 'Tipe tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Dapatkan jumlah nilai tunjangan yang menggunakan tipe ini
    const valueCount = await getAllowanceTypeValueCount(params.id);
    
    return NextResponse.json({
      ...allowanceType,
      valueCount
    });
  } catch (error) {
    console.error('Gagal mendapatkan detail tipe tunjangan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendapatkan detail tipe tunjangan' },
      { status: 500 }
    );
  }
}

// PUT: Mengupdate tipe tunjangan berdasarkan ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = allowanceTypeUpdateSchema.parse(data);
    
    // Pastikan tipe tunjangan ada
    const existingAllowanceType = await getAllowanceTypeById(params.id);
    if (!existingAllowanceType) {
      return NextResponse.json(
        { error: 'Tipe tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Periksa duplikat nama jika nama diubah
    if (validatedData.name && validatedData.name !== existingAllowanceType.name) {
      const isDuplicate = await checkAllowanceTypeDuplicate(validatedData.name, params.id);
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Nama tipe tunjangan sudah digunakan' },
          { status: 400 }
        );
      }
    }
    
    // Update tipe tunjangan
    const updatedAllowanceType = await updateAllowanceType(params.id, validatedData);
    
    return NextResponse.json(updatedAllowanceType);
  } catch (error) {
    console.error('Gagal mengupdate tipe tunjangan:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate tipe tunjangan' },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus tipe tunjangan berdasarkan ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Periksa apakah tipe tunjangan digunakan oleh nilai tunjangan
    const valueCount = await getAllowanceTypeValueCount(params.id);
    
    if (valueCount > 0) {
      return NextResponse.json(
        { 
          error: 'Tipe tunjangan tidak dapat dihapus', 
          message: `Tipe tunjangan ini digunakan oleh ${valueCount} nilai tunjangan` 
        },
        { status: 400 }
      );
    }
    
    // Periksa apakah tipe tunjangan ada
    const existingAllowanceType = await getAllowanceTypeById(params.id);
    if (!existingAllowanceType) {
      return NextResponse.json(
        { error: 'Tipe tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Hapus tipe tunjangan
    await deleteAllowanceType(params.id);
    
    return NextResponse.json({ message: 'Tipe tunjangan berhasil dihapus' });
  } catch (error) {
    console.error('Gagal menghapus tipe tunjangan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus tipe tunjangan' },
      { status: 500 }
    );
  }
} 