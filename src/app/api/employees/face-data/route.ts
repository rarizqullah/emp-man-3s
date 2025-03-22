import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    // Ambil hanya data karyawan yang memiliki data wajah
    const employees = await prisma.employee.findMany({
      where: {
        faceData: {
          not: null
        }
      },
      select: {
        id: true,
        employeeId: true,
        faceData: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Data wajah karyawan berhasil didapatkan',
      employees,
    });
  } catch (error) {
    console.error('Error fetching employee face data:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mengambil data wajah karyawan' },
      { status: 500 }
    );
  }
} 