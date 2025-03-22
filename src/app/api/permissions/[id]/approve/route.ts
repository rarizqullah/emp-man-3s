import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PermissionStatus } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Cek session untuk autentikasi
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hanya admin dan manager yang dapat menyetujui izin
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki izin untuk menyetujui permintaan izin' },
        { status: 403 }
      );
    }

    const { id } = params;

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

    // Jika manager, pastikan hanya dapat menyetujui izin dari departemen yang sama
    if (session.user.role === 'MANAGER' && session.user.employeeId) {
      const managerEmployee = await prisma.employee.findUnique({
        where: { id: session.user.employeeId },
        select: { departmentId: true }
      });

      if (managerEmployee && existingPermission.user.employee?.departmentId) {
        if (managerEmployee.departmentId !== existingPermission.user.employee.departmentId) {
          return NextResponse.json(
            { error: 'Anda hanya dapat menyetujui izin dari departemen Anda' },
            { status: 403 }
          );
        }
      }
    }

    // Update status izin menjadi APPROVED
    const updatedPermission = await prisma.permission.update({
      where: { id },
      data: {
        status: PermissionStatus.APPROVED,
        approvedById: session.user.id,
        approvedAt: new Date(),
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
      message: 'Izin berhasil disetujui',
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
        otherDetails: updatedPermission.otherDetails,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Gagal menyetujui izin:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menyetujui izin' },
      { status: 500 }
    );
  }
} 