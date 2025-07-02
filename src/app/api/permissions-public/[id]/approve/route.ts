import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseConnection, prisma } from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[PUT] /api/permissions-public/[id]/approve - Request received');
    
    await ensureDatabaseConnection();
    
    const { id } = await params;
    const body = await request.json();
    const { approverName } = body;
    
    // Cari permission yang akan disetujui
    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            employee: {
              select: {
                employeeId: true
              }
            }
          }
        }
      }
    });
    
    if (!permission) {
      return NextResponse.json(
        { error: 'Permission tidak ditemukan' },
        { status: 404 }
      );
    }
    
    if (permission.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Permission sudah diproses sebelumnya' },
        { status: 400 }
      );
    }
    
    // Update status permission menjadi APPROVED
    const updatedPermission = await prisma.permission.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        // Simpan nama approver sebagai string karena tidak ada relasi user
        rejectionReason: approverName ? `Disetujui oleh: ${approverName}` : 'Disetujui'
      },
      include: {
        user: {
          select: {
            name: true,
            employee: {
              include: {
                department: {
                  select: {
                    name: true,
                  },
                },
                position: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        }
      }
    });
    
    console.log(`Permission ${id} approved successfully`);
    
    return NextResponse.json({
      message: 'Permission berhasil disetujui',
      permission: {
        id: updatedPermission.id,
        status: updatedPermission.status,
        approvedAt: updatedPermission.approvedAt,
        employeeName: updatedPermission.user.name,
        employeeId: updatedPermission.user.employee?.employeeId || '',
        type: updatedPermission.type,
        startDate: updatedPermission.startDate,
        endDate: updatedPermission.endDate
      }
    });
  } catch (error) {
    console.error('Error approving permission:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menyetujui permission' },
      { status: 500 }
    );
  }
}
