import { NextRequest, NextResponse } from 'next/server';
import { getEmployeesWithExpiringContracts } from '@/lib/db/employee.service';

// Mendapatkan karyawan dengan kontrak yang akan segera berakhir
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // Default 30 hari jika tidak ada parameter
    const daysThreshold = searchParams.get('days') 
      ? parseInt(searchParams.get('days') as string, 10) 
      : 30;
    
    // Validasi input
    if (isNaN(daysThreshold) || daysThreshold <= 0 || daysThreshold > 365) {
      return NextResponse.json(
        { error: 'Parameter days harus berupa angka antara 1 dan 365' },
        { status: 400 }
      );
    }
    
    // Dapatkan karyawan dengan kontrak yang akan berakhir
    const employees = await getEmployeesWithExpiringContracts(daysThreshold);
    
    return NextResponse.json({
      daysThreshold,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error('Gagal mengambil data kontrak karyawan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data kontrak karyawan' },
      { status: 500 }
    );
  }
} 