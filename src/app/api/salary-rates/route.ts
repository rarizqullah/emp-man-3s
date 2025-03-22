import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getAllSalaryRates, 
  createSalaryRate,
  getSalaryRatesByDepartment,
  checkSalaryRateDuplicate
} from '@/lib/db/salary-rate.service';
import { ContractType } from '@prisma/client';

// Schema validasi untuk membuat tarif gaji baru
const salaryRateCreateSchema = z.object({
  departmentId: z.string().uuid(),
  contractType: z.enum([ContractType.PERMANENT, ContractType.TRAINING]),
  mainWorkHourRate: z.coerce.number().min(0),
  regularOvertimeRate: z.coerce.number().min(0),
  weeklyOvertimeRate: z.coerce.number().min(0),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');
    
    // Jika ada filter departemen, gunakan fungsi khusus
    if (departmentId) {
      const salaryRates = await getSalaryRatesByDepartment(departmentId);
      return NextResponse.json(salaryRates);
    }
    
    // Jika tidak ada filter, ambil semua data
    const salaryRates = await getAllSalaryRates();
    return NextResponse.json(salaryRates);
  } catch (error) {
    console.error('Gagal mengambil data tarif gaji:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data tarif gaji' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = salaryRateCreateSchema.parse(data);
    
    // Cek duplikat tarif gaji (tidak boleh ada duplikat departemen dan tipe kontrak)
    const isDuplicate = await checkSalaryRateDuplicate(
      validatedData.departmentId, 
      validatedData.contractType
    );
    
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Tarif gaji untuk departemen dan tipe kontrak ini sudah ada' },
        { status: 400 }
      );
    }
    
    // Buat tarif gaji baru
    const salaryRate = await createSalaryRate(validatedData);
    
    return NextResponse.json(salaryRate, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat tarif gaji baru:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat tarif gaji' },
      { status: 500 }
    );
  }
} 