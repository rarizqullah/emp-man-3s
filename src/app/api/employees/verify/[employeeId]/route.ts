import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;

    if (!employeeId) {
      return NextResponse.json({
        success: false,
        message: 'Employee ID is required'
      }, { status: 400 });
    }

    // Find employee by employeeId
    const employee = await prisma.employee.findUnique({
      where: {
        employeeId: employeeId.toUpperCase()
      },
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
        shift: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({
        success: false,
        message: `Karyawan dengan ID ${employeeId} tidak ditemukan`
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Employee found',
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.user.name,
        email: employee.user.email,
        department: employee.department?.name || 'Tidak ada',
        shift: employee.shift?.name || 'Tidak ada'
      }
    });

  } catch (error) {
    console.error('Error verifying employee:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan saat memverifikasi karyawan'
    }, { status: 500 });
  }
} 