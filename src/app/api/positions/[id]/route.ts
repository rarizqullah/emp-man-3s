import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getPositionById, 
  updatePosition, 
  deletePosition,
  getEmployeeCountByPosition
} from '@/lib/db/position.service';

// Schema validasi untuk update jabatan
const positionUpdateSchema = z.object({
  name: z.string().min(1, "Nama jabatan wajib diisi").optional(),
  description: z.string().optional().nullable(),
  level: z.number().int().positive().optional(),
});

// Mendapatkan jabatan berdasarkan ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const position = await getPositionById(params.id);
    
    if (!position) {
      return NextResponse.json(
        { error: 'Jabatan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Mendapatkan jumlah karyawan pada jabatan ini
    const employeeCount = await getEmployeeCountByPosition(params.id);
    
    return NextResponse.json({
      ...position,
      employeeCount
    });
  } catch (error) {
    console.error('Gagal mengambil data jabatan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data jabatan' },
      { status: 500 }
    );
  }
}

// Update jabatan
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = positionUpdateSchema.parse(data);
    
    // Update jabatan
    const position = await updatePosition(params.id, validatedData);
    
    return NextResponse.json(position);
  } catch (error) {
    console.error('Gagal mengupdate jabatan:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate jabatan' },
      { status: 500 }
    );
  }
}

// Hapus jabatan
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Cek apakah jabatan digunakan oleh karyawan
    const employeeCount = await getEmployeeCountByPosition(params.id);
    
    if (employeeCount > 0) {
      return NextResponse.json(
        { 
          error: 'Jabatan tidak dapat dihapus', 
          message: `Jabatan ini digunakan oleh ${employeeCount} karyawan` 
        },
        { status: 400 }
      );
    }
    
    await deletePosition(params.id);
    
    return NextResponse.json({ message: 'Jabatan berhasil dihapus' });
  } catch (error) {
    console.error('Gagal menghapus jabatan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus jabatan' },
      { status: 500 }
    );
  }
} 