import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSalariesForPeriod } from '@/lib/db/salary.service';
import { parseISO, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Schema validasi untuk generate salary berdasarkan date range
const generateSalaryByDateSchema = z.object({
  startDate: z.string().transform((val) => {
    const date = parseISO(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid start date format');
    }
    return date;
  }),
  endDate: z.string().transform((val) => {
    const date = parseISO(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid end date format');
    }
    return date;
  }),
  departmentId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/salaries/generate-by-date called');
    
    const data = await request.json();
    console.log('Request data:', data);
    
    // Validasi input
    const validatedData = generateSalaryByDateSchema.parse(data);
    console.log('Validated data:', {
      startDate: validatedData.startDate.toISOString(),
      endDate: validatedData.endDate.toISOString(),
      departmentId: validatedData.departmentId
    });
    
    // Validasi tanggal - end date harus setelah start date
    if (validatedData.endDate < validatedData.startDate) {
      return NextResponse.json({
        success: false,
        error: 'Tanggal akhir tidak boleh sebelum tanggal mulai'
      }, { status: 400 });
    }
    
    console.log(`Generating salaries for date range: ${validatedData.startDate.toISOString()} to ${validatedData.endDate.toISOString()}`);
    
    // Generate gaji untuk semua karyawan dalam periode tersebut
    const results = await generateSalariesForPeriod(
      validatedData.startDate, 
      validatedData.endDate, 
      validatedData.departmentId
    );
    
    console.log(`Generated ${results.length} salary records`);
    
    const periodText = format(validatedData.startDate, 'MMMM yyyy', { locale: localeId });
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `Berhasil menghitung gaji untuk ${results.length} karyawan periode ${periodText}`,
      period: {
        start: validatedData.startDate,
        end: validatedData.endDate,
        text: periodText
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error generating salaries by date:', error);
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      return NextResponse.json(
        { 
          success: false,
          error: 'Validasi input gagal', 
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
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
