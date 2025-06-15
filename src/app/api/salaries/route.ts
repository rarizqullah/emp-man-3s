import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getSalaries, 
  generateSalariesForPeriod, 
  getSalaryStatistics,
  exportSalaryData
} from '@/lib/db/salary.service';
import { ContractType, PaymentStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

// Schema validasi untuk generate salary
const generateSalarySchema = z.object({
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12),
  departmentId: z.string().optional(),
  basis: z.enum(['DAILY', 'MONTHLY', 'YEARLY']).default('MONTHLY')
});

// Schema validasi untuk filter - dengan transform untuk menangani null values
const salaryFilterSchema = z.object({
  departmentId: z.string().nullish().transform(val => val || undefined),
  contractType: z.enum([ContractType.PERMANENT, ContractType.TRAINING]).nullish().transform(val => val || undefined),
  paymentStatus: z.enum([PaymentStatus.PAID, PaymentStatus.UNPAID]).nullish().transform(val => val || undefined),
  startDate: z.string().nullish().transform(val => val || undefined),
  endDate: z.string().nullish().transform(val => val || undefined),
  employeeId: z.string().nullish().transform(val => val || undefined),
  export: z.enum(['excel', 'csv']).nullish().transform(val => val || undefined)
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const rawParams = {
      departmentId: searchParams.get('departmentId'),
      contractType: searchParams.get('contractType'),
      paymentStatus: searchParams.get('paymentStatus'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      employeeId: searchParams.get('employeeId'),
      export: searchParams.get('export'),
      stats: searchParams.get('stats') // Parameter untuk mendapatkan statistik
    };

    // Validasi dan parse parameters
    const validatedParams = salaryFilterSchema.parse(rawParams);

    // Jika request untuk statistik
    if (rawParams.stats === 'true') {
      const startDate = validatedParams.startDate ? parseISO(validatedParams.startDate) : startOfMonth(new Date());
      const endDate = validatedParams.endDate ? parseISO(validatedParams.endDate) : endOfMonth(new Date());
      
      const statistics = await getSalaryStatistics(startDate, endDate);
      return NextResponse.json(statistics);
    }

    // Siapkan filter
    const filter: {
      departmentId?: string;
      contractType?: ContractType;
      paymentStatus?: PaymentStatus;
      employeeId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};
    
    if (validatedParams.departmentId && validatedParams.departmentId !== 'ALL') {
      filter.departmentId = validatedParams.departmentId;
    }
    
    if (validatedParams.contractType) {
      filter.contractType = validatedParams.contractType;
    }
    
    if (validatedParams.paymentStatus) {
      filter.paymentStatus = validatedParams.paymentStatus;
    }
    
    if (validatedParams.employeeId) {
      filter.employeeId = validatedParams.employeeId;
    }
    
    if (validatedParams.startDate && validatedParams.endDate) {
      filter.startDate = parseISO(validatedParams.startDate);
      filter.endDate = parseISO(validatedParams.endDate);
    }

    // Jika request untuk export
    if (validatedParams.export) {
      const exportData = await exportSalaryData(filter);
      
      if (validatedParams.export === 'excel') {
        // Return data untuk Excel export di frontend
        return NextResponse.json({
          type: 'export',
          format: 'excel',
          data: exportData,
          filename: `salary_data_${new Date().toISOString().split('T')[0]}.xlsx`
        });
      } else if (validatedParams.export === 'csv') {
        // Return data untuk CSV export di frontend
        return NextResponse.json({
          type: 'export',
          format: 'csv',
          data: exportData,
          filename: `salary_data_${new Date().toISOString().split('T')[0]}.csv`
        });
      }
    }

    // Request normal untuk daftar gaji
    const salaries = await getSalaries(filter);
    
    return NextResponse.json({
      success: true,
      data: salaries,
      total: salaries.length,
      message: 'Data gaji berhasil diambil'
    });

  } catch (error) {
    console.error('Error fetching salaries:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validasi parameter gagal', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan saat mengambil data gaji',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input untuk generate salary
    const validatedData = generateSalarySchema.parse(data);
    
    // Tentukan periode berdasarkan tahun dan bulan
    const periodStart = startOfMonth(new Date(validatedData.year, validatedData.month - 1));
    const periodEnd = endOfMonth(new Date(validatedData.year, validatedData.month - 1));
    
    console.log(`Generating salaries for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    
    // Generate gaji untuk semua karyawan dalam periode tersebut
    const results = await generateSalariesForPeriod(
      periodStart, 
      periodEnd, 
      validatedData.departmentId
    );
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `Berhasil menghitung gaji untuk ${results.length} karyawan`,
      period: {
        start: periodStart,
        end: periodEnd,
        month: validatedData.month,
        year: validatedData.year
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error generating salaries:', error);
    
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