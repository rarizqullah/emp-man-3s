import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseConnection, prisma } from '@/lib/db';

// GET - Mendapatkan semua data departemen
export async function GET(request: NextRequest) {
  try {
    console.log('[GET] /api/departments-public - Request received');
    
    await ensureDatabaseConnection();
    
    // Ambil semua departemen
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data departemen' },
      { status: 500 }
    );
  }
}
