import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { PermissionStatus } from "@prisma/client";
import { z } from "zod";

// Schema validasi untuk penolakan izin
const rejectSchema = z.object({
  rejectionReason: z.string({
    required_error: "Alasan penolakan diperlukan"
  }).min(3, {
    message: "Alasan penolakan minimal 3 karakter"
  })
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Cek session untuk autentikasi menggunakan Supabase
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil data user dari database berdasarkan authId
    const user = await prisma.user.findUnique({
      where: {
        authId: session.user.id
      },
      include: {
        employee: {
          select: {
            id: true,
            departmentId: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hanya admin dan manager yang dapat menolak izin
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki izin untuk menolak permintaan izin' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Validasi data request
    const requestData = await request.json();
    const validatedData = rejectSchema.parse(requestData);

    // Periksa apakah izin ada
    const existingPermission = await prisma.permission.findUnique({
      where: { id },
      select: {
        status: true,
        userId: true,
        user: {
          select: {
            employee: {
              select: {
                departmentId: true
              }
            }
          }
        }
      }
    });

    if (!existingPermission) {
      return NextResponse.json(
        { error: 'Izin tidak ditemukan' },
        { status: 404 }
      );
    }

    // Periksa apakah izin sudah disetujui atau ditolak
    if (existingPermission.status !== PermissionStatus.PENDING) {
      return NextResponse.json(
        { 
          error: 'Izin ini sudah diproses sebelumnya',
          status: existingPermission.status 
        },
        { status: 400 }
      );
    }

    // Jika manager, pastikan hanya dapat menolak izin dari departemen yang sama
    if (user.role === 'MANAGER' && user.employee) {
      if (user.employee.departmentId && existingPermission.user.employee?.departmentId) {
        if (user.employee.departmentId !== existingPermission.user.employee.departmentId) {
          return NextResponse.json(
            { error: 'Anda hanya dapat menolak izin dari departemen Anda' },
            { status: 403 }
          );
        }
      }
    }

    // Update status izin menjadi REJECTED
    const updatedPermission = await prisma.permission.update({
      where: { id },
      data: {
        status: PermissionStatus.REJECTED,
        approvedById: user.id, // Menyimpan siapa yang menolak
        approvedAt: new Date(),        // Menyimpan kapan ditolak
        rejectionReason: validatedData.rejectionReason
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
        },
        approvedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    // Format data untuk respons
    const responseData = {
      message: 'Izin berhasil ditolak',
      data: {
        id: updatedPermission.id,
        employee: {
          id: updatedPermission.user.employee?.id || '',
          user: {
            name: updatedPermission.user.name,
          },
          department: updatedPermission.user.employee?.department
            ? {
                name: updatedPermission.user.employee.department.name,
              }
            : null,
        },
        type: updatedPermission.type,
        reason: updatedPermission.reason,
        startDate: updatedPermission.startDate.toISOString(),
        endDate: updatedPermission.endDate.toISOString(),
        duration: Math.ceil(
          (updatedPermission.endDate.getTime() - updatedPermission.startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1,
        status: updatedPermission.status,
        approvedBy: {
          user: {
            name: updatedPermission.approvedBy?.name || '',
          },
        },
        approvedAt: updatedPermission.approvedAt?.toISOString(),
        rejectionReason: updatedPermission.rejectionReason,
        otherDetails: updatedPermission.otherDetails,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Gagal menolak izin:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menolak izin' },
      { status: 500 }
    );
  }
}