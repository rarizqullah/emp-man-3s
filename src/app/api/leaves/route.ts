import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { PermissionStatus, PermissionType, Prisma } from '@prisma/client';
import { requireAuth, requireRole, ApiResponse } from '@/lib/auth/api-helpers';

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

// GET /api/leaves - Mendapatkan daftar izin/cuti
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // Log user data untuk debugging
    console.log('[API Leaves] User data:', {
      userId: user.id,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId
    });

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
    if (user.role === 'EMPLOYEE') {
      // User hanya dapat melihat izinnya sendiri
      where.userId = user.id;
    } else if (user.role === 'MANAGER' && user.employeeId) {
      // Dapatkan departemen manager
      const managerEmployee = await prisma.employee.findUnique({
        where: {
          id: user.employeeId
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

    return ApiResponse.success(formattedPermissions);
  } catch (error) {
    console.error('Gagal mengambil data izin:', error);
    return ApiResponse.error('Terjadi kesalahan saat mengambil data izin', 500);
  }
});

// POST /api/leaves - Membuat izin/cuti baru
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    // Parse dan validasi data
    const data = await request.json();
    const validatedData = permissionCreateSchema.parse(data);
    
    // Tentukan userId berdasarkan employee yang dipilih atau user yang login
    let userId = user.id;
    
    // Jika employeeId diberikan (admin/manager membuat untuk karyawan lain)
    if (validatedData.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: validatedData.employeeId },
        select: { userId: true }
      });
      
      if (!employee) {
        return ApiResponse.error('Karyawan tidak ditemukan', 404);
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

    return ApiResponse.success(formattedPermission, 201);
  } catch (error) {
    console.error('Gagal membuat izin:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.error('Validasi gagal', 400, error.errors);
    }
    
    return ApiResponse.error('Terjadi kesalahan saat membuat izin', 500);
  }
}); 