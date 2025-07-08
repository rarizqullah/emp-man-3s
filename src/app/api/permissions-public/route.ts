import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureDatabaseConnection, prisma } from '@/lib/db';
import { PermissionStatus, PermissionType, Prisma } from '@prisma/client';

// Schema validasi untuk pembuatan permission
const permissionCreateSchema = z.object({
  employeeId: z.string().min(1, "ID karyawan harus diisi"),
  type: z.enum(['SICK', 'VACATION', 'PERSONAL', 'OTHER'], {
    errorMap: () => ({
      message: 'Tipe izin harus salah satu dari: SICK, VACATION, PERSONAL, OTHER'
    })
  }),
  startDate: z.string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Tanggal mulai harus berformat tanggal yang valid"
    }),
  endDate: z.string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Tanggal selesai harus berformat tanggal yang valid"
    }),
  reason: z.string().min(5, {
    message: "Alasan minimal 5 karakter"
  }),
  otherDetails: z.string().optional(),
  attachment: z.string().optional(),
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "Tanggal selesai harus sama dengan atau setelah tanggal mulai",
  path: ["endDate"]
});

// GET - Mendapatkan semua data permissions
export async function GET(request: NextRequest) {
  try {
    console.log('[GET] /api/permissions-public - Request received');
    
    await ensureDatabaseConnection();
    
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    
    // Build where clause
    const where: any = {};
    
    if (employeeId) {
      // Cari employee berdasarkan ID untuk mendapatkan userId
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true }
      });
      
      if (employee) {
        where.userId = employee.userId;
      }
    }
    
    if (status && status !== 'ALL') {
      where.status = status as PermissionStatus;
    }
    
    if (type && type !== 'ALL') {
      where.type = type as PermissionType;
    }
    
    // Ambil data permissions dengan relasi employee
    const permissions = await prisma.permission.findMany({
      where: where as Prisma.PermissionWhereInput,
      include: {
        user: {
          select: {
            name: true,
            email: true,
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
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data untuk response
    const transformedPermissions = permissions.map(permission => {
      // Hitung durasi dari startDate dan endDate
      const startDate = new Date(permission.startDate);
      const endDate = new Date(permission.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        id: permission.id,
        employee: {
          id: permission.user.employee?.id || '',
          employeeId: permission.user.employee?.employeeId || '',
          user: {
            name: permission.user.name || 'Tidak Diketahui'
          },
          department: permission.user.employee?.department || null,
          position: permission.user.employee?.position || null
        },
        type: permission.type,
        startDate: permission.startDate,
        endDate: permission.endDate,
        duration: duration,
        reason: permission.reason,
        otherDetails: permission.otherDetails,
        status: permission.status,
        approvedBy: permission.approvedBy ? {
          user: { name: permission.approvedBy.name }
        } : null,
        approvedAt: permission.approvedAt,
        rejectionReason: permission.rejectionReason,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt
      };
    });

    return NextResponse.json(transformedPermissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data permissions' },
      { status: 500 }
    );
  }
}

// POST - Membuat permission baru
export async function POST(request: NextRequest) {
  try {
    console.log('[POST] /api/permissions-public - Request received');
    
    await ensureDatabaseConnection();
    
    const body = await request.json();
    console.log('Permission creation data:', body);
    
    // Validasi input
    const validatedData = permissionCreateSchema.parse(body);
    
    // Cari employee untuk mendapatkan userId
    const employee = await prisma.employee.findUnique({
      where: { id: validatedData.employeeId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Hitung durasi izin
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 untuk include hari terakhir
    
    // Buat permission baru
    const newPermission = await prisma.permission.create({
      data: {
        userId: employee.userId,
        type: validatedData.type,
        startDate: startDate,
        endDate: endDate,
        reason: validatedData.reason,
        otherDetails: validatedData.otherDetails || null,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
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
    
    console.log('Permission created successfully:', newPermission.id);
    
    // Hitung durasi untuk response
    const calculatedDuration = Math.ceil(Math.abs(newPermission.endDate.getTime() - newPermission.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return NextResponse.json({
      message: 'Izin berhasil diajukan',
      permission: {
        id: newPermission.id,
        employee: {
          id: newPermission.user.employee?.id || '',
          employeeId: newPermission.user.employee?.employeeId || '',
          user: {
            name: newPermission.user.name || 'Tidak Diketahui'
          },
          department: newPermission.user.employee?.department || null,
          position: newPermission.user.employee?.position || null
        },
        type: newPermission.type,
        startDate: newPermission.startDate,
        endDate: newPermission.endDate,
        duration: calculatedDuration,
        reason: newPermission.reason,
        otherDetails: newPermission.otherDetails,
        status: newPermission.status,
        createdAt: newPermission.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating permission:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
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
      { error: 'Terjadi kesalahan saat membuat permission' },
      { status: 500 }
    );
  }
}
