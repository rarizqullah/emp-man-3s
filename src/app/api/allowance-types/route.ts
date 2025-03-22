import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getAllAllowanceTypes, 
  createAllowanceType,
  searchAllowanceTypes,
  checkAllowanceTypeDuplicate
} from '@/lib/db/allowance-type.service';

// Schema validasi untuk membuat tipe tunjangan baru
const allowanceTypeCreateSchema = z.object({
  name: z.string().min(1, "Nama tipe tunjangan wajib diisi"),
  description: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    
    if (search) {
      const allowanceTypes = await searchAllowanceTypes(search);
      return NextResponse.json(allowanceTypes);
    }
    
    const allowanceTypes = await getAllAllowanceTypes();
    return NextResponse.json(allowanceTypes);
  } catch (error) {
    console.error('Gagal mengambil data tipe tunjangan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data tipe tunjangan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = allowanceTypeCreateSchema.parse(data);
    
    // Cek duplikat nama
    const isDuplicate = await checkAllowanceTypeDuplicate(validatedData.name);
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Nama tipe tunjangan sudah digunakan' },
        { status: 400 }
      );
    }
    
    // Buat tipe tunjangan baru
    const allowanceType = await createAllowanceType(validatedData);
    
    return NextResponse.json(allowanceType, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat tipe tunjangan baru:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat tipe tunjangan' },
      { status: 500 }
    );
  }
} 