import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getShiftRotationGroupById,
  updateShiftRotationGroup,
  deleteShiftRotationGroup,
  getRotationPreview
} from '@/lib/db/shift-rotation.service';

// Schema validasi untuk update grup rotasi
const updateRotationGroupSchema = z.object({
  name: z.string().min(1, "Nama grup rotasi wajib diisi").optional(),
  description: z.string().optional(),
  subDepartmentId: z.string().uuid().optional().nullable(),
  anchorDate: z.string().transform((val) => new Date(val)).optional(),
  shiftAId: z.string().uuid().optional(),
  shiftBId: z.string().uuid().optional(),
  isActive: z.boolean().optional()
}).refine((data) => {
  if (data.shiftAId && data.shiftBId) {
    return data.shiftAId !== data.shiftBId;
  }
  return true;
}, {
  message: "Shift A dan Shift B harus berbeda",
  path: ["shiftBId"]
});

// GET /api/shift-rotation/[id]
// Mendapatkan detail grup rotasi
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[GET] /api/shift-rotation/${id} - Mengambil detail grup rotasi`);
    
    const group = await getShiftRotationGroupById(id);
    
    if (!group) {
      return NextResponse.json(
        {
          success: false,
          error: 'Grup rotasi tidak ditemukan'
        },
        { status: 404 }
      );
    }
    
    // Ambil preview rotasi untuk 8 minggu ke depan
    const preview = await getRotationPreview(id, 8);
    
    return NextResponse.json({
      success: true,
      data: {
        ...group,
        preview
      }
    });
  } catch (error) {
    console.error('Error mengambil detail grup rotasi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat mengambil detail grup rotasi'
      },
      { status: 500 }
    );
  }
}

// PUT /api/shift-rotation/[id]
// Update grup rotasi
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[PUT] /api/shift-rotation/${id} - Update grup rotasi`);
    
    const data = await request.json();
    console.log('Data update grup rotasi:', data);
    
    // Validasi input
    const validatedData = updateRotationGroupSchema.parse(data);
    
    // Update grup rotasi
    const updatedGroup = await updateShiftRotationGroup(id, validatedData);
    
    console.log('Grup rotasi berhasil diupdate:', updatedGroup.id);
    
    return NextResponse.json({
      success: true,
      data: updatedGroup,
      message: 'Grup rotasi berhasil diperbarui'
    });
    
  } catch (error) {
    console.error('Error update grup rotasi:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data tidak valid',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat memperbarui grup rotasi'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/shift-rotation/[id]
// Hapus grup rotasi
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[DELETE] /api/shift-rotation/${id} - Hapus grup rotasi`);
    
    await deleteShiftRotationGroup(id);
    
    console.log('Grup rotasi berhasil dihapus:', id);
    
    return NextResponse.json({
      success: true,
      message: 'Grup rotasi berhasil dihapus'
    });
    
  } catch (error) {
    console.error('Error hapus grup rotasi:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat menghapus grup rotasi'
      },
      { status: 500 }
    );
  }
}
