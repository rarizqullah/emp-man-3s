import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureDatabaseConnection, prisma } from '@/lib/db';

// Schema validasi untuk approval
const approvalSchema = z.object({
  approvedBy: z.string().min(1, "Nama penyetuju harus diisi"),
  notes: z.string().optional()
});

// PUT - Approve permission
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[PUT] /api/employee-permissions/${params.id}/approve - Request received`);
    
    await ensureDatabaseConnection();
    
    const body = await request.json();
    const validatedData = approvalSchema.parse(body);
    
    // Cek apakah permission ada dan masih pending
    const existingPermission = await prisma.permission.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            name: true,
            employee: {
              select: {
                id: true,
                employeeId: true,
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
    
    if (!existingPermission) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Pengajuan izin/cuti tidak ditemukan' 
        },
        { status: 404 }
      );
    }
    
    if (existingPermission.status !== 'PENDING') {
      return NextResponse.json(
        { 
          success: false,
          error: `Pengajuan izin/cuti sudah ${existingPermission.status === 'APPROVED' ? 'disetujui' : 'ditolak'} sebelumnya`,
          currentStatus: existingPermission.status
        },
        { status: 400 }
      );
    }
    
    // Cari atau buat user untuk approver (simplified approach)
    let approver = await prisma.user.findFirst({
      where: { name: validatedData.approvedBy }
    });
    
    if (!approver) {
      // Jika approver tidak ditemukan, buat record sementara untuk tracking
      approver = await prisma.user.create({
        data: {
          name: validatedData.approvedBy,
          email: `${validatedData.approvedBy.toLowerCase().replace(/\s+/g, '.')}@temp.local`,
          authId: `temp-${Date.now()}`,
          role: 'MANAGER'
        }
      });
    }
    
    // Update permission menjadi approved
    const updatedPermission = await prisma.permission.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedById: approver.id,
        approvedAt: new Date(),
        rejectionReason: null // Clear rejection reason if any
      },
      include: {
        user: {
          select: {
            name: true,
            employee: {
              select: {
                id: true,
                employeeId: true,
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
        },
        approvedBy: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`Permission ${params.id} approved successfully`);
    
    // Map tipe izin ke bahasa Indonesia
    const typeMap = {
      'SICK': 'Sakit',
      'VACATION': 'Cuti',
      'PERSONAL': 'Keperluan Pribadi',
      'OTHER': 'Lainnya'
    };
    
    // Hitung durasi
    const duration = Math.ceil((updatedPermission.endDate.getTime() - updatedPermission.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return NextResponse.json({
      success: true,
      message: `Pengajuan ${typeMap[updatedPermission.type as keyof typeof typeMap]} dari ${updatedPermission.user.name} berhasil disetujui`,
      data: {
        id: updatedPermission.id,
        employee: {
          id: updatedPermission.user.employee?.id || '',
          employeeId: updatedPermission.user.employee?.employeeId || '',
          name: updatedPermission.user.name,
          department: updatedPermission.user.employee?.department?.name || 'Tidak Ada Departemen',
          position: updatedPermission.user.employee?.position?.name || 'Tidak Ada Jabatan',
        },
        type: updatedPermission.type,
        typeLabel: typeMap[updatedPermission.type as keyof typeof typeMap],
        startDate: updatedPermission.startDate,
        endDate: updatedPermission.endDate,
        duration: duration,
        reason: updatedPermission.reason,
        status: 'APPROVED',
        statusLabel: 'Disetujui',
        approvedBy: updatedPermission.approvedBy?.name,
        approvedAt: updatedPermission.approvedAt,
        processedAt: updatedPermission.approvedAt
      }
    });
  } catch (error) {
    console.error('Error approving permission:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Data tidak valid',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan saat menyetujui pengajuan izin/cuti',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
