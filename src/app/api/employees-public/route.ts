import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseConnection, prisma } from '@/lib/db/prisma';

// GET - Mendapatkan semua data karyawan untuk dropdown/selection
export async function GET(request: NextRequest) {
  try {
    console.log('[GET] /api/employees-public - Request received');
    
    await ensureDatabaseConnection();
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    
    // Build where clause
    const where: any = {};
    
    // Note: deletedAt field tidak ada di schema saat ini
    // Kita akan mengambil semua data employee yang aktif
    
    if (search) {
      where.OR = [
        {
          employeeId: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ];
    }
    
    if (department) {
      where.departmentId = department;
    }
    
    // Ambil data karyawan
    const employees = await prisma.employee.findMany({
      where,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        subDepartment: {
          select: {
            id: true,
            name: true
          }
        },
        position: {
          select: {
            id: true,
            name: true
          }
        },
        shift: {
          select: {
            id: true,
            name: true,
            shiftType: true
          }
        }
      },
      orderBy: [
        { user: { name: 'asc' } },
        { employeeId: 'asc' }
      ]
    });

    // Transform data untuk response
    const transformedEmployees = employees.map(employee => ({
      id: employee.id,
      employeeId: employee.employeeId,
      userId: employee.userId,
      name: employee.user?.name || 'Tidak Diketahui',
      email: employee.user?.email || '',
      department: employee.department ? {
        id: employee.department.id,
        name: employee.department.name
      } : null,
      subDepartment: employee.subDepartment ? {
        id: employee.subDepartment.id,
        name: employee.subDepartment.name
      } : null,
      position: employee.position ? {
        id: employee.position.id,
        name: employee.position.name
      } : null,
      shift: employee.shift ? {
        id: employee.shift.id,
        name: employee.shift.name,
        type: employee.shift.shiftType
      } : null,
      contractType: employee.contractType,
      contractStartDate: employee.contractStartDate,
      contractEndDate: employee.contractEndDate,
      warningStatus: employee.warningStatus,
      gender: employee.gender,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt
    }));

    return NextResponse.json({
      employees: transformedEmployees,
      total: transformedEmployees.length,
      limit: limit
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data karyawan' },
      { status: 500 }
    );
  }
}
