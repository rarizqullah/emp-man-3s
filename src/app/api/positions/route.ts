import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getAllPositions, 
  createPosition,
  searchPositions
} from '@/lib/db/position.service';

// Schema validasi untuk membuat jabatan baru
const positionCreateSchema = z.object({
  name: z.string().min(1, "Nama jabatan wajib diisi"),
  description: z.string().optional().nullable(),
  level: z.number().int().positive().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    
    if (search) {
      const positions = await searchPositions(search);
      return NextResponse.json(positions);
    }
    
    const positions = await getAllPositions();
    return NextResponse.json(positions);
  } catch (error) {
    console.error('Gagal mengambil data jabatan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data jabatan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = positionCreateSchema.parse(data);
    
    // Buat jabatan baru
    const position = await createPosition(validatedData);
    
    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat jabatan baru:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat jabatan' },
      { status: 500 }
    );
  }
} 