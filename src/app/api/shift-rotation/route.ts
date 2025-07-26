import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAllShiftRotationGroups,
  createShiftRotationGroup
} from '@/lib/db/shift-rotation.service';

// Schema validasi untuk membuat grup rotasi baru
const createRotationGroupSchema = z.object({
  name: z.string().min(1, "Nama grup rotasi wajib diisi"),
  description: z.string().optional(),
  subDepartmentId: z.string().uuid().optional().nullable(),
  anchorDate: z.string().transform((val) => new Date(val)),
  shiftAId: z.string().uuid("Shift A wajib dipilih"),
  shiftBId: z.string().uuid("Shift B wajib dipilih"),
  isActive: z.boolean().optional().default(true)
}).refine((data) => {
  return data.shiftAId !== data.shiftBId;
}, {
  message: "Shift A dan Shift B harus berbeda",
  path: ["shiftBId"]
});

// GET /api/shift-rotation
// Mendapatkan semua grup rotasi shift
export async function GET() {
  try {
    console.log('[GET] /api/shift-rotation - Mengambil semua grup rotasi');
    
    const rotationGroups = await getAllShiftRotationGroups();
    
    console.log(`Berhasil mengambil ${rotationGroups.length} grup rotasi`);
    
    return NextResponse.json({
      success: true,
      data: rotationGroups
    });
  } catch (error) {
    console.error('Error mengambil grup rotasi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat mengambil data grup rotasi'
      },
      { status: 500 }
    );
  }
}

// POST /api/shift-rotation
// Membuat grup rotasi shift baru
export async function POST(request: NextRequest) {
  try {
    console.log('[POST] /api/shift-rotation - Membuat grup rotasi baru');
    
    const data = await request.json();
    console.log('Data grup rotasi yang diterima:', data);
    
    // Validasi input
    const validatedData = createRotationGroupSchema.parse(data);
    
    // Buat grup rotasi baru
    const newGroup = await createShiftRotationGroup(validatedData);
    
    console.log('Grup rotasi berhasil dibuat:', newGroup.id);
    
    return NextResponse.json({
      success: true,
      data: newGroup,
      message: 'Grup rotasi berhasil dibuat'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error membuat grup rotasi:', error);
    
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
        error: 'Terjadi kesalahan saat membuat grup rotasi'
      },
      { status: 500 }
    );
  }
}
