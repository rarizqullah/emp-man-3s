import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as allowanceService from '@/lib/db/allowance.service';

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
    
    console.log(`📋 GET request untuk allowances, search: ${search || 'none'}`);
    
    let allowances;
    if (search) {
      allowances = await allowanceService.searchAllowances(search);
      console.log(`🔍 Search hasil: ${allowances.length} items`);
    } else {
      allowances = await allowanceService.getAllAllowances();
      console.log(`📊 Total allowances: ${allowances.length} items`);
    }
    
    // Log untuk debugging
    console.log(`✅ Returning allowances data:`, allowances.map(a => ({ id: a.id, name: a.name, isActive: a.isActive })));
    
    return NextResponse.json(allowances);
  } catch (error) {
    console.error('❌ Gagal mengambil data tunjangan:', error);
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
