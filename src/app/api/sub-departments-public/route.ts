import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseConnection, prisma } from '@/lib/db/prisma';

// GET - Mendapatkan semua data sub departemen
export async function GET(request: NextRequest) {
  try {
    console.log('[GET] /api/sub-departments-public - Request received');
    
    await ensureDatabaseConnection();
    
    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');
    
    // Build where clause
    const where: any = {};
    
    if (departmentId) {
      where.departmentId = departmentId;
    }
    
    // Ambil sub departemen
    const subDepartments = await prisma.subDepartment.findMany({
      where,
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(subDepartments);
  } catch (error) {
    console.error('Error fetching sub departments:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data sub departemen' },
      { status: 500 }
    );
  }
}
