import { NextResponse } from 'next/server';
import { getEmployeesWithFaceData } from '@/lib/db/employee.service';

// Mendapatkan semua karyawan dengan data wajah
export async function GET() {
  try {
    const employees = await getEmployeesWithFaceData();
    
    return NextResponse.json({
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error('Gagal mengambil data wajah karyawan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data wajah karyawan' },
      { status: 500 }
    );
  }
} 