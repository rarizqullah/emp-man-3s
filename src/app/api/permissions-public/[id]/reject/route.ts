import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseConnection, prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[PUT] /api/permissions-public/[id]/reject - Request received');
    
    await ensureDatabaseConnection();
    
    const { id } = await params;
    const body = await request.json();
    const { rejectionReason, rejectorName } = body;
    
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Alasan penolakan minimal 5 karakter' },
        { status: 400 }
      );
    }
    
    // Cari permission yang akan ditolak
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
    
    // Buat rejection reason dengan info rejector
    const fullRejectionReason = rejectorName 
      ? `Ditolak oleh ${rejectorName}: ${rejectionReason}`
      : rejectionReason;
    
    // Update status permission menjadi REJECTED
    const updatedPermission = await prisma.permission.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: fullRejectionReason,
        approvedAt: new Date() // Simpan waktu proses
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
    
    console.log(`Permission ${id} rejected successfully`);
    
    return NextResponse.json({
      message: 'Permission berhasil ditolak',
      permission: {
        id: updatedPermission.id,
        status: updatedPermission.status,
        rejectionReason: updatedPermission.rejectionReason,
        processedAt: updatedPermission.approvedAt,
        employeeName: updatedPermission.user.name,
        employeeId: updatedPermission.user.employee?.employeeId || '',
        type: updatedPermission.type,
        startDate: updatedPermission.startDate,
        endDate: updatedPermission.endDate
      }
    });
  } catch (error) {
    console.error('Error rejecting permission:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menolak permission' },
      { status: 500 }
    );
  }
}
