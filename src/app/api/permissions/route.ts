import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { PermissionStatus, PermissionType, Prisma } from '@prisma/client';

// Schema validasi untuk pembuatan permission
const permissionCreateSchema = z.object({
  employeeId: z.string().optional()
    .describe("ID karyawan jika izin dibuat oleh admin/manager untuk karyawan lain"),
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

// GET /api/permissions
export async function GET(request: NextRequest) {
  try {
    // Log HTTP Headers untuk debugging
    console.log('[API Permissions] Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Cek session untuk autentikasi
    const session = await getServerSession(authOptions);
    console.log('[API Permissions] Session data:', session ? {
      userId: session.user.id,
      name: session.user.name,
      role: session.user.role,
      employeeId: session.user.employeeId
    } : 'No session');
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil parameter query
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // Buat filter berdasarkan parameter
    const where: Record<string, unknown> = {};

    if (employeeId) {
      // Cari user id untuk employee id yang diberikan
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true }
      });

      if (employee) {
        where.userId = employee.userId;
      }
    }

    if (status) {
      where.status = status as PermissionStatus;
    }

    if (type) {
      where.type = type as PermissionType;
    }

    // Superadmin dan Admin dapat melihat semua izin
    // Manager dapat melihat izin dari departemennya
    // User hanya dapat melihat izinnya sendiri
    if (session.user.role === 'EMPLOYEE') {
      // User hanya dapat melihat izinnya sendiri
      where.userId = session.user.id;
    } else if (session.user.role === 'MANAGER' && session.user.employeeId) {
      // Dapatkan departemen manager
      const managerEmployee = await prisma.employee.findUnique({
        where: {
          id: session.user.employeeId
        },
        select: {
          departmentId: true
        }
      });

      if (managerEmployee?.departmentId) {
        // Cari semua employee di departemen yang sama
        const departmentEmployees = await prisma.employee.findMany({
          where: {
            departmentId: managerEmployee.departmentId
          },
          select: {
            userId: true
          }
        });
        
        // Filter permission berdasarkan userId yang ada di departemen
        where.userId = {
          in: departmentEmployees.map(emp => emp.userId)
        };
      }
    }

    // Ambil data izin dari database
    const permissions = await prisma.permission.findMany({
      where: where as Prisma.PermissionWhereInput,
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
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format data untuk respons
    const formattedPermissions = permissions.map(permission => ({
      id: permission.id,
      employee: {
        id: permission.user.employee?.id || '',
        user: {
          name: permission.user.name,
        },
        department: permission.user.employee?.department ? {
          name: permission.user.employee.department.name,
        } : null,
        position: permission.user.employee?.position ? {
          name: permission.user.employee.position.name,
        } : null,
      },
      type: permission.type,
      reason: permission.reason,
      startDate: permission.startDate.toISOString(),
      endDate: permission.endDate.toISOString(),
      duration: Math.ceil((permission.endDate.getTime() - permission.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      status: permission.status,
      createdAt: permission.createdAt.toISOString(),
      updatedAt: permission.updatedAt.toISOString(),
      otherDetails: permission.otherDetails,
      approvedBy: permission.approvedBy ? {
        user: {
          name: permission.approvedBy.name
        }
      } : null,
      approvedAt: permission.approvedAt ? permission.approvedAt.toISOString() : null,
      rejectionReason: permission.rejectionReason,
    }));

    return NextResponse.json(formattedPermissions);
  } catch (error) {
    console.error('Gagal mengambil data izin:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data izin' },
      { status: 500 }
    );
  }
}

// POST /api/permissions
export async function POST(request: NextRequest) {
  try {
    // Cek session untuk autentikasi
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse dan validasi data
    const data = await request.json();
    const validatedData = permissionCreateSchema.parse(data);
    
    // Tentukan userId berdasarkan employee yang dipilih atau user yang login
    let userId = session.user.id;
    
    // Jika employeeId diberikan (admin/manager membuat untuk karyawan lain)
    if (validatedData.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: validatedData.employeeId },
        select: { userId: true }
      });
      
      if (!employee) {
        return NextResponse.json(
          { error: 'Karyawan tidak ditemukan' },
          { status: 404 }
        );
      }
      
      userId = employee.userId;
    }

    // Buat izin baru
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    const permission = await prisma.permission.create({
      data: {
        type: validatedData.type as PermissionType,
        startDate,
        endDate,
        reason: validatedData.reason,
        otherDetails: validatedData.otherDetails || null,
        status: PermissionStatus.PENDING,
        userId: userId,
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
            name: true
          }
        }
      }
    });

    // Format data untuk respons
    const formattedPermission = {
      id: permission.id,
      employee: {
        id: permission.user.employee?.id || '',
        user: {
          name: permission.user.name,
        },
        department: permission.user.employee?.department ? {
          name: permission.user.employee.department.name,
        } : null,
        position: permission.user.employee?.position ? {
          name: permission.user.employee.position.name,
        } : null,
      },
      type: permission.type,
      reason: permission.reason,
      startDate: permission.startDate.toISOString(),
      endDate: permission.endDate.toISOString(),
      duration: Math.ceil((permission.endDate.getTime() - permission.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      status: permission.status,
      createdAt: permission.createdAt.toISOString(),
      updatedAt: permission.updatedAt.toISOString(),
      otherDetails: permission.otherDetails,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
    };

    return NextResponse.json(formattedPermission, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat izin:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat izin' },
      { status: 500 }
    );
  }
} 