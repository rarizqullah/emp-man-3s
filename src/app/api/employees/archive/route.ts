import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    // Remove auth check temporarily for testing - same as main employees API
    // TODO: Implement proper auth later if needed
    
    // Fetch archived employees with relations
    const archivedEmployees = await prisma.employee.findMany({
      where: {
        deletedAt: {
          not: null
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          }
        },
        department: {
          select: {
            name: true
          }
        },
        subDepartment: {
          select: {
            name: true
          }
        },
        position: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        deletedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: archivedEmployees
    });
  } catch (error) {
    console.error('Error fetching archived employees:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Gagal mengambil data arsip karyawan' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Remove auth check temporarily for testing - same as main employees API
    // TODO: Implement proper auth later if needed

    const { employeeIds, reason } = await request.json();

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID karyawan harus berupa array dan tidak boleh kosong' 
        },
        { status: 400 }
      );
    }

    // Soft delete employees
    const result = await prisma.employee.updateMany({
      where: {
        id: {
          in: employeeIds
        }
      },
      data: {
        deletedAt: new Date(),
        deletedBy: 'System', // TODO: Get actual user when auth is implemented
        deletionReason: reason || 'Tidak ada alasan yang diberikan'
      }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} karyawan berhasil diarsipkan`,
      count: result.count
    });
  } catch (error) {
    console.error('Error archiving employees:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Gagal mengarsipkan karyawan' 
      },
      { status: 500 }
    );
  }
}
