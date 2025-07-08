import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureDatabaseConnection, prisma } from '@/lib/db';
import { PermissionStatus, PermissionType } from '@prisma/client';

// Schema validasi untuk permission karyawan
const employeePermissionSchema = z.object({
  employeeId: z.string().min(1, "ID karyawan harus diisi"),
  type: z.enum(['SICK', 'VACATION', 'PERSONAL', 'OTHER'], {
    errorMap: () => ({
      message: 'Tipe izin harus salah satu dari: SICK (Sakit), VACATION (Cuti), PERSONAL (Keperluan Pribadi), OTHER (Lainnya)'
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
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "Tanggal selesai harus sama dengan atau setelah tanggal mulai",
  path: ["endDate"]
});

// GET - Mendapatkan semua data izin dan cuti karyawan
export async function GET(request: NextRequest) {
  try {
    console.log('[GET] /api/employee-permissions - Mengambil data izin dan cuti karyawan');
    
    await ensureDatabaseConnection();
    
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    
    // Build filter
    const where: any = {};
    
    // Filter berdasarkan karyawan tertentu
    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true }
      });
      
      if (employee) {
        where.userId = employee.userId;
      }
    }
    
    // Filter berdasarkan status
    if (status && status !== 'ALL') {
      where.status = status as PermissionStatus;
    }
    
    // Filter berdasarkan tipe izin
    if (type && type !== 'ALL') {
      where.type = type as PermissionType;
    }
    
    // Filter berdasarkan pencarian nama karyawan
    if (search) {
      where.user = {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      };
    }
    
    // Ambil data izin dengan informasi karyawan lengkap
    const permissions = await prisma.permission.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employee: {
              select: {
                id: true,
                employeeId: true,
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                subDepartment: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                position: {
                  select: {
                    id: true,
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

    // Transform data untuk response yang mudah digunakan
    const transformedPermissions = permissions.map(permission => {
      // Hitung durasi izin
      const startDate = new Date(permission.startDate);
      const endDate = new Date(permission.endDate);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Map status ke bahasa Indonesia
      const statusMap = {
        'PENDING': 'Menunggu Persetujuan',
        'APPROVED': 'Disetujui',
        'REJECTED': 'Ditolak'
      };
      
      // Map tipe izin ke bahasa Indonesia
      const typeMap = {
        'SICK': 'Sakit',
        'VACATION': 'Cuti',
        'PERSONAL': 'Keperluan Pribadi',
        'OTHER': 'Lainnya'
      };
      
      return {
        id: permission.id,
        employee: {
          id: permission.user.employee?.id || '',
          employeeId: permission.user.employee?.employeeId || '',
          name: permission.user.name,
          email: permission.user.email,
          department: permission.user.employee?.department?.name || 'Tidak Ada Departemen',
          subDepartment: permission.user.employee?.subDepartment?.name || null,
          position: permission.user.employee?.position?.name || 'Tidak Ada Jabatan',
        },
        type: permission.type,
        typeLabel: typeMap[permission.type as keyof typeof typeMap] || permission.type,
        startDate: permission.startDate,
        endDate: permission.endDate,
        duration: duration,
        reason: permission.reason,
        otherDetails: permission.otherDetails,
        status: permission.status,
        statusLabel: statusMap[permission.status as keyof typeof statusMap] || permission.status,
        approvedBy: permission.approvedBy?.name || null,
        approvedAt: permission.approvedAt,
        rejectionReason: permission.rejectionReason,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedPermissions,
      total: transformedPermissions.length,
      message: 'Data izin dan cuti karyawan berhasil diambil'
    });
  } catch (error) {
    console.error('Error fetching employee permissions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan saat mengambil data izin dan cuti karyawan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Membuat pengajuan izin/cuti baru untuk karyawan
export async function POST(request: NextRequest) {
  try {
    console.log('[POST] /api/employee-permissions - Membuat pengajuan izin/cuti baru');
    
    await ensureDatabaseConnection();
    
    const body = await request.json();
    console.log('Data pengajuan izin/cuti:', body);
    
    // Validasi input
    const validatedData = employeePermissionSchema.parse(body);
    
    // Validasi karyawan exists dan ambil data lengkap
    const employee = await prisma.employee.findUnique({
      where: { id: validatedData.employeeId },
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
            name: true,
          },
        },
        position: {
          select: {
            id: true,
            name: true,
          },
        },
      }
    });
    
    if (!employee) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Karyawan tidak ditemukan. Pastikan ID karyawan benar.' 
        },
        { status: 404 }
      );
    }
    
    // Validasi tanggal tidak bentrok dengan izin yang sudah ada dan disetujui
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    
    const conflictingPermission = await prisma.permission.findFirst({
      where: {
        userId: employee.userId,
        status: 'APPROVED',
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } }
            ]
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } }
            ]
          }
        ]
      }
    });
    
    if (conflictingPermission) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Tanggal izin bentrok dengan izin yang sudah disetujui sebelumnya. Silakan pilih tanggal lain.',
          conflictDate: {
            start: conflictingPermission.startDate,
            end: conflictingPermission.endDate
          }
        },
        { status: 400 }
      );
    }
    
    // Hitung durasi izin
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Buat pengajuan izin/cuti baru
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
    
    console.log('Pengajuan izin/cuti berhasil dibuat:', newPermission.id);
    
    // Map untuk response
    const typeMap = {
      'SICK': 'Sakit',
      'VACATION': 'Cuti',
      'PERSONAL': 'Keperluan Pribadi',
      'OTHER': 'Lainnya'
    };
    
    return NextResponse.json({
      success: true,
      message: `Pengajuan ${typeMap[validatedData.type as keyof typeof typeMap]} berhasil diajukan untuk ${employee.user.name}`,
      data: {
        id: newPermission.id,
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.user.name,
          department: employee.department?.name || 'Tidak Ada Departemen',
          position: employee.position?.name || 'Tidak Ada Jabatan',
        },
        type: newPermission.type,
        typeLabel: typeMap[newPermission.type as keyof typeof typeMap],
        startDate: newPermission.startDate,
        endDate: newPermission.endDate,
        duration: duration,
        reason: newPermission.reason,
        otherDetails: newPermission.otherDetails,
        status: 'PENDING',
        statusLabel: 'Menunggu Persetujuan',
        createdAt: newPermission.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee permission:', error);
    
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
        error: 'Terjadi kesalahan saat membuat pengajuan izin/cuti',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
