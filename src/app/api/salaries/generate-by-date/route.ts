import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSalariesForPeriod } from '@/lib/db/salary.service';
import { parseISO } from 'date-fns';

// Schema validasi untuk generate salary berdasarkan date range
const generateSalaryByDateSchema = z.object({
  startDate: z.string().transform((val) => parseISO(val)),
  endDate: z.string().transform((val) => parseISO(val)),
  departmentId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = generateSalaryByDateSchema.parse(data);
    
    console.log(`Generating salaries for date range: ${validatedData.startDate.toISOString()} to ${validatedData.endDate.toISOString()}`);
    
    // Generate gaji untuk semua karyawan dalam periode tersebut
    const results = await generateSalariesForPeriod(
      validatedData.startDate, 
      validatedData.endDate, 
      validatedData.departmentId
    );
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `Berhasil menghitung gaji untuk ${results.length} karyawan`,
      period: {
        start: validatedData.startDate,
        end: validatedData.endDate
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error generating salaries by date:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validasi input gagal', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan saat menghitung gaji',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
