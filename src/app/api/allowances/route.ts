import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as allowanceService from '@/lib/db/allowance.service';
import { logger, measurePerformance } from '@/lib/utils/logger';

// Cache untuk 5 menit karena allowances jarang berubah
export const revalidate = 300;

// Schema validasi untuk membuat allowance baru
const allowanceCreateSchema = z.object({
  name: z.string().min(1, "Nama tunjangan wajib diisi"),
  description: z.string().optional().nullable(),
  applicableRule: z.string().min(1, "Ketentuan berlaku wajib diisi"),
  umkAmount: z.coerce.number().min(0).optional().nullable(),
  companyPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  employeePercentage: z.coerce.number().min(0).max(100).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    
    logger.api('GET', '/api/allowances', { search: search || 'none' });
    
    const allowances = await measurePerformance(
      search ? `Search allowances: "${search}"` : 'Get all allowances',
      async () => {
    if (search) {
          return await allowanceService.searchAllowances(search);
    } else {
          return await allowanceService.getAllAllowances();
        }
    }
    );
    
    logger.success(`Returning ${allowances.length} allowances`);
    
    const response = NextResponse.json(allowances);
    // Cache di browser untuk 2 menit
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return response;
  } catch (error) {
    logger.error('Gagal mengambil data tunjangan:', error);
    return NextResponse.json(
      { 
        error: 'Terjadi kesalahan saat mengambil data tunjangan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = allowanceCreateSchema.parse(data);
    
    // Cek duplikat nama
    const isDuplicate = await allowanceService.checkAllowanceDuplicate(validatedData.name);
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Nama tunjangan sudah digunakan' },
        { status: 400 }
      );
    }
    
    // Buat allowance baru
    const allowance = await allowanceService.createAllowance(validatedData);
    
    return NextResponse.json(allowance, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat tunjangan baru:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat tunjangan' },
      { status: 500 }
    );
  }
}
